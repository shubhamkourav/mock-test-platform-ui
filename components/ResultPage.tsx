'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  LinearProgress,
  Radio,
  Stack,
  Typography,
} from '@mui/material';
import { attemptsApi } from '../lib/api/attempts';
import { ApiClientError } from '../lib/api';
import { AppShell } from './AppShell';
import { DiscoveryLoading } from './DiscoveryStates';
import type { AttemptResult, QuestionReview } from '../types/attempt';

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.status === 401) return 'Your session has expired. Please sign in again.';
    if (error.status === 403) return 'You are not authorized to view this result.';
    if (error.status === 404) return 'This attempt or result could not be found.';
    if (error.status === 409) return error.message || 'This result is not available in its current state.';
    if (error.status === 400) return error.message || 'This result is not available yet.';
  }
  return 'Unable to load the result. Please try again.';
}

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function optionPresentation(review: QuestionReview, optionKey: string) {
  const selected = review.selectedOptions.includes(optionKey);
  const correct = review.correctOptions.includes(optionKey);
  if (selected && correct) return { label: 'Selected and correct', color: 'success' as const };
  if (selected) return { label: 'Selected answer', color: 'error' as const };
  if (correct) return { label: 'Correct answer', color: 'success' as const };
  return { label: '', color: 'default' as const };
}

