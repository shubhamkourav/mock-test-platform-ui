export interface Exam {
  _id: string;
  name: string;
  slug: string;
  category: string;
  conductingBody?: string;
  examPatternNotes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  _id: string;
  examId: string;
  stage: string;
  name: string;
  slug: string;
  subjectTag: string;
  questionCount: number;
  timeMinutes: number;
  maxMarks: number;
  negativeMarking: number;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ExamDetail = Exam;

export interface CreateExamInput {
  name: string;
  slug: string;
  category: string;
  conductingBody?: string;
  examPatternNotes?: string;
  isActive?: boolean;
}

export type UpdateExamInput = Partial<CreateExamInput>;

export interface CreateSectionInput {
  stage?: string;
  name: string;
  slug: string;
  subjectTag: string;
  questionCount: number;
  timeMinutes: number;
  maxMarks: number;
  negativeMarking?: number;
  order?: number;
  isActive?: boolean;
}

export type UpdateSectionInput = Partial<CreateSectionInput>;
