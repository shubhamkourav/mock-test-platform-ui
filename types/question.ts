export interface QuestionOption {
  key: string;
  text: string;
}

export type QuestionSelectionMode = 'single' | 'multiple';

export interface StudentQuestion {
  _id: string;
  sectionId: string;
  subjectTag: string;
  topic: string;
  questionText: string;
  options: QuestionOption[];
  selectionMode: QuestionSelectionMode;
  explanation?: string;
  defaultMarks: number;
  negativeMarks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  source: string;
  language: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminQuestion extends StudentQuestion {
  correctOptions: string[];
}

export interface QuestionFilters {
  examId?: string;
  exam?: string;
  sectionId?: string;
  subject?: string;
  subjectTag?: string;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  active?: boolean;
  page?: number;
  limit?: number;
}

export interface QuestionListResponse {
  items: StudentQuestion[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CreateQuestionInput {
  examId?: string;
  sectionId: string;
  subjectTag: string;
  topic: string;
  questionText: string;
  options: QuestionOption[];
  correctOptions: string[];
  selectionMode: QuestionSelectionMode;
  explanation?: string;
  defaultMarks?: number;
  negativeMarks?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  source?: string;
  language?: string;
  isActive?: boolean;
}

export type UpdateQuestionInput = Partial<CreateQuestionInput>;
