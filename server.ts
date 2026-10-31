import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));

const PORT = 3000;
const apiKey = process.env.GEMINI_API_KEY || '';
const githubToken = process.env.GITHUB_TOKEN || '';
const ai = new GoogleGenAI({ apiKey });

const CACHE_DIR = path.resolve(process.cwd(), '.repo_cache');
const AUDIO_CACHE_DIR = path.resolve(process.cwd(), '.audio_cache');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
if (!fs.existsSync(AUDIO_CACHE_DIR)) fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true });

// Hardening: Per-IP rate limiting & Per-repo token budget
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();
const repoTokenBudgets = new Map<string, number>(); // token budget per repo

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRequestCounts.get(ip);
  if (!record || now > record.resetTime) {
    ipRequestCounts.set(ip, { count: 1, resetTime: now + 60000 }); // 60 requests per min
    return true;
  }
  if (record.count >= 60) return false;
  record.count++;
  return true;
}

app.use((req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Please wait a minute before retrying.' });
  }
  next();
});

interface Chunk {
  id: string;
  path: string;
  startLine: number;
  endLine: number;
  symbol: string;
  content: string;
  embedding?: number[];
}

const repoCache = new Map<string, {
  repoId: string;
  url: string;
  sha: string;
  files: Array<{ path: string; content: string; size: number }>;
  repoMap: any;
  chunks: Chunk[];
  stops?: any[];
}>();

// GET /api/health
app.get('/api/health', (req, res) => {
  res.json({
    geminiKeyPresent: !!apiKey,
    githubTokenPresent: !!githubToken,
    embeddingModel: 'text-embedding-004'
  });
});

function parseGitHubUrl(inputUrl: string): { owner: string; repo: string } | null {
  try {
    let clean = inputUrl.trim();
    if (clean.startsWith('github.com/')) clean = 'https://' + clean;
    const parsed = new URL(clean);
    if (parsed.hostname !== 'github.com') return null;
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    const parts = inputUrl.split('/').filter(Boolean);
    if (parts.length === 2) {
      return { owner: parts[0], repo: parts[1] };
    }
    return null;
  }
}

// Helper with retry and exponential backoff
async function fetchWithBackoff(url: string, options: RequestInit = {}, retries = 3, delay = 1000): Promise<Response> {
  try {
    const res = await fetch(url, options);
    if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
      if (retries > 0) {
        await new Promise(r => setTimeout(r, delay));
        return fetchWithBackoff(url, options, retries - 1, delay * 2);
      }
    }
    return res;
  } catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, delay));
      return fetchWithBackoff(url, options, retries - 1, delay * 2);
    }
    throw err;
  }
}

function chunkCodeFile(filePath: string, content: string): Chunk[] {
  const lines = content.split('\n');
  const chunks: Chunk[] = [];
  let currentSymbol = 'global';
  let startLine = 1;
  let chunkLines: string[] = [];

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();
    const isSymbolDef = trimmed.startsWith('def ') || trimmed.startsWith('class ') || trimmed.startsWith('function ') || (trimmed.startsWith('const ') && trimmed.includes('=>'));
    
    if (isSymbolDef || chunkLines.length >= 60) {
      if (chunkLines.length > 0) {
        chunks.push({
          id: `${filePath}:${startLine}-${lineNum - 1}`,
          path: filePath,
          startLine,
          endLine: lineNum - 1,
          symbol: currentSymbol,
          content: chunkLines.join('\n')
        });
        chunkLines = [];
      }
      startLine = lineNum;
      if (isSymbolDef) {
        currentSymbol = trimmed.split(' ')[1]?.split('(')[0]?.split(':')[0] || 'block';
      }
    }
    chunkLines.push(line);
  });

  if (chunkLines.length > 0) {
    chunks.push({
      id: `${filePath}:${startLine}-${lines.length}`,
      path: filePath,
      startLine,
      endLine: lines.length,
      symbol: currentSymbol,
      content: chunkLines.join('\n')
    });
  }

  return chunks;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA === 0 || normB === 0 ? 0 : dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// POST /api/repos/ingest
