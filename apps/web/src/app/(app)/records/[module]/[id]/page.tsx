import { RecordDetail } from '@/components/record-detail';

export default async function RecordPage({ params }: { params: Promise<{ module: string; id: string }> }) {
  const { module, id } = await params;
  return <RecordDetail moduleKey={module} id={id} />;
}
