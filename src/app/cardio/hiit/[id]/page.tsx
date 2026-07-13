'use client';

import HiitSessionView from '@/components/HiitSessionView';
import { Skeleton } from '@/components/ui/skeleton';
import { AppContext } from '@/contexts/AppContext';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useContext, useEffect, useState, use } from 'react';

export default function HiitSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const context = useContext(AppContext);
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!context.isLoading && !userLoading) {
      if (!user) {
        router.replace('/login');
      } else if (!context.userProfile) {
        router.replace('/onboarding');
      } else {
        setIsLoading(false);
      }
    }
  }, [context.isLoading, userLoading, user, context.userProfile, router]);

  if (isLoading || context.isLoading || userLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return <HiitSessionView workoutId={resolvedParams.id} />;
}
