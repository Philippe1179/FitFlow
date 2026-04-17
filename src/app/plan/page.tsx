'use client';

import WeeklyPlan from '@/components/WeeklyPlan';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function PlanPage() {
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
        <Skeleton className="h-10 w-1/3" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return <WeeklyPlan />;
}
