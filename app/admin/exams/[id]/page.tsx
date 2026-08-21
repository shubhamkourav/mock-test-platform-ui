import { AdminExamDetails } from '../../../../components/AdminExamDetails';

export default async function AdminExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminExamDetails examId={id} />;
}
