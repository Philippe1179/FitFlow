'use client';

import CardioView from '@/components/CardioView';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function CardioPage() {
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
        <h1 className="text-3xl font-bold tracking-tighter">Cardio</h1>
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return <CardioView />;
}
