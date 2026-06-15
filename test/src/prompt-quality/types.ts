export interface PromptCriteria {
  requiredSections?: string[];
  forbiddenPhrases?: string[];
  minLength?: number;
  maxLength?: number;
}

export interface PromptCheck {
  name: string;
  passed: boolean;
  message?: string;
}

export interface PromptScore {
  passed: boolean;
  total: number;
  score: number;
  checks: PromptCheck[];
}

export interface ComparisonResult {
  baselineScore: PromptScore;
  candidateScore: PromptScore;
  improved: boolean;
  regressions: string[];
}
