'use client';

import ProgressDashboard from '@/components/ProgressDashboard';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProgressPage() {
  const { user, loading: userLoading } = useUser();
  const context = useContext(AppContext);
  const router = useRouter();

  useEffect(() => {
    if (!context.isLoading && !userLoading) {
      if (!user) {
        router.replace('/login');
      } else if (!context.userProfile) {
        router.replace('/onboarding');
      }
    }
  }, [user, userLoading, context.isLoading, context.userProfile, router]);

  if (userLoading || context.isLoading || !user || !context.userProfile) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <h1 className="text-3xl font-bold tracking-tighter">Your Progress</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="lg:col-span-4 h-96" />
          <Skeleton className="lg:col-span-3 h-96" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return <ProgressDashboard />;
}
