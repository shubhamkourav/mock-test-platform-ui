import { AttemptPage } from '../../../components/AttemptPage';

export default async function Attempt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AttemptPage attemptId={id} />;
}