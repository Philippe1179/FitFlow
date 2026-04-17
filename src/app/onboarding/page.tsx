'use client';

import OnboardingForm from '@/components/OnboardingForm';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoginPrompt from '@/components/LoginPrompt';

export default function OnboardingPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);
  
  if (loading) {
    return (
      <div className="container mx-auto max-w-2xl p-4 py-8 md:p-6 text-center">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <LoginPrompt />;
  }

  return (
    <div className="container mx-auto max-w-2xl p-4 py-8 md:p-6">
      <div className="space-y-2 text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
          Welcome to FitFlow
        </h1>
        <p className="text-muted-foreground">
          Let's set up your profile to create a personalized workout plan.
        </p>
      </div>
      <OnboardingForm />
    </div>
  );
}
