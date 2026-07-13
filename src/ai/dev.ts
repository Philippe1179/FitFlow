'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-personalized-workout-plan.ts';
import '@/ai/flows/adjust-workout-plan-based-on-progress.ts';
import '@/ai/flows/get-exercise-explanation.ts';
import '@/ai/flows/suggest-alternative-exercise.ts';
import '@/ai/flows/generate-hiit-workout.ts';
