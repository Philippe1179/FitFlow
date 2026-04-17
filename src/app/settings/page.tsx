'use client';

import { useContext, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext } from '@/contexts/AppContext';
import { useFirebase, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { LogOut, Trash2 } from 'lucide-react';
import LoginPrompt from '@/components/LoginPrompt';

export default function SettingsPage() {
  const { userProfile, setUserProfile, clearAllData } = useContext(AppContext);
  const { auth } = useFirebase();
  const { user, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  if (loading) {
    return <div className="container mx-auto max-w-2xl p-4 py-8" />;
  }

  if (!user) {
    return <LoginPrompt />;
  }

  const handleUnitChange = (field: 'displayWeightUnit' | 'displayHeightUnit', value: string) => {
    if (!userProfile) return;
    startTransition(() => {
      setUserProfile({
        ...userProfile,
        [field]: value,
      });
      toast({ title: 'Preferences saved.' });
    });
  };

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    router.replace('/login');
  };

  const handleClearData = () => {
    startTransition(async () => {
      await clearAllData();
      toast({ title: 'Data cleared', description: 'All your data has been removed.' });
    });
  };

  return (
    <div className="container mx-auto max-w-2xl p-4 py-8 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences.</p>
      </div>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs uppercase tracking-wide">Name</Label>
            <p className="text-sm font-medium">{userProfile?.name || user.displayName || '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs uppercase tracking-wide">Email</Label>
            <p className="text-sm font-medium">{user.email}</p>
          </div>
          <Separator />
          <Button variant="outline" onClick={handleSignOut} className="w-full sm:w-auto">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* Unit Preferences */}
      {userProfile && (
        <Card>
          <CardHeader>
            <CardTitle>Display Units</CardTitle>
            <CardDescription>Choose how weight and height are shown throughout the app.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Weight</Label>
              <RadioGroup
                value={userProfile.displayWeightUnit}
                onValueChange={(v) => handleUnitChange('displayWeightUnit', v)}
                className="flex gap-6"
                disabled={isPending}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="kg" id="weight-kg" />
                  <Label htmlFor="weight-kg" className="font-normal">Kilograms (kg)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="lbs" id="weight-lbs" />
                  <Label htmlFor="weight-lbs" className="font-normal">Pounds (lbs)</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label>Height</Label>
              <RadioGroup
                value={userProfile.displayHeightUnit}
                onValueChange={(v) => handleUnitChange('displayHeightUnit', v)}
                className="flex gap-6"
                disabled={isPending}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cm" id="height-cm" />
                  <Label htmlFor="height-cm" className="font-normal">Centimeters (cm)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ft" id="height-ft" />
                  <Label htmlFor="height-ft" className="font-normal">Feet & Inches (ft)</Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions. Please proceed with caution.</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isPending}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All My Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your profile, all workout plans, completed workouts, and personal records. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearData} disabled={isPending}>
                  {isPending ? 'Clearing...' : 'Yes, delete everything'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
