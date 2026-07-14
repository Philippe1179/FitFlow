'use client';

import { useContext, useState, useTransition } from 'react';
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
import { ArrowRight, CheckCircle2, Flame, Footprints, LineChart, Moon, Plus, Repeat, Scale, Zap } from 'lucide-react';
import { getTodayDayName, calculateStreak, getTodayCardioStats } from '@/lib/utils';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import Image from 'next/image';
import { placeholderImages } from '@/lib/placeholder-images.json';
import { useToast } from '@/hooks/use-toast';
import { ProgressRing } from './ProgressRing';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const {
    userProfile,
    activePlan,
    completedWorkouts,
    cardioLogEntries,
    bodyWeightEntries,
    addBodyWeightEntry,
  } = useContext(AppContext);
  const { toast } = useToast();
  const today = getTodayDayName();
  const dailyStepGoal = userProfile?.dailyStepGoal || 10000;
  const { steps: todaySteps, didHiit: didHiitToday } = getTodayCardioStats(cardioLogEntries);
  const cardioGoalMet = todaySteps >= dailyStepGoal || didHiitToday;

  const [weightInput, setWeightInput] = useState('');
  const [isLoggingWeight, startWeightTransition] = useTransition();

  const planForToday = activePlan?.weeklyWorkoutPlan.find(
    (p) => p.day.toLowerCase() === today.toLowerCase()
  );
  const isRestDay = !planForToday || planForToday.exercises.length === 0;

  const totalWorkouts = completedWorkouts.length;
  const streak = activePlan
    ? calculateStreak(completedWorkouts, activePlan, cardioLogEntries, dailyStepGoal)
    : 0;

  const isTodayCompleted = completedWorkouts.some(
    (w) =>
      differenceInCalendarDays(new Date(), parseISO(w.date)) === 0 &&
      w.day.toLowerCase() === today.toLowerCase()
  );

  const latestWeightEntry = [...bodyWeightEntries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];
  const displayUnit = userProfile?.displayWeightUnit || 'kg';
  const latestWeightDisplay = latestWeightEntry
    ? displayUnit === 'lbs'
      ? (latestWeightEntry.weight * 2.20462).toFixed(1)
      : latestWeightEntry.weight.toFixed(1)
    : null;

  const handleLogWeight = () => {
    const val = parseFloat(weightInput);
    if (isNaN(val) || val <= 0) return;
    startWeightTransition(async () => {
      const kg = displayUnit === 'lbs' ? val * 0.453592 : val;
      await addBodyWeightEntry(kg);
      setWeightInput('');
      toast({ title: 'Weight logged!' });
    });
  };

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

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Today's Cardio</CardTitle>
              {cardioGoalMet && (
                <span className="flex items-center gap-1 text-sm font-medium text-accent">
                  <CheckCircle2 className="h-4 w-4" /> Goal Met
                </span>
              )}
            </div>
            <CardDescription>
              Hit your daily step goal, or swap in a HIIT session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <ProgressRing value={todaySteps} max={dailyStepGoal} size={72} strokeWidth={7}>
                <Footprints className="h-6 w-6 text-accent" />
              </ProgressRing>
              <div>
                <div className="text-2xl font-bold font-headline">
                  {todaySteps.toLocaleString()}
                  <span className="text-base font-normal text-muted-foreground">
                    {' '}
                    / {dailyStepGoal.toLocaleString()} steps
                  </span>
                </div>
                {didHiitToday && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Flame className="h-4 w-4 text-orange-500 dark:text-orange-400" /> HIIT session completed today
                  </p>
                )}
              </div>
            </div>
          </CardContent>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/cardio">
                Go to Cardio
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
            <CardTitle className="text-sm font-medium">Activity Streak</CardTitle>
            <Zap
              className={cn(
                'h-4 w-4',
                streak > 0 ? 'text-orange-500 dark:text-orange-400' : 'text-muted-foreground'
              )}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{streak}</div>
            <p className="text-xs text-muted-foreground">consecutive active days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Log Weight</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                placeholder={displayUnit}
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className="w-full h-8 text-sm px-2 rounded-md border border-input bg-background"
              />
              <Button
                size="icon"
                className="h-8 w-8 shrink-0"
                disabled={isLoggingWeight || !weightInput}
                onClick={handleLogWeight}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {latestWeightDisplay ? `Last: ${latestWeightDisplay} ${displayUnit}` : 'No entries yet'}
            </p>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <LineChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex-1 flex items-end">
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/progress">
                View Progress
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
