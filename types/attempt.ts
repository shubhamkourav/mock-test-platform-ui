export type AttemptStatus = 'in_progress' | 'completed' | 'auto_submitted';

export interface SectionResult {
  sectionId: string;
  attempted: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  score: number;
  timeSpentSeconds: number;
}

export interface TopicResult {
  topic: string;
  attempted: number;
  correct: number;
  incorrect: number;
  score: number;
  timeSpentSeconds: number;
  accuracy: number;
}

export interface Attempt {
  _id: string;
  userId: string;
  testId: string;
  startTime: string;
  endTime?: string;
  totalScore: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  timeTakenSeconds: number;
  status: AttemptStatus;
  sectionResults: SectionResult[];
  createdAt: string;
  updatedAt: string;
}

export type SelectionMode = 'single' | 'multiple';

export interface AttemptQuestion {
  questionId: string;
  questionText: string;
  options: Array<{ key: string; text: string }>;
  selectionMode: SelectionMode;
  subjectTag: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  sectionId: string;
  order: number;
  marks: number;
}

export interface AttemptAnswer {
  questionId: string;
  selectedOptions: string[];
  markedForReview: boolean;
  timeSpentSeconds: number;
  isAttempted: boolean;
}

export interface SaveAnswerInput {
  questionId: string;
  selectedOptions: string[];
  markedForReview: boolean;
  timeSpentSeconds: number;
}

export interface SaveAnswerResponse extends AttemptAnswer {}

export interface StartAttemptResponse {
  attempt: Attempt;
  questions: AttemptQuestion[];
  resumed: boolean;
}

export interface AttemptResponse {
  attempt: Attempt;
  answers: AttemptAnswer[];
}

export type SubmitAttemptResponse = Attempt;

export interface QuestionReview {
  questionId: string;
  questionText: string;
  options: Array<{ key: string; text: string }>;
  selectionMode: SelectionMode;
  selectedOptions: string[];
  correctOptions: string[];
  isAttempted: boolean;
  isCorrect: boolean;
  markedForReview: boolean;
  marks: number;
  negativeMarks: number;
  marksObtained: number;
  timeSpentSeconds: number;
  topic?: string;
  subjectTag?: string;
  explanation?: string;
}

export interface AttemptResult {
  attempt: Attempt;
  score: number;
  totalMarks: number;
  percentage: number;
  accuracy: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  timeTaken: number;
  status: AttemptStatus;
  sections: SectionResult[];
  topics: TopicResult[];
  review: QuestionReview[];
}
