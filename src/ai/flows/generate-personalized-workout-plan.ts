'use server';
/**
 * @fileOverview A Genkit flow for generating personalized weekly workout plans.
 *
 * - generateWorkoutPlan - A function that handles the workout plan generation process.
 * - GenerateWorkoutPlanInput - The input type for the generateWorkoutPlan function.
 * - GenerateWorkoutPlanOutput - The return type for the generateWorkoutPlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateWorkoutPlanInputSchema = z.object({
  age: z.number().int().positive().describe('The user\u0027s age in years.'),
  weight: z
    .number()
    .positive()
    .describe('The user\u0027s weight in kilograms.'),
  height: z
    .number()
    .positive()
    .describe('The user\u0027s height in centimeters.'),
  fitnessGoals: z
    .string()
    .describe(
      'The user\u0027s primary fitness goals (e.g., \u0022muscle gain\u0022, \u0022weight loss\u0022, \u0022endurance\u0022, \u0022general fitness\u0022).'
    ),
  availableEquipment: z
    .string()
    .describe(
      'A comma-separated list of available fitness equipment (e.g., \u0022dumbbells, resistance bands\u0022, \u0022full gym\u0022, \u0022bodyweight only\u0022).'
    ),
  preferredWorkoutDays: z
    .string()
    .describe(
      'A description of the user\u0027s preferred workout days (e.g., \u0022Monday, Wednesday, Friday\u0022, \u00223-4 times a week\u0022, \u0022daily\u0022).'
    ),
  skillLevel: z
    .string()
    .describe(
      'The user\u0027s current fitness skill level (e.g., \u0022beginner\u0022, \u0022intermediate\u0022, \u0022advanced\u0022).'
    ),
  optionalFeatures: z
    .string()
    .optional()
    .describe(
      'Optional features to include, such as \u0022light cardio suggestions, warm-ups, cool-downs\u0022 or \u0022none\".'
    ),
    existingPlan: z.string().optional().describe('An existing workout plan provided by the user, which should be parsed and formatted.'),
});
export type GenerateWorkoutPlanInput = z.infer<
  typeof GenerateWorkoutPlanInputSchema
>;

const WorkoutExerciseSchema = z.object({
  name: z.string().describe('The name of the exercise (e.g., \u0022Push-ups\u0022).'),
  sets: z.number().int().positive().describe('The number of sets for the exercise.'),
  reps: z
    .string()
    .describe('The repetition range or count (e.g., \u00228-12\u0022, \u002210\u0022, \u0022AMRAP\u0022).'),
  weightOrOption: z
    .string()
    .describe(
      'Suggested weight or bodyweight option (e.g., \u0022bodyweight\u0022, \u002220kg dumbbells\u0022, \u0022resistance band\u0022).'
    ),
});

const WorkoutDayPlanSchema = z.object({
  day: z.string().describe('The day of the week for this workout (e.g., \u0022Monday\u0022).'),
  warmUp: z.string().optional().describe('Suggested warm-up routine for the day.'),
  cardio: z.string().optional().describe('Suggested light cardio for the day.'),
  exercises: z
    .array(WorkoutExerciseSchema)
    .describe('A list of exercises for the day, including sets, reps, and weights/options.'),
  coolDown: z.string().optional().describe('Suggested cool-down routine for the day.'),
  notes: z
    .string()
    .optional()
    .describe('Any additional notes or tips for this specific workout day.'),
});

const GenerateWorkoutPlanOutputSchema = z.object({
  weeklyWorkoutPlan: z
    .array(WorkoutDayPlanSchema)
    .describe('A personalized weekly workout plan, day by day.'),
});
export type GenerateWorkoutPlanOutput = z.infer<
  typeof GenerateWorkoutPlanOutputSchema
>;

export async function generateWorkoutPlan(
  input: GenerateWorkoutPlanInput
): Promise<GenerateWorkoutPlanOutput> {
  return generateWorkoutPlanFlow(input);
}

const workoutPlanPrompt = ai.definePrompt({
  name: 'generateWorkoutPlanPrompt',
  input: { schema: GenerateWorkoutPlanInputSchema },
  output: { schema: GenerateWorkoutPlanOutputSchema },
  prompt: `You are an AI assistant that structures workout plans into a JSON format. Your primary role is to accurately convert user-provided text into a structured 7-day workout plan.

**CRITICAL INSTRUCTIONS:**

1.  **If an 'existingPlan' is provided:**
    - Your **only** task is to parse the 'existingPlan' text and structure it precisely into the 7-day JSON format as provided.
    - **DO NOT CHANGE THE EXERCISES.** If the user writes "Bench Press", the output exercise name must be "Bench Press".
    - **DO NOT substitute exercises** or change them to bodyweight alternatives, even if other fields like 'availableEquipment' suggest limitations.
    - **IGNORE other profile fields** like 'fitnessGoals', 'skillLevel', and 'availableEquipment' when a detailed 'existingPlan' is present. The user's plan is the absolute source of truth.
    - You may use other fields only to add minor details like warm-ups or cool-downs if requested and not specified, but the core exercises, sets, and reps from the 'existingPlan' must remain untouched.

2.  **If 'existingPlan' is NOT provided:**
    - In this case only, you will act as a fitness coach and generate a new, personalized 7-day workout plan based on the user's complete profile information (age, goals, equipment, etc.).

**User's Existing Plan (if any):**
{{{existingPlan}}}

**User's Profile Information (to be used ONLY if no existing plan is provided):**
- Age: {{{age}}} years
- Weight: {{{weight}}} kg
- Height: {{{height}}} cm
- Fitness Goals: {{{fitnessGoals}}}
- Available Equipment: {{{availableEquipment}}}
- Preferred Workout Days: {{{preferredWorkoutDays}}}
- Skill Level: {{{skillLevel}}}
- Optional Features Requested: {{{optionalFeatures}}}

**JSON Output Requirements:**

For workout days:
- Include a warm-up routine.
- Include a list of exercises with name, sets, reps, and weight/option.
- Include a cool-down routine.
- Add specific notes if necessary.

For "Rest Days":
- The 'exercises' array MUST be empty.
- Set the 'day' to the name of the rest day (e.g., "Tuesday").
- Provide suggestions for active recovery in the 'cardio', 'coolDown' (for stretching/mobility), and/or 'notes' fields. Examples: light walk, foam rolling, stretching, yoga.

Ensure the final plan covers all 7 days of the week.

Provide the output in the specified JSON format.`,
});

const generateWorkoutPlanFlow = ai.defineFlow(
  {
    name: 'generateWorkoutPlanFlow',
    inputSchema: GenerateWorkoutPlanInputSchema,
    outputSchema: GenerateWorkoutPlanOutputSchema,
  },
  async (input) => {
    const { output } = await workoutPlanPrompt(input);
    if (!output) {
      throw new Error('Failed to generate workout plan: No output received.');
    }
    return output;
  }
);
