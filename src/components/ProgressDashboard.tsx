'use client';
import { useContext, useMemo, useState, useTransition } from 'react';
import { AppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { differenceInCalendarDays, parseISO, startOfWeek, format } from 'date-fns';
import { calculateStreak } from '@/lib/utils';
import { Button, buttonVariants } from './ui/button';
import { Wand2, Award, Repeat, Zap, CalendarDays, Plus, Trash2, History, Scale, Footprints, Flame } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { adjustWorkoutPlanAction } from '@/app/actions';
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
} from './ui/alert-dialog';
import type { WorkoutPlan } from '@/lib/types';
import Image from 'next/image';
import { placeholderImages } from '@/lib/placeholder-images.json';
import { AddPrDialog } from './AddPrDialog';
import { ExerciseProgressDialog } from './ExerciseProgressDialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { cn } from '@/lib/utils';

type AdjustmentState = {
  summary: string;
  newPlan: Omit<WorkoutPlan, 'id' | 'name'>;
} | null;

export default function ProgressDashboard() {
  const {
    completedWorkouts,
    userProfile,
    activePlan,
    addNewPlan,
    personalRecords,
    deletePersonalRecord,
    deleteCompletedWorkout,
    bodyWeightEntries,
    addBodyWeightEntry,
    deleteBodyWeightEntry,
    cardioLogEntries,
  } = useContext(AppContext);
  const { toast } = useToast();
  const [isAdjusting, startAdjustTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [adjustment, setAdjustment] = useState<AdjustmentState>(null);
  const [isAddPrDialogOpen, setIsAddPrDialogOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [weightInput, setWeightInput] = useState('');
  const [isLoggingWeight, startWeightTransition] = useTransition();

  const sortedWorkouts = useMemo(() => {
    return [...completedWorkouts].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [completedWorkouts]);

  const dailyStepGoal = userProfile?.dailyStepGoal || 10000;

  const stats = useMemo(() => {
    const totalWorkouts = completedWorkouts.length;
    const streak = activePlan
      ? calculateStreak(completedWorkouts, activePlan, cardioLogEntries, dailyStepGoal)
      : 0;
    return { totalWorkouts, streak };
  }, [completedWorkouts, activePlan, cardioLogEntries, dailyStepGoal]);

  const chartData = useMemo(() => {
    const weekData: { [key: string]: { name: string; total: number } } = {
      Sun: { name: 'Sun', total: 0 },
      Mon: { name: 'Mon', total: 0 },
      Tue: { name: 'Tue', total: 0 },
      Wed: { name: 'Wed', total: 0 },
      Thu: { name: 'Thu', total: 0 },
      Fri: { name: 'Fri', total: 0 },
      Sat: { name: 'Sat', total: 0 },
    };
    const currentWeekStart = startOfWeek(new Date());
    completedWorkouts.forEach((w) => {
      const date = parseISO(w.date);
      if (differenceInCalendarDays(currentWeekStart, date) <= 0) {
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });
        if (weekData[day]) weekData[day].total += 1;
      }
    });
    return Object.values(weekData);
  }, [completedWorkouts]);

  const cardioChartData = useMemo(() => {
    const weekData: { [key: string]: { name: string; steps: number; hiit: boolean } } = {
      Sun: { name: 'Sun', steps: 0, hiit: false },
      Mon: { name: 'Mon', steps: 0, hiit: false },
      Tue: { name: 'Tue', steps: 0, hiit: false },
      Wed: { name: 'Wed', steps: 0, hiit: false },
      Thu: { name: 'Thu', steps: 0, hiit: false },
      Fri: { name: 'Fri', steps: 0, hiit: false },
      Sat: { name: 'Sat', steps: 0, hiit: false },
    };
    const currentWeekStart = startOfWeek(new Date());
    cardioLogEntries.forEach((e) => {
      const date = parseISO(e.date);
      if (differenceInCalendarDays(currentWeekStart, date) <= 0) {
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });
        if (!weekData[day]) return;
        if (e.type === 'steps') weekData[day].steps += e.steps || 0;
        if (e.type === 'hiit') weekData[day].hiit = true;
      }
    });
    return Object.values(weekData);
  }, [cardioLogEntries]);

  const handleAdjustPlan = () => {
    if (!userProfile || !activePlan) {
      toast({
        variant: 'destructive',
        title: 'Cannot adjust plan without a profile and an active plan.',
      });
      return;
    }
    startAdjustTransition(async () => {
      const result = await adjustWorkoutPlanAction(
        userProfile,
        activePlan,
        completedWorkouts
      );
      if (result.success && result.data) {
        setAdjustment({
          summary: result.data.adjustmentSummary,
          newPlan: result.data.adjustedWorkoutPlan,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error,
        });
      }
    });
  };

  const handleAcceptAdjustment = () => {
    if (adjustment && activePlan) {
      const planName = `Adjusted - ${format(new Date(), 'MMM d')}`;
      addNewPlan(adjustment.newPlan, planName, true);
      toast({
        title: 'Plan Updated!',
        description: `Your new plan "${planName}" has been saved and activated.`,
      });
      setAdjustment(null);
    }
  };

  const handleDeleteWorkout = (workoutId: string) => {
    startDeleteTransition(async () => {
      await deleteCompletedWorkout(workoutId);
    });
  };

  if (completedWorkouts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <Image
              src={
                placeholderImages[0]?.imageUrl ||
                'https://picsum.photos/seed/start/600/400'
              }
              alt={placeholderImages[0]?.description || 'Get started'}
              data-ai-hint={placeholderImages[0]?.imageHint || 'fitness motivation'}
              width={600}
              height={400}
              className="rounded-t-lg object-cover"
            />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl font-bold">
              Start Your Journey!
            </CardTitle>
            <CardDescription className="mt-2">
              Complete your first workout to see your progress here. You've got
              this!
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
        <h1 className="text-3xl font-bold tracking-tighter">Your Progress</h1>
        <Button onClick={handleAdjustPlan} disabled={isAdjusting || !activePlan}>
          <Wand2 className="mr-2" />
          {isAdjusting ? 'Analyzing...' : 'AI Adjust Active Plan'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWorkouts}</div>
            <p className="text-xs text-muted-foreground">sessions logged</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activity Streak</CardTitle>
            <Zap
              className={cn(
                'h-4 w-4',
                stats.streak > 0 ? 'text-orange-500 dark:text-orange-400' : 'text-muted-foreground'
              )}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{stats.streak}</div>
            <p className="text-xs text-muted-foreground">consecutive active days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarDays className="mr-2" />
              This Week's Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                  allowDecimals={false}
                />
                <Bar
                  dataKey="total"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center">
                <Award className="mr-2" />
                Personal Records
              </CardTitle>
              <Button size="sm" onClick={() => setIsAddPrDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add PR
              </Button>
            </div>
            <CardDescription>Manually track your personal bests.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
            {personalRecords.length > 0 ? (
              personalRecords.map((pr) => {
                const displayWeight =
                  userProfile?.displayWeightUnit === 'lbs'
                    ? (pr.weight * 2.20462).toFixed(1)
                    : pr.weight.toFixed(1);
                const displayUnit = userProfile?.displayWeightUnit || 'kg';

                return (
                  <div
                    key={pr.id}
                    className="flex justify-between items-center text-sm p-2 rounded-lg bg-muted/50 group cursor-pointer hover:bg-muted"
                    onClick={() => setSelectedExercise(pr.exerciseName)}
                  >
                    <div>
                      <span className="font-medium">{pr.exerciseName}</span>
                      <p className="text-xs text-muted-foreground">
                        {new Date(pr.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">
                        {displayWeight} {displayUnit} x {pr.reps} reps
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePersonalRecord(pr.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No personal records added yet. Add your first PR!
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Footprints className="mr-2 text-accent" />
            Cardio Activity
          </CardTitle>
          <CardDescription>Steps this week, with your daily goal as a dashed line. The flame marks days you logged a HIIT session.</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cardioChartData}>
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
                allowDecimals={false}
              />
              <Tooltip formatter={(v) => [`${v} steps`, 'Steps']} />
              <ReferenceLine
                y={dailyStepGoal}
                stroke="hsl(var(--accent))"
                strokeDasharray="4 4"
                strokeOpacity={0.7}
              />
              <Bar dataKey="steps" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-7 gap-1 mt-2 px-2">
            {cardioChartData.map((day) => (
              <div key={day.name} className="flex flex-col items-center gap-1">
                <Flame
                  className={cn(
                    'h-4 w-4',
                    day.hiit ? 'text-orange-500 dark:text-orange-400' : 'text-muted-foreground/20'
                  )}
                />
                <span className="text-xs text-muted-foreground">{day.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <Scale className="mr-2" />
              Body Weight
            </CardTitle>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                placeholder={userProfile?.displayWeightUnit === 'lbs' ? 'lbs' : 'kg'}
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className="w-20 h-8 text-sm px-2 rounded-md border border-input bg-background"
              />
              <Button
                size="sm"
                disabled={isLoggingWeight || !weightInput}
                onClick={() => {
                  const val = parseFloat(weightInput);
                  if (isNaN(val) || val <= 0) return;
                  startWeightTransition(async () => {
                    const kg = userProfile?.displayWeightUnit === 'lbs' ? val * 0.453592 : val;
                    await addBodyWeightEntry(kg);
                    setWeightInput('');
                    toast({ title: 'Weight logged!' });
                  });
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                Log
              </Button>
            </div>
          </div>
          <CardDescription>Track your weight over time.</CardDescription>
        </CardHeader>
        <CardContent>
          {bodyWeightEntries.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={bodyWeightEntries.map((e) => ({
                date: format(new Date(e.date), 'MMM d'),
                weight: userProfile?.displayWeightUnit === 'lbs'
                  ? parseFloat((e.weight * 2.20462).toFixed(1))
                  : parseFloat(e.weight.toFixed(1)),
              }))}>
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} stroke="#888888" />
                <YAxis fontSize={12} tickLine={false} axisLine={false} stroke="#888888" domain={['auto', 'auto']} />
                <Tooltip formatter={(v) => [`${v} ${userProfile?.displayWeightUnit || 'kg'}`, 'Weight']} />
                <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : bodyWeightEntries.length === 1 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Log at least 2 entries to see your trend.</p>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No entries yet. Log your first weight above.</p>
          )}
          {bodyWeightEntries.length > 0 && (
            <div className="mt-4 space-y-1 max-h-40 overflow-y-auto">
              {[...bodyWeightEntries].reverse().map((e) => {
                const display = userProfile?.displayWeightUnit === 'lbs'
                  ? (e.weight * 2.20462).toFixed(1)
                  : e.weight.toFixed(1);
                return (
                  <div key={e.id} className="flex justify-between items-center text-sm px-2 py-1 rounded hover:bg-muted/50 group">
                    <span className="text-muted-foreground">{new Date(e.date).toLocaleDateString()}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{display} {userProfile?.displayWeightUnit || 'kg'}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deleteBodyWeightEntry(e.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="mr-2" />
            Workout History
          </CardTitle>
          <CardDescription>Review your past workout sessions.</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedWorkouts.length > 0 ? (
            <Accordion type="single" collapsible className="w-full space-y-2">
              {sortedWorkouts.map((workout) => (
                <AccordionItem
                  value={workout.id!}
                  key={workout.id!}
                  className="border rounded-lg bg-background"
                >
                  <AccordionPrimitive.Header className="flex items-center w-full">
                    <AccordionTrigger className="w-full text-base hover:no-underline px-4 py-3 text-left hover:bg-muted/50 rounded-t-lg data-[state=open]:rounded-b-none">
                      <div className="flex-1 text-left">
                        <span className="font-semibold">{workout.day}</span>
                        <p className="text-sm text-muted-foreground font-normal">
                          {new Date(workout.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </AccordionTrigger>
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center pr-4"
                    >
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <div
                            className={cn(
                              buttonVariants({
                                variant: 'ghost',
                                size: 'icon',
                              }),
                              'h-8 w-8 text-muted-foreground hover:text-destructive shrink-0'
                            )}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete Workout</span>
                          </div>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Are you absolutely sure?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this workout
                              session from your history. This action cannot be
                              undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteWorkout(workout.id!)}
                              disabled={isDeleting}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {isDeleting
                                ? 'Deleting...'
                                : 'Yes, delete it'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </AccordionPrimitive.Header>

                  <AccordionContent className="pb-4 px-4">
                    <div className="space-y-4">
                      {workout.exercises.map((exercise, exIndex) => (
                        <div key={exIndex} className="pt-2">
                          <h4 className="font-semibold text-card-foreground">
                            {exercise.exerciseName}
                          </h4>
                          {exercise.sets.some((s) => s.completed) ? (
                            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                              {exercise.sets
                                .filter((s) => s.completed)
                                .map((set, setIndex) => {
                                  const weightValue = set.weight;
                                  const displayUnit =
                                    userProfile?.displayWeightUnit || 'kg';
                                  let weightDisplay: string;

                                  if (typeof weightValue === 'number') {
                                    if (weightValue === 0) {
                                      weightDisplay = 'Bodyweight';
                                    } else {
                                      const displayWeightNum =
                                        displayUnit === 'lbs'
                                          ? (weightValue * 2.20462).toFixed(1)
                                          : weightValue.toFixed(1);
                                      weightDisplay = `${displayWeightNum} ${displayUnit}`;
                                    }
                                  } else if (
                                    typeof weightValue === 'string'
                                  ) {
                                    weightDisplay = weightValue;
                                  } else {
                                    weightDisplay = 'Bodyweight';
                                  }

                                  return (
                                    <li
                                      key={setIndex}
                                      className="flex justify-between items-center rounded-md p-2 bg-muted/50"
                                    >
                                      <span>
                                        Set {setIndex + 1}:{' '}
                                        <span className="font-medium text-foreground">
                                          {set.reps} reps
                                        </span>
                                      </span>
                                      <span className="font-medium text-foreground">
                                        {weightDisplay}
                                      </span>
                                    </li>
                                  );
                                })}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground mt-2">
                              No sets completed for this exercise.
                            </p>
                          )}
                          {exercise.notes && (
                            <p className="mt-2 text-xs italic text-muted-foreground">
                              Notes: {exercise.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Your completed workouts will appear here.
            </p>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!adjustment}
        onOpenChange={() => setAdjustment(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>AI Plan Adjustment Suggestion</AlertDialogTitle>
            <AlertDialogDescription className="max-h-[40vh] overflow-y-auto">
              {adjustment?.summary}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAcceptAdjustment}>
              Accept & Activate New Plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddPrDialog
        open={isAddPrDialogOpen}
        onOpenChange={setIsAddPrDialogOpen}
      />
      <ExerciseProgressDialog
        exerciseName={selectedExercise}
        onOpenChange={() => setSelectedExercise(null)}
        allRecords={personalRecords}
        allWorkouts={completedWorkouts}
        userProfile={userProfile}
      />
    </div>
  );
}
