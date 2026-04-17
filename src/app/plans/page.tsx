'use client';

import PlanManager from '@/components/PlanManager';
import { Skeleton } from '@/components/ui/skeleton';
import { AppContext } from '@/contexts/AppContext';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useContext, useEffect } from 'react';

export default function PlansPage() {
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
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  return <PlanManager />;
}
