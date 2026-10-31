export type ExperienceLevel = 'beginner' | 'intermediate' | 'expert';
export type UserGoal = 'understand' | 'contribute' | 'review';

export interface RepoFile {
  path: string;
  size: number;
}

export interface RepoMap {
  summary: string;
  entryPoints: string[];
  languages: string[];
  runCommand: string;
  testCommand: string;
}

export interface TourStop {
  stopId: string;
  title: string;
  file: string;
  lineRange: { start: number; end: number };
  narrationSentences: string[];
  highlights: Array<{ start: number; end: number }>;
  badge: string;
  citations: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  citations?: string[];
}

export interface ContributionPlan {
  hypothesis: string;
  filesToChange: Array<{ path: string; lineRange: string; reason: string }>;
  filesToRead: Array<{ path: string; lineRange: string; reason: string }>;
  testCommand: string;
  openRisks: string[];
  maintainerQuestions?: string[];
}
