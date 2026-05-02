import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import UserSyncProvider from '@/components/UserSyncProvider';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  return (
    <UserSyncProvider>
      <div className="flex min-h-screen bg-cru-bg">
        <Sidebar />
        <main className="flex-1 min-h-screen overflow-y-auto" style={{ marginLeft: '200px' }}>
          <div className="max-w-[1600px] mx-auto px-10 py-10">{children}</div>
        </main>
      </div>
    </UserSyncProvider>
  );
}
