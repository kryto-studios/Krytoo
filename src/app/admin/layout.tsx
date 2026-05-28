import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const ADMIN_EMAILS = ["gamermirchi08@gmail.com", "krytostudio@gmail.com"];

  if (!user || !user.email || !ADMIN_EMAILS.includes(user.email)) {
    redirect('/login'); // Redirect to login or home
  }

  return <>{children}</>;
}
