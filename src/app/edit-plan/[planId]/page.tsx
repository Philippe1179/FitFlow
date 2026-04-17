'use client';

import EditPlanView from '@/components/EditPlanView';
import { useUser } from '@/firebase';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditPlanPage() {
  const { user, loading: userLoading } = useUser();
  const context = useContext(AppContext);
  const router = useRouter();
  const params = useParams();
  const planId = params.planId as string;

  useEffect(() => {
    if (!context.isLoading && !userLoading) {
      if (!user) {
        router.replace('/login');
      } else if (!context.userProfile) {
        router.replace('/onboarding');
      }
    }
  }, [user, userLoading, context.isLoading, context.userProfile, router]);
  
  if (userLoading || context.isLoading || !user || !context.userProfile || !planId) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return <EditPlanView planId={planId} />;
}
