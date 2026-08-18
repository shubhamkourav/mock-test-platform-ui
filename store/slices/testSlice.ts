import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type TestState = { answers: Record<string, string[]>; markedForReview: Record<string, boolean>; currentIndex: number };
const initialState: TestState = { answers: {}, markedForReview: {}, currentIndex: 0 };
const slice = createSlice({
  name: 'test', initialState,
  reducers: {
    setAnswer: (state, action: PayloadAction<{ questionId: string; options: string[] }>) => { state.answers[action.payload.questionId] = action.payload.options; },
    setReviewState: (state, action: PayloadAction<{ questionId: string; value: boolean }>) => { state.markedForReview[action.payload.questionId] = action.payload.value; },
    setCurrentIndex: (state, action: PayloadAction<number>) => { state.currentIndex = action.payload; },
    resetTest: () => initialState,
  },
});
export const { setAnswer, setReviewState, setCurrentIndex, resetTest } = slice.actions;
export default slice.reducer;