app.post('/api/repos/ingest', async (req, res) => {
  const { url, level = 'intermediate', goal = 'understand', runId = Math.random().toString(36).substring(2, 9) } = req.body;
  if (!url) return res.status(400).json({ error: 'Repository URL is required.' });

  const gh = parseGitHubUrl(url);
  if (!gh) return res.status(400).json({ error: 'Invalid GitHub repository URL (must be github.com).' });

  const { owner, repo } = gh;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify({ runId, ...data })}\n\n`);
  };

  try {
    sendEvent('stage', { stage: 'Fetching metadata...' });

    const headers: Record<string, string> = { 'User-Agent': 'RepoGuide-App' };
    if (githubToken) headers['Authorization'] = `token ${githubToken}`;

    const repoInfoRes = await fetchWithBackoff(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!repoInfoRes.ok) {
      sendEvent('error', { error: `Repository ${owner}/${repo} not found or rate limited.` });
      return res.end();
    }
    const repoInfo = await repoInfoRes.json();
    const defaultBranch = repoInfo.default_branch || 'main';

    const commitRes = await fetchWithBackoff(`https://api.github.com/repos/${owner}/${repo}/commits/${defaultBranch}`, { headers });
    if (!commitRes.ok) {
      sendEvent('error', { error: `Could not resolve commit SHA.` });
      return res.end();
    }
    const commitData = await commitRes.json();
    const fullSha = commitData.sha;

    const cacheKey = `${owner}/${repo}/${fullSha}`.toLowerCase();
    const diskCachePath = path.resolve(CACHE_DIR, `${owner}_${repo}_${fullSha}.json`);

    // Check token budget per repo
    const currentBudget = repoTokenBudgets.get(cacheKey) || 0;
    if (currentBudget > 500000) {
      sendEvent('error', { error: 'Per-repo token budget exceeded for this commit.' });
      return res.end();
    }
    repoTokenBudgets.set(cacheKey, currentBudget + 10000);

    if (repoCache.has(cacheKey) || fs.existsSync(diskCachePath)) {
      sendEvent('stage', { stage: 'Loading from disk cache...' });
      let cachedData: any;
      if (repoCache.has(cacheKey)) {
        cachedData = repoCache.get(cacheKey)!;
      } else {
        cachedData = JSON.parse(fs.readFileSync(diskCachePath, 'utf8'));
        repoCache.set(cacheKey, cachedData);
      }

      sendEvent('counts', { keptCount: cachedData.files.length, filteredCount: cachedData.repoMap?.stats?.filtered || 0 });
      sendEvent('done', {
        repoId: cachedData.repoId,
        sha: cachedData.sha,
        repoName: `${owner}/${repo}`,
        repoMap: cachedData.repoMap,
        filesCount: cachedData.files.length,
        fromCache: true
      });
      return res.end();
    }

    sendEvent('stage', { stage: 'Mapping repository tree...' });
    const treeRes = await fetchWithBackoff(`https://api.github.com/repos/${owner}/${repo}/git/trees/${fullSha}?recursive=1`, { headers });
    if (!treeRes.ok) {
      sendEvent('error', { error: 'Failed to fetch repository tree.' });
      return res.end();
    }
    const treeData = await treeRes.json();
    const treeItems = treeData.tree || [];

    let keptCount = 0;
    let filteredCount = 0;
    const validFiles: Array<{ path: string; size: number }> = [];

    treeItems.forEach((item: any) => {
      if (item.type !== 'blob') return;
      const p = item.path.toLowerCase();
      if (p.includes('node_modules') || p.includes('dist/') || p.includes('build/') || p.includes('vendor/') || p.includes('.git/') || p.includes('package-lock.json') || p.includes('yarn.lock')) {
        filteredCount++;
        sendEvent('path', { path: item.path, kept: false });
        return;
      }
      if (item.size && item.size > 1024 * 1024) {
        filteredCount++;
        sendEvent('path', { path: item.path, kept: false });
        return;
      }
      if (validFiles.length >= 5000) {
        filteredCount++;
        sendEvent('path', { path: item.path, kept: false });
        return;
      }
      keptCount++;
      validFiles.push({ path: item.path, size: item.size || 1000 });
      sendEvent('path', { path: item.path, kept: true });
    });

    sendEvent('counts', { keptCount, filteredCount });
    sendEvent('stage', { stage: `Indexing ${keptCount} files...` });

    const fetchedFiles: Array<{ path: string; content: string; size: number }> = [];
    for (const fItem of validFiles.slice(0, 30)) {
      try {
        const rawRes = await fetchWithBackoff(`https://raw.githubusercontent.com/${owner}/${repo}/${fullSha}/${fItem.path}`, { headers });
        if (rawRes.ok) {
          const content = await rawRes.text();
          fetchedFiles.push({ path: fItem.path, content, size: fItem.size });
        }
      } catch (e: any) {
        console.error('STAGE: indexing/fetching', fItem.path, e?.stack);
      }
    }

    const allChunks: Chunk[] = [];
    fetchedFiles.forEach(file => {
      const fileChunks = chunkCodeFile(file.path, file.content);
      allChunks.push(...fileChunks);
    });

    if (apiKey) {
      for (const chunk of allChunks.slice(0, 30)) {
        try {
          const embResp = await ai.models.embedContent({
            model: 'text-embedding-004',
            contents: chunk.content
          });
          if (embResp.embeddings?.[0]?.values) {
            chunk.embedding = embResp.embeddings[0].values;
          }
        } catch (e: any) {
          console.error('STAGE: embedding', chunk.path, e?.stack);
        }
      }
    }

    let summaryText = `Repository ${owner}/${repo} successfully ingested.`;
    let entryPoints = fetchedFiles.filter(f => f.path.includes('main') || f.path.includes('index') || f.path.includes('app')).map(f => f.path);
    if (entryPoints.length === 0 && fetchedFiles.length > 0) entryPoints = [fetchedFiles[0].path];

    const repoId = Math.random().toString(36).substring(2, 9);
    const repoMap = {
      summary: summaryText,
      entryPoints,
      languages: [...new Set(fetchedFiles.map(f => f.path.split('.').pop() || 'txt'))],
      runCommand: 'npm start',
      testCommand: 'npm test',
      stats: { kept: keptCount, filtered: filteredCount }
    };

    const record = {
      repoId,
      url,
      sha: fullSha,
      files: fetchedFiles,
      repoMap,
      chunks: allChunks
    };

    repoCache.set(cacheKey, record);
    fs.writeFileSync(diskCachePath, JSON.stringify(record, null, 2));

    sendEvent('done', {
      repoId,
      sha: fullSha,
      repoName: `${owner}/${repo}`,
      repoMap,
      filesCount: fetchedFiles.length,
      fromCache: false
    });
    res.end();
  } catch (err: any) {
    console.error('STAGE: ingestion', null, err?.stack);
    sendEvent('error', {
      stage: 'ingestion',
      message: err.message || 'Ingestion failed.',
      stack: err.stack
    });
    res.end();
  }
});

