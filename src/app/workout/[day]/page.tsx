'use client';

import WorkoutDayView from '@/components/WorkoutDayView';
import { Skeleton } from '@/components/ui/skeleton';
import { AppContext } from '@/contexts/AppContext';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useContext, useEffect, useState, use } from 'react';

export default function WorkoutPage({ params }: { params: Promise<{ day: string }> }) {
  const resolvedParams = use(params);
  const context = useContext(AppContext);
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  
  const day = decodeURIComponent(resolvedParams.day);

  useEffect(() => {
    if (!context.isLoading && !userLoading) {
      if (!user) {
        router.replace('/login');
      } else if (!context.userProfile || !context.activePlan) {
        router.replace('/');
      } else {
        setIsLoading(false);
      }
    }
  }, [context.isLoading, userLoading, user, context.userProfile, context.activePlan, router]);

  if (isLoading || context.isLoading || userLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-10 w-1/3" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return <WorkoutDayView day={day} />;
}
