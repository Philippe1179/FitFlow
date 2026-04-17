import type { GenerateWorkoutPlanOutput } from '@/ai/flows/generate-personalized-workout-plan';

export type UserProfile = {
  id?: string; // UID from Firebase Auth
  name: string;
  age: number;
  weight: number; // always in kg
  height: number; // always in cm
  displayWeightUnit: 'kg' | 'lbs';
  displayHeightUnit: 'cm' | 'ft';
  fitnessGoals: string;
  availableEquipment: string;
  preferredWorkoutDays: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  existingPlan?: string;
  activePlanId?: string;
};

export type WorkoutPlan = GenerateWorkoutPlanOutput & {
  id?: string;
  name: string;
};
export type WorkoutDayPlan = WorkoutPlan['weeklyWorkoutPlan'][number];
export type Exercise = WorkoutDayPlan['exercises'][number];

export interface ExerciseLog {
  exerciseName: string;
  sets: {
    reps: number | string;
    weight: number | string;
    completed: boolean;
  }[];
  notes?: string;
}

export interface CompletedWorkout {
  id?: string; // Firestore document ID
  date: string; // ISO string
  day: string;
  exercises: ExerciseLog[];
  weightUnitStored?: 'kg';
}

export type BodyWeightEntry = {
  id: string;
  weight: number; // stored in kg
  date: string; // ISO string
};

export type PersonalRecord = {
  id: string;
  exerciseName: string;
  weight: number; // Stored in kg
  reps: number;
  date: string; // ISO string
};
