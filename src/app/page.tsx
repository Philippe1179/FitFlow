'use client';

import { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext } from '@/contexts/AppContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/firebase';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const context = useContext(AppContext);
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  useEffect(() => {
    if (!context.isLoading && !userLoading) {
      if (!user) {
        router.replace('/login');
      } else if (user && !context.userProfile) {
        router.replace('/onboarding');
      }
    }
  }, [context.isLoading, userLoading, context.userProfile, router, user]);

  if (context.isLoading || userLoading || !user || !context.userProfile) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-[350px] w-full lg:col-span-2" />
          <Skeleton className="h-[120px] w-full" />
          <Skeleton className="h-[120px] w-full" />
        </div>
      </div>
    );
  }

  return <Dashboard />;
}
