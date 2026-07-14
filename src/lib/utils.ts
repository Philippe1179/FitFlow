import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInCalendarDays, parseISO, subDays } from 'date-fns';
import type { CardioLogEntry, CompletedWorkout, WorkoutPlan } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getTodayDayName() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

export function isSameDay(isoA: string, isoB: string): boolean {
  return new Date(isoA).toDateString() === new Date(isoB).toDateString();
}

export function getTodayCardioStats(entries: CardioLogEntry[]) {
  const today = new Date().toISOString();
  const steps = entries
    .filter((e) => e.type === 'steps' && isSameDay(e.date, today))
    .reduce((sum, e) => sum + (e.steps || 0), 0);
  const didHiit = entries.some((e) => e.type === 'hiit' && isSameDay(e.date, today));
  return { steps, didHiit };
}

export function calculateStreak(completedWorkouts: CompletedWorkout[], activePlan: WorkoutPlan): number {
  if (completedWorkouts.length === 0) return 0;

  const sorted = [...completedWorkouts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const todayDate = new Date();
  const lastWorkoutDate = parseISO(sorted[0].date);
  const daysSinceLast = differenceInCalendarDays(todayDate, lastWorkoutDate);

  let restDaysSinceLast = 0;
  for (let i = 1; i < daysSinceLast; i++) {
    const dateToCheck = subDays(todayDate, i);
    const dayName = dateToCheck.toLocaleDateString('en-US', { weekday: 'long' });
    const planForDay = activePlan.weeklyWorkoutPlan.find(p => p.day.toLowerCase() === dayName.toLowerCase());
    if (!planForDay || planForDay.exercises.length === 0) restDaysSinceLast++;
  }

  if (daysSinceLast - restDaysSinceLast > 1) return 0;

  let streak = 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    const currentWorkoutDate = parseISO(sorted[i].date);
    const prevWorkoutDate = parseISO(sorted[i + 1].date);
    const dayDiff = differenceInCalendarDays(currentWorkoutDate, prevWorkoutDate);

    if (dayDiff <= 0) continue;

    let restDaysBetween = 0;
    for (let j = 1; j < dayDiff; j++) {
      const dateToCheck = subDays(currentWorkoutDate, j);
      const dayName = dateToCheck.toLocaleDateString('en-US', { weekday: 'long' });
      const planForDay = activePlan.weeklyWorkoutPlan.find(p => p.day.toLowerCase() === dayName.toLowerCase());
      if (!planForDay || planForDay.exercises.length === 0) restDaysBetween++;
    }

    if (dayDiff - restDaysBetween === 1) streak++;
    else break;
  }

  return streak;
}
