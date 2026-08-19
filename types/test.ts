export type TestType = 'full_mock' | 'sectional' | 'topic_wise';
export type TestDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';

export interface TestSection {
  sectionId: string;
  questionCount: number;
  marks: number;
  durationMinutes: number;
}

export interface TestSettings {
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  allowResume: boolean;
}

export interface Test {
  _id: string;
  examId: string;
  stage: string;
  title: string;
  type: TestType;
  sectionId?: string;
  totalQuestions: number;
  totalMarks: number;
  durationMinutes: number;
  difficulty: TestDifficulty;
  sections: TestSection[];
  settings: TestSettings;
  isPublished: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestQuestion {
  _id: string;
  testId: string;
  questionId: string;
  sectionId: string;
  order: number;
  marks: number;
  createdAt: string;
  updatedAt: string;
}

export interface TestDetailQuestion extends Omit<TestQuestion, 'questionId'> {
  questionId: StudentTestQuestion;
}

export interface StudentTestQuestion {
  _id: string;
  sectionId: string;
  subjectTag: string;
  topic: string;
  questionText: string;
  options: Array<{ key: string; text: string }>;
  difficulty: 'easy' | 'medium' | 'hard';
  defaultMarks: number;
  negativeMarks: number;
  explanation?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TestListResponse extends Array<Test> {}

export interface TestDetailResponse extends Test {
  questions: TestDetailQuestion[];
}

export interface CreateTestInput {
  examId: string;
  stage?: string;
  title: string;
  type: TestType;
  sectionId?: string;
  totalQuestions: number;
  totalMarks: number;
  durationMinutes: number;
  difficulty?: TestDifficulty;
  sections: TestSection[];
  settings?: Partial<TestSettings>;
}

export type UpdateTestInput = Partial<CreateTestInput>;

export interface AddTestQuestionInput {
  questionId: string;
  sectionId?: string;
  order: number;
  marks?: number;
}

export interface UpdateTestQuestionInput {
  sectionId?: string;
  order?: number;
  marks?: number;
}

export interface ReorderTestQuestionsInput {
  items: Array<{ questionId: string; order: number }>;
}
