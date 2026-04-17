'use client';

import { useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Moon, Repeat, Zap } from 'lucide-react';
import { getTodayDayName, calculateStreak } from '@/lib/utils';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import Image from 'next/image';
import { placeholderImages } from '@/lib/placeholder-images.json';

export default function Dashboard() {
  const { userProfile, activePlan, completedWorkouts } = useContext(AppContext);
  const today = getTodayDayName();

  const planForToday = activePlan?.weeklyWorkoutPlan.find(
    (p) => p.day.toLowerCase() === today.toLowerCase()
  );
  const isRestDay = !planForToday || planForToday.exercises.length === 0;

  const totalWorkouts = completedWorkouts.length;
  const streak = activePlan ? calculateStreak(completedWorkouts, activePlan) : 0;

  const isTodayCompleted = completedWorkouts.some(
    (w) =>
      differenceInCalendarDays(new Date(), parseISO(w.date)) === 0 &&
      w.day.toLowerCase() === today.toLowerCase()
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tighter">
        Welcome back, {userProfile?.name?.split(' ')[0] || 'Fitness Fan'}!
      </h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today's Workout: {today}</CardTitle>
            {activePlan && <CardDescription>From plan: {activePlan.name}</CardDescription>}
          </CardHeader>
          <CardContent>
            {isTodayCompleted ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                    <h3 className="text-xl font-semibold">Workout Complete!</h3>
                    <p className="text-muted-foreground mt-2">You crushed it today. Enjoy your recovery!</p>
                </div>
            ) : isRestDay ? (
              <div className="flex items-center gap-4">
                <Moon className="w-10 h-10 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold">Rest Day</h3>
                  <p className="text-sm text-muted-foreground">
                    {planForToday?.notes ||
                      planForToday?.cardio ||
                      'Enjoy your recovery.'}
                  </p>
                </div>
              </div>
            ) : planForToday ? (
              <div>
                <CardDescription>
                  {planForToday.exercises.length} exercises planned.
                </CardDescription>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                  {planForToday.exercises.slice(0, 3).map((ex) => (
                    <li key={ex.name} className="truncate">{ex.name}</li>
                  ))}
                  {planForToday.exercises.length > 3 && <li>...and more</li>}
                </ul>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8">
                 <Image
                    src={placeholderImages[1]?.imageUrl || 'https://picsum.photos/seed/restday/600/400'}
                    alt={placeholderImages[1]?.description || 'Rest day'}
                    data-ai-hint={placeholderImages[1]?.imageHint || "fitness rest"}
                    width={600} height={400}
                    className="rounded-lg object-cover mb-4"
                />
                <h3 className="font-semibold">No Plan Found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Go to your profile to generate a new workout plan.
                </p>
              </div>
            )}
          </CardContent>
          <CardContent>
             <Button asChild className="w-full" disabled={!planForToday && !isTodayCompleted}>
                <Link href={`/workout/${today}`}>
                    {isTodayCompleted ? 'Review Workout' : isRestDay ? 'View Suggestions' : 'Start Workout'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWorkouts}</div>
            <p className="text-xs text-muted-foreground">sessions logged</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workout Streak</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{streak}</div>
            <p className="text-xs text-muted-foreground">consecutive days</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
