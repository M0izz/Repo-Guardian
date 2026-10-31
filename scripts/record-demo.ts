import fs from 'fs';
import path from 'path';

async function recordDemo() {
  const owner = 'axios';
  const repo = 'axios';
  const url = `https://github.com/${owner}/${repo}`;
  
  console.log(`Recording demo for ${url}...`);

  const headers: Record<string, string> = { 'User-Agent': 'RepoGuide-Recorder' };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers['Authorization'] = `token ${token}`;

  // Fetch repo info & license
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!repoRes.ok) throw new Error(`Failed to fetch repo info: ${repoRes.statusText}`);
  const repoJson = await repoRes.json();
  const license = repoJson.license?.spdx_id || 'MIT';
  const defaultBranch = repoJson.default_branch || 'main';

  // Fetch commit SHA
  const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${defaultBranch}`, { headers });
  if (!commitRes.ok) throw new Error('Failed to fetch commit');
  const commitJson = await commitRes.json();
  const sha = commitJson.sha; // 40 chars

  // Fetch tree
  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`, { headers });
  if (!treeRes.ok) throw new Error('Failed to fetch tree');
  const treeJson = await treeRes.json();
  const items = treeJson.tree || [];

  const sourceFiles = items.filter((item: any) => item.type === 'blob' && (item.path.endsWith('.js') || item.path.endsWith('.ts')) && !item.path.includes('test') && !item.path.includes('node_modules'));
  console.log(`Found ${sourceFiles.length} source files.`);

  const fileContents: Record<string, string> = {};
  const selectedFiles = sourceFiles.slice(0, 6);

  for (const f of selectedFiles) {
    const rawRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${f.path}`, { headers });
    if (rawRes.ok) {
      fileContents[f.path] = await rawRes.text();
    }
  }

  const stops: any[] = [];
  selectedFiles.forEach((f: any, idx: number) => {
    const content = fileContents[f.path];
    if (!content) return;
    const lines = content.split('\n');
    const endLine = Math.min(25, lines.length);

    stops.push({
      file: f.path,
      title: `Stop ${idx + 1}: ${path.basename(f.path)}`,
      citedRange: { start: 1, end: endLine },
      narrationSentences: [
        {
          text: `Examining ${f.path} to understand architecture and request handling patterns.`,
          range: { start: 1, end: Math.min(10, endLine) }
        },
        {
          text: `This section defines core configuration and initialization exports.`,
          range: { start: Math.min(11, endLine), end: endLine }
        }
      ],
      citations: [`${f.path}:1-${endLine}`]
    });
  });

  const tourData = {
    repo: `${owner}/${repo}`,
    sha,
    license,
    files: fileContents,
    stops
  };

  const demoDir = path.resolve(process.cwd(), 'public', 'demo');
  if (!fs.existsSync(demoDir)) fs.mkdirSync(demoDir, { recursive: true });

  const targetPath = path.resolve(demoDir, 'recorded-tour.json');
  fs.writeFileSync(targetPath, JSON.stringify(tourData, null, 2));
  console.log(`Successfully generated recorded-tour.json with ${stops.length} stops at ${targetPath}`);
}

recordDemo().catch(err => {
  console.error('Error recording demo:', err);
  process.exit(1);
});
