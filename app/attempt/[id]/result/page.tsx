import { ResultPage } from '../../../../components/ResultPage';

export default async function Result({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResultPage attemptId={id} />;
}