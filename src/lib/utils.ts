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

// A day counts toward the streak if a strength workout was completed OR the
// day's cardio goal was met (steps >= goal, or a HIIT session was logged).
export function calculateStreak(
  completedWorkouts: CompletedWorkout[],
  activePlan: WorkoutPlan,
  cardioLogEntries: CardioLogEntry[] = [],
  dailyStepGoal: number = 10000
): number {
  const activeDates = new Map<string, Date>();
  completedWorkouts.forEach((w) => {
    const date = parseISO(w.date);
    activeDates.set(date.toDateString(), date);
  });

  const stepsByDate = new Map<string, number>();
  cardioLogEntries.forEach((e) => {
    const date = parseISO(e.date);
    const key = date.toDateString();
    if (e.type === 'steps') {
      stepsByDate.set(key, (stepsByDate.get(key) || 0) + (e.steps || 0));
    } else if (e.type === 'hiit') {
      activeDates.set(key, date);
    }
  });
  stepsByDate.forEach((steps, key) => {
    if (steps >= dailyStepGoal) {
      activeDates.set(key, new Date(key));
    }
  });

  if (activeDates.size === 0) return 0;

  const isRestDay = (date: Date) => {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const planForDay = activePlan.weeklyWorkoutPlan.find(
      (p) => p.day.toLowerCase() === dayName.toLowerCase()
    );
    return !planForDay || planForDay.exercises.length === 0;
  };

  const allGapDaysAreRest = (laterDate: Date, earlierDate: Date): boolean => {
    const diff = differenceInCalendarDays(laterDate, earlierDate);
    for (let j = 1; j < diff; j++) {
      if (!isRestDay(subDays(laterDate, j))) return false;
    }
    return true;
  };

  const sortedActiveDates = [...activeDates.values()].sort((a, b) => b.getTime() - a.getTime());

  const todayDate = new Date();
  const lastActiveDate = sortedActiveDates[0];
  if (!allGapDaysAreRest(todayDate, lastActiveDate)) return 0;

  let streak = 1;
  for (let i = 0; i < sortedActiveDates.length - 1; i++) {
    const current = sortedActiveDates[i];
    const previous = sortedActiveDates[i + 1];
    const dayDiff = differenceInCalendarDays(current, previous);

    if (dayDiff <= 0) continue;

    if (allGapDaysAreRest(current, previous)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
