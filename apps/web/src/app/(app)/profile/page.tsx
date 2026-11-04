import { redirect } from 'next/navigation';
import { getSession } from '@/lib/server';
import { ProfileForm } from '@/components/profile-form';

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect('/login');
  return <ProfileForm session={session} />;
}
