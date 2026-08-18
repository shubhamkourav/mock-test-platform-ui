import { TestDetails } from '../../../components/TestDetails';

export default async function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TestDetails testId={id} />;
}