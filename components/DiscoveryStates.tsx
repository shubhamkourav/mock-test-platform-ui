import { Alert, Button, Skeleton, Stack, Typography } from '@mui/material';

export function DiscoveryLoading({ count = 3 }: { count?: number }) {
  return (
    <Stack spacing={2}>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} variant="rounded" height={150} />
      ))}
    </Stack>
  );
}

export function DiscoveryEmpty({ title, description }: { title: string; description: string }) {
  return (
    <Stack spacing={1} alignItems="center" textAlign="center" sx={{ py: 8 }}>
      <Typography variant="h6">{title}</Typography>
      <Typography color="text.secondary">{description}</Typography>
    </Stack>
  );
}

export function DiscoveryError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Stack spacing={2} alignItems="flex-start">
      <Alert severity="error" sx={{ width: '100%' }}>{message}</Alert>
      <Button variant="outlined" onClick={onRetry}>Retry</Button>
    </Stack>
  );
}
