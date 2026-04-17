'use server';

import { adjustWorkoutPlanBasedOnProgress } from '@/ai/flows/adjust-workout-plan-based-on-progress';
import { getExerciseExplanation } from '@/ai/flows/get-exercise-explanation';
import { generateWorkoutPlan } from '@/ai/flows/generate-personalized-workout-plan';
import { suggestAlternativeExercise } from '@/ai/flows/suggest-alternative-exercise';
import type {
  CompletedWorkout,
  UserProfile,
  WorkoutDayPlan,
  WorkoutPlan,
} from '@/lib/types';

export async function createWorkoutPlanAction(profile: UserProfile) {
  try {
    const { displayWeightUnit, displayHeightUnit, ...apiProfile } = profile;
    const plan = await generateWorkoutPlan({
      ...apiProfile,
      optionalFeatures: 'warm-ups, cool-downs, light cardio suggestions',
    });
    return { success: true, data: plan };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to generate workout plan.' };
  }
}

export async function adjustWorkoutPlanAction(
  userProfile: UserProfile,
  currentPlan: WorkoutPlan,
  completedWorkouts: CompletedWorkout[]
) {
  try {
    const result = await adjustWorkoutPlanBasedOnProgress({
      userProfileJson: JSON.stringify(userProfile),
      currentWorkoutPlanJson: JSON.stringify(currentPlan),
      completedWorkoutsJson: JSON.stringify(completedWorkouts),
    });

    const adjustedPlan = JSON.parse(result.adjustedWorkoutPlanJson);
    
    return {
      success: true,
      data: {
        adjustedWorkoutPlan: adjustedPlan,
        adjustmentSummary: result.adjustmentSummary,
      },
    };
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Failed to adjust workout plan.';
    return { success: false, error: message };
  }
}

export async function getExerciseExplanationAction(exerciseName: string) {
  try {
    const result = await getExerciseExplanation({ exerciseName });
    return { success: true, data: result.explanation };
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to get exercise explanation.';
    return { success: false, error: message };
  }
}

export async function suggestAlternativeExerciseAction(
  exerciseToReplace: string,
  userProfile: UserProfile,
  currentWorkout: WorkoutDayPlan
) {
  try {
    const result = await suggestAlternativeExercise({
      exerciseToReplace,
      userProfileJson: JSON.stringify(userProfile),
      currentWorkoutJson: JSON.stringify(currentWorkout),
    });
    return { success: true, data: result };
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to get exercise suggestion.';
    return { success: false, error: message };
  }
}