function ReviewQuestion({ review, index }: { review: QuestionReview; index: number }) {
  const statusLabel = !review.isAttempted ? 'Unattempted' : review.isCorrect ? 'Correct' : 'Incorrect';
  const statusColor = !review.isAttempted ? 'default' : review.isCorrect ? 'success' : 'error';

  return (
    <Card id={`review-question-${index + 1}`}>
      <CardContent>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip label={`Question ${index + 1}`} size="small" />
              <Chip label={review.selectionMode === 'multiple' ? 'Multiple choice' : 'Single choice'} size="small" variant="outlined" />
              {review.markedForReview && <Chip label="Marked for review" size="small" color="warning" variant="outlined" />}
            </Stack>
            <Chip label={statusLabel} size="small" color={statusColor} />
          </Stack>

          <Typography variant="h6">{review.questionText}</Typography>

          <Stack spacing={1}>
            {review.options.map((option) => {
              const presentation = optionPresentation(review, option.key);
              const checked = review.selectedOptions.includes(option.key);
              const Control = review.selectionMode === 'multiple' ? Checkbox : Radio;
              return (
                <Box
                  key={option.key}
                  sx={{
                    p: 1.25,
                    border: 1,
                    borderColor: presentation.color === 'success' ? 'success.main' : presentation.color === 'error' ? 'error.main' : 'divider',
                    borderRadius: 1,
                    bgcolor: presentation.color === 'success' ? 'success.50' : presentation.color === 'error' ? 'error.50' : 'background.paper',
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <FormControlLabel
                      sx={{ m: 0, flex: 1 }}
                      control={<Control checked={checked} disabled />}
                      label={<Typography>{option.text}</Typography>}
                    />
                    {presentation.label && <Chip label={presentation.label} size="small" color={presentation.color} variant="outlined" />}
                  </Stack>
                </Box>
              );
            })}
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap">
            <Chip label={`Marks: ${review.marks}`} size="small" variant="outlined" />
            <Chip label={`Obtained: ${review.marksObtained}`} size="small" variant="outlined" />
            <Chip label={`Negative marks: ${review.negativeMarks}`} size="small" variant="outlined" />
            <Chip label={`Time: ${formatDuration(review.timeSpentSeconds)}`} size="small" variant="outlined" />
            {review.subjectTag && <Chip label={`Subject: ${review.subjectTag}`} size="small" variant="outlined" />}
            {review.topic && <Chip label={`Topic: ${review.topic}`} size="small" variant="outlined" />}
          </Stack>

          {review.explanation && (
            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>Explanation</Typography>
              <Typography color="text.secondary">{review.explanation}</Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent>
        <Typography color="text.secondary" variant="body2">{label}</Typography>
        <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>{value}</Typography>
      </CardContent>
    </Card>
  );
}

export function ResultPage({ attemptId }: { attemptId: string }) {
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  const loadResult = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await attemptsApi.result(attemptId);
      setResult(response);
      setCurrentIndex(0);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    void loadResult();
  }, [loadResult]);

  const review = result?.review ?? [];
  const currentReview = review[currentIndex];
  const reviewProgress = useMemo(() => review.length ? `${currentIndex + 1} / ${review.length}` : '0 / 0', [currentIndex, review.length]);

  if (loading) return <AppShell><DiscoveryLoading count={4} /></AppShell>;

  if (error || !result) {
    return (
      <AppShell>
        <Stack spacing={2}>
          <Alert severity="error">{error || 'Unable to load the result.'}</Alert>
          <Button variant="outlined" onClick={() => void loadResult()}>Retry</Button>
        </Stack>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
          <Box>
            <Typography variant="h4" fontWeight={800}>Test Result</Typography>
            <Typography color="text.secondary">Attempt status: {result.status.replace('_', ' ')}</Typography>
          </Box>
          <Chip label={result.status.replace('_', ' ')} color={result.status === 'completed' ? 'success' : 'warning'} />
        </Stack>

        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}><MetricCard label="Score" value={`${result.score} / ${result.totalMarks}`} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><MetricCard label="Percentage" value={`${result.percentage}%`} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><MetricCard label="Accuracy" value={`${result.accuracy}%`} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><MetricCard label="Time taken" value={formatDuration(result.timeTaken)} /></Grid>
          <Grid size={{ xs: 6, md: 4 }}><MetricCard label="Correct" value={result.correct} /></Grid>
          <Grid size={{ xs: 6, md: 4 }}><MetricCard label="Incorrect" value={result.incorrect} /></Grid>
          <Grid size={{ xs: 6, md: 4 }}><MetricCard label="Unattempted" value={result.unattempted} /></Grid>
        </Grid>

        <Card>
          <CardContent>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between"><Typography fontWeight={700}>Overall percentage</Typography><Typography>{result.percentage}%</Typography></Stack>
              <LinearProgress variant="determinate" value={Math.min(100, Math.max(0, result.percentage))} />
            </Stack>
          </CardContent>
        </Card>

        {result.sections.length > 0 && (
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" fontWeight={800}>Section performance</Typography>
                {result.sections.map((section) => (
                  <Box key={section.sectionId} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Stack spacing={1}>
                      <Typography fontWeight={700}>Section {section.sectionId}</Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip label={`Score: ${section.score}`} size="small" />
                        <Chip label={`Correct: ${section.correct}`} size="small" />
                        <Chip label={`Incorrect: ${section.incorrect}`} size="small" />
                        <Chip label={`Unattempted: ${section.unattempted}`} size="small" />
                        <Chip label={`Time: ${formatDuration(section.timeSpentSeconds)}`} size="small" />
                      </Stack>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        {result.topics.length > 0 && (
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" fontWeight={800}>Topic performance</Typography>
                {result.topics.map((topic, index) => (
                  <Box key={`${topic.topic}-${index}`}>
                    <Stack direction="row" justifyContent="space-between" spacing={1}>
                      <Typography fontWeight={650}>{topic.topic || 'Unknown'}</Typography>
                      <Typography>{topic.accuracy}%</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={Math.min(100, Math.max(0, topic.accuracy))} sx={{ mt: 0.5 }} />
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                      <Chip label={`Score: ${topic.score}`} size="small" variant="outlined" />
                      <Chip label={`Correct: ${topic.correct}`} size="small" variant="outlined" />
                      <Chip label={`Incorrect: ${topic.incorrect}`} size="small" variant="outlined" />
                      <Chip label={`Unattempted: ${Math.max(0, topic.attempted - topic.correct - topic.incorrect)}`} size="small" variant="outlined" />
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        <Divider />
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
            <Box>
              <Typography variant="h5" fontWeight={800}>Question review</Typography>
              <Typography color="text.secondary">Read-only review of the submitted answers.</Typography>
            </Box>
            <Chip label={reviewProgress} />
          </Stack>

          {review.length === 0 ? (
            <Card><CardContent><Typography color="text.secondary">No question review is available for this result.</Typography></CardContent></Card>
          ) : (
            <>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {review.map((item, index) => (
                  <Button
                    key={item.questionId}
                    size="small"
                    variant={index === currentIndex ? 'contained' : 'outlined'}
                    color={!item.isAttempted ? 'inherit' : item.isCorrect ? 'success' : 'error'}
                    onClick={() => setCurrentIndex(index)}
                    aria-label={`Review question ${index + 1}`}
                  >
                    {index + 1}
                  </Button>
                ))}
              </Stack>

              {currentReview && <ReviewQuestion review={currentReview} index={currentIndex} />}

              <Stack direction="row" justifyContent="space-between">
                <Button disabled={currentIndex === 0} onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}>Previous</Button>
                <Button disabled={currentIndex === review.length - 1} variant="contained" onClick={() => setCurrentIndex((index) => Math.min(review.length - 1, index + 1))}>Next</Button>
              </Stack>
            </>
          )}
        </Stack>
      </Stack>
    </AppShell>
  );
}
