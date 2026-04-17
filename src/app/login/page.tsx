'use client';

import { useAuth } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Chrome } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const auth = useAuth();
  const { user, loading } = useUser();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !loading && user) {
      router.push('/');
    }
  }, [user, loading, router, isMounted]);

  const handleSignIn = async () => {
    if (auth) {
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
        router.push('/');
      } catch (error: any) {
        console.error('Error signing in with Google', error);
        let description = 'An unknown error occurred during sign-in.';
        if (error.code === 'auth/operation-not-allowed') {
          description =
            'Google Sign-In must be enabled in the Firebase console. Go to Authentication > Sign-in method to add it.';
        } else if (error.code) {
          description = `Error: ${error.code}`;
        }
        toast({
          variant: 'destructive',
          title: 'Authentication Error',
          description: description,
        });
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'Auth service not available. Please try again in a moment.',
      });
      console.error('Auth service not available. Sign-in cannot proceed.');
    }
  };

  if (!isMounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        Loading...
      </div>
    );
  }

  if (user) {
    // While redirecting, render nothing to avoid a flash of the login page
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Welcome to FitFlow
          </CardTitle>
          <CardDescription>
            Sign in to continue to your workout plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={handleSignIn}>
            <Chrome className="mr-2 h-4 w-4" />
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
