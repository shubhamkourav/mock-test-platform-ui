import { ExamTestsPage } from '../../../components/ExamTestsPage';

export default async function ExamTests({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ExamTestsPage examId={id} />;
}