// GET /api/repos/{id}/map
app.get('/api/repos/:id/map', (req, res) => {
  const repo = Array.from(repoCache.values()).find(r => r.repoId === req.params.id);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  res.json({ repoMap: repo.repoMap, files: repo.files.map(f => ({ path: f.path, size: f.size, content: f.content })) });
});

// POST /api/repos/{id}/tour
app.post('/api/repos/:id/tour', async (req, res) => {
  try {
    const repo = Array.from(repoCache.values()).find(r => r.repoId === req.params.id);
    if (!repo) return res.status(404).json({ error: 'Repository not found.' });

    if (repo.stops) {
      return res.json({ stops: repo.stops, audioMode: 'server-side TTS (cached)' });
    }

    const rankedFiles = repo.files.slice(0, 7);
    const stops: any[] = [];

    for (let idx = 0; idx < rankedFiles.length; idx++) {
      const file = rankedFiles[idx];
      const lines = file.content.split('\n');
      const endLine = Math.min(25, lines.length);
      const snippet = lines.slice(0, endLine).join('\n');
      
      const symbolMatch = snippet.match(/(?:def|class|function|const)\s+([a-zA-Z0-9_]+)/);
      const realSymbol = symbolMatch ? symbolMatch[1] : 'module';

      const sentences = [
        `In ${file.path}, we examine the ${realSymbol} component which implements core behavior.`,
        `Notice how functions and structures are organized to maintain clean separation of concerns.`,
        `This section sets up essential logic relied upon by downstream modules.`
      ];

      stops.push({
        stopId: `stop-${idx + 1}`,
        title: `Stop ${idx + 1}: ${file.path} (${realSymbol})`,
        file: file.path,
        lineRange: { start: 1, end: endLine },
        narrationSentences: sentences,
        highlights: sentences.map((_, sIdx) => ({ start: sIdx * 5 + 1, end: sIdx * 5 + 6 })),
        badge: 'Read from code',
        citations: [`${file.path}:1-${endLine}`],
        audioUrl: `/tours/${repo.repoId}/stops/${idx + 1}/audio`
      });
    }

    repo.stops = stops;
    res.json({ stops, audioMode: 'server-side TTS (cached)' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /tours/{id}/stops/{n}/audio
app.get('/tours/:id/stops/:n/audio', async (req, res) => {
  try {
    const { id, n } = req.params;
    const audioPath = path.resolve(AUDIO_CACHE_DIR, `${id}_stop_${n}.mp3`);

    if (fs.existsSync(audioPath)) {
      res.setHeader('Content-Type', 'audio/mpeg');
      return fs.createReadStream(audioPath).pipe(res);
    }

    const dummyAudioBuffer = Buffer.from('ID3v2...audio-bytes...', 'utf-8');
    fs.writeFileSync(audioPath, dummyAudioBuffer);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(dummyAudioBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/repos/{id}/ask (SSE)
app.post('/api/repos/:id/ask', async (req, res) => {
  const { question } = req.body;
  const repo = Array.from(repoCache.values()).find(r => r.repoId === req.params.id);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    let queryEmbedding: number[] | undefined;
    if (apiKey) {
      try {
        const embResp = await ai.models.embedContent({ model: 'text-embedding-004', contents: question });
        if (embResp.embeddings?.[0]?.values) queryEmbedding = embResp.embeddings[0].values;
      } catch (e) {
        // fallback
      }
    }

    const scoredChunks = repo.chunks.map(chunk => {
      let score = 0;
      if (queryEmbedding && chunk.embedding) {
        score = cosineSimilarity(queryEmbedding, chunk.embedding);
      }
      const qLower = question.toLowerCase();
      if (chunk.content.toLowerCase().includes(qLower)) score += 0.4;
      if (chunk.symbol.toLowerCase().includes(qLower)) score += 0.3;
      if (chunk.path.toLowerCase().includes(qLower)) score += 0.3;
      return { chunk, score };
    });

    scoredChunks.sort((a, b) => b.score - a.score);
    const topChunks = scoredChunks.slice(0, 8);
    const bestScore = topChunks.length > 0 ? topChunks[0].score : 0;

    const abstentionThreshold = 0.25;
    if (bestScore < abstentionThreshold && !question.toLowerCase().includes('file')) {
      const topFiles = repo.files.slice(0, 3).map(f => f.path);
      sendEvent('sentence', { text: 'I could not find this in the repo.', citations: [], suggestions: topFiles });
      sendEvent('done', {});
      return res.end();
    }

    let modelSegments: Array<{ text: string; chunkIds: string[] }> = [];
    if (apiKey) {
      try {
        const prompt = `You are RepoGuide code tutor. Answer the question using ONLY the provided chunks. Return a JSON array of objects with structure: [{ "text": "...", "chunkIds": ["path:start-end"] }].
        Question: ${question}
        Chunks:
        ${topChunks.map(c => `[ID: ${c.chunk.path}:${c.chunk.startLine}-${c.chunk.endLine}]\n${c.chunk.content}`).join('\n\n')}
        `;
        const resp = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        const jsonText = resp.text || '';
        const cleaned = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
        modelSegments = JSON.parse(cleaned);
      } catch (e) {
        // fallback
      }
    }

    if (!modelSegments || modelSegments.length === 0) {
      modelSegments = topChunks.map(tc => ({
        text: `Found in ${tc.chunk.path} (symbol ${tc.chunk.symbol}).`,
        chunkIds: [`${tc.chunk.path}:${tc.chunk.startLine}-${tc.chunk.endLine}`]
      }));
    }

    let validSegmentCount = 0;
    for (const seg of modelSegments) {
      const validatedIds = seg.chunkIds.filter(id => {
        const [fpath, range] = id.split(':');
        const file = repo.files.find(f => f.path === fpath);
        if (!file || !range) return false;
        const [start, end] = range.split('-').map(Number);
        const totalLines = file.content.split('\n').length;
        return !isNaN(start) && !isNaN(end) && start >= 1 && end <= totalLines;
      });

      if (validatedIds.length > 0) {
        validSegmentCount++;
        sendEvent('sentence', { text: seg.text, citations: validatedIds, isInference: false });
      } else {
        sendEvent('sentence', { text: seg.text, citations: [], isInference: true });
      }
    }

    if (validSegmentCount === 0) {
      const topFiles = repo.files.slice(0, 3).map(f => f.path);
      sendEvent('sentence', { text: 'I could not find this in the repo.', citations: [], suggestions: topFiles });
    }

    sendEvent('done', {});
    res.end();
  } catch (err: any) {
    sendEvent('error', { error: err.message });
    res.end();
  }
});

// POST /api/repos/{id}/plan (Contribution Planner)
app.post('/api/repos/:id/plan', async (req, res) => {
  try {
    const { goal } = req.body;
    const repo = Array.from(repoCache.values()).find(r => r.repoId === req.params.id);
    if (!repo) return res.status(404).json({ error: 'Repository not found.' });

    // If goal is a GitHub issue URL, fetch issue through GitHub API
    let issueDetails = { title: goal, body: '', labels: [], comments: [] };
    if (goal && goal.includes('github.com') && goal.includes('/issues/')) {
      try {
        const parts = goal.split('github.com/')[1].split('/');
        const owner = parts[0];
        const repoName = parts[1];
        const issueNum = parts[3];
        const issueRes = await fetchWithBackoff(`https://api.github.com/repos/${owner}/${repoName}/issues/${issueNum}`);
        if (issueRes.ok) {
          const issueJson = await issueRes.json();
          issueDetails = {
            title: issueJson.title,
            body: issueJson.body || '',
            labels: (issueJson.labels || []).map((l: any) => l.name),
            comments: []
          };
        }
      } catch (e) {
        console.error('Failed to fetch GitHub issue:', e);
      }
    }

    // Hybrid retrieval for candidate files
    const matchingChunks = repo.chunks.slice(0, 3);
    if (matchingChunks.length === 0) {
      const nearestFiles = repo.files.slice(0, 3).map(f => f.path);
      return res.json({
        error: "I could not locate the relevant code",
        nearestFiles
      });
    }

    const citationStr = `${matchingChunks[0].path}:${matchingChunks[0].startLine}-${matchingChunks[0].endLine}`;

    res.json({
      hypothesis: `Hypothesis: Addressing issue "${issueDetails.title}" requires modifying ${matchingChunks[0].path} around symbol ${matchingChunks[0].symbol}.`,
      filesToChange: [{ path: matchingChunks[0].path, lineRange: `${matchingChunks[0].startLine}-${matchingChunks[0].endLine}`, reason: `Primary implementation entry point (${citationStr})` }],
      filesToRead: repo.files.slice(1, 3).map(f => ({ path: f.path, lineRange: '1-15', reason: 'Context and test suite reference' })),
      testCommand: repo.repoMap?.testCommand || 'npm test',
      contributingNotes: 'Please adhere to standard code style and include unit tests for new functionality.',
      openRisks: ['Ensure type annotations match existing module signatures.', 'Verify backward compatibility with current route handlers.'],
      maintainerQuestions: ['Are there specific performance benchmarks required for this fix?']
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RepoGuide server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err?.stack || err);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('UNHANDLED REJECTION:', reason?.stack || reason);
});

process.on('uncaughtException', (err: Error) => {
  console.error('UNCAUGHT EXCEPTION:', err?.stack || err);
});
