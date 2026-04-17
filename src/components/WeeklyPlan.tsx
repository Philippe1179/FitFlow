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
import { ArrowRight, CalendarDays, Moon, CheckCircle2 } from 'lucide-react';
import { getTodayDayName } from '@/lib/utils';
import Image from 'next/image';
import { placeholderImages } from '@/lib/placeholder-images.json';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';

export default function WeeklyPlan() {
  const { activePlan, completedWorkouts } = useContext(AppContext);
  const today = getTodayDayName();

  const todayDate = new Date();
  const startOfCurrentWeek = startOfWeek(todayDate);
  const endOfCurrentWeek = endOfWeek(todayDate);

  const completedDaysThisWeek = new Set(
    completedWorkouts
      .filter((workout) => {
        const workoutDate = parseISO(workout.date);
        return isWithinInterval(workoutDate, {
          start: startOfCurrentWeek,
          end: endOfCurrentWeek,
        });
      })
      .map((workout) => workout.day)
  );

  if (!activePlan || activePlan.weeklyWorkoutPlan.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <Image
              src={
                placeholderImages[1]?.imageUrl ||
                'https://picsum.photos/seed/restday/600/400'
              }
              alt={placeholderImages[1]?.description || 'Rest day'}
              data-ai-hint={placeholderImages[1]?.imageHint || 'fitness rest'}
              width={600}
              height={400}
              className="rounded-t-lg object-cover"
            />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl font-bold">No Active Plan</CardTitle>
            <CardDescription className="mt-2">
              You don't have an active workout plan. Go to your profile to generate one or manage your plans.
            </CardDescription>
            <Button asChild className="mt-4">
              <Link href="/onboarding">Create a Plan</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allDays = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter flex items-center">
            <CalendarDays className="mr-2 text-primary" />
            Your Weekly Plan
          </h1>
          <p className="text-muted-foreground">
            Currently active plan: <span className="font-semibold text-primary">{activePlan.name}</span>
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {allDays.map((day) => {
          const planForDay = activePlan.weeklyWorkoutPlan.find(
            (p) => p.day.toLowerCase() === day.toLowerCase()
          );
          const isToday = day.toLowerCase() === today.toLowerCase();
          const isRestDay = !planForDay || planForDay.exercises.length === 0;
          const isCompleted = completedDaysThisWeek.has(day);

          return (
            <Card
              key={day}
              className={`flex flex-col ${
                isToday ? 'border-primary ring-2 ring-primary' : ''
              } ${
                isCompleted ? 'bg-green-50/50 dark:bg-green-900/20' : ''
              }`}
            >
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {day}
                    {isCompleted && (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
                    )}
                  </div>
                  {isToday && (
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                      TODAY
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                {isRestDay ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Moon className="w-10 h-10 text-muted-foreground mb-2" />
                    <h3 className="font-semibold">Rest Day</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {planForDay?.notes ||
                        planForDay?.cardio ||
                        'Enjoy your recovery.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <CardDescription>
                      {planForDay.exercises.length} exercises planned.
                    </CardDescription>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                      {planForDay.exercises.slice(0, 3).map((ex) => (
                        <li key={ex.name} className="truncate">
                          {ex.name}
                        </li>
                      ))}
                      {planForDay.exercises.length > 3 && (
                        <li>...and more</li>
                      )}
                    </ul>
                  </>
                )}
              </CardContent>
              {planForDay && (
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href={`/workout/${day}`}>
                      {isRestDay ? 'View Suggestions' : 'View Workout'}{' '}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
