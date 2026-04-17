'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createWorkoutPlanAction } from '@/app/actions';
import { useContext, useTransition } from 'react';
import { AppContext } from '@/contexts/AppContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ChevronsUpDown, Wand2, Trash2, Save } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import type { UserProfile } from '@/lib/types';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
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

const formSchema = z
  .object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
    age: z.coerce.number().int().positive().min(13).max(100),
    weight: z.coerce.number().positive('Weight must be a positive number.'),
    weightUnit: z.enum(['kg', 'lbs']),
    heightUnit: z.enum(['cm', 'ft']),
    heightCm: z.coerce
      .number()
      .positive('Height must be a positive number.')
      .optional(),
    heightFt: z.coerce
      .number()
      .int()
      .positive('Feet must be a positive number.')
      .optional(),
    heightIn: z.coerce
      .number()
      .nonnegative('Inches must be a positive number.')
      .lt(12, 'Inches must be less than 12.')
      .optional(),
    fitnessGoals: z.string(),
    availableEquipment: z.string(),
    preferredWorkoutDays: z.string(),
    skillLevel: z.enum(['beginner', 'intermediate', 'advanced']),
    existingPlan: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Conditional validation for plan generation fields
    if (!data.existingPlan || data.existingPlan.trim() === '') {
      if (data.fitnessGoals.length < 10) {
        ctx.addIssue({
          code: 'custom',
          path: ['fitnessGoals'],
          message: 'Please describe your goals in at least 10 characters.',
        });
      }
      if (data.availableEquipment.length < 3) {
        ctx.addIssue({
          code: 'custom',
          path: ['availableEquipment'],
          message:
            'Please describe your equipment (e.g., "full gym", "bodyweight").',
        });
      }
      if (data.preferredWorkoutDays.length < 5) {
        ctx.addIssue({
          code: 'custom',
          path: ['preferredWorkoutDays'],
          message: 'Please describe your preferred days (e.g., "Mon, Wed, Fri").',
        });
      }
    }

    // Height validation
    if (data.heightUnit === 'cm' && !data.heightCm) {
      ctx.addIssue({
        path: ['heightCm'],
        message: 'Height in cm is required.',
        code: 'custom',
      });
    }
    if (data.heightUnit === 'ft') {
      if (data.heightFt === undefined || data.heightFt === null) {
        ctx.addIssue({
          path: ['heightFt'],
          message: 'Feet is required.',
          code: 'custom',
        });
      }
      if (data.heightIn === undefined || data.heightIn === null) {
        ctx.addIssue({
          path: ['heightIn'],
          message: 'Inches is required.',
          code: 'custom',
        });
      }
    }
  });

export default function OnboardingForm() {
  const [isPending, startTransition] = useTransition();
  const { setUserProfile, userProfile, addNewPlan, clearAllData } =
    useContext(AppContext);
  const router = useRouter();
  const { toast } = useToast();

  const defaultWeightUnit = userProfile?.displayWeightUnit || 'lbs';
  let defaultWeight;
  if (userProfile?.weight) {
    if (defaultWeightUnit === 'kg') {
      defaultWeight = userProfile.weight;
    } else {
      defaultWeight = userProfile.weight * 2.20462;
    }
  }

  const defaultHeightUnit = userProfile?.displayHeightUnit || 'ft';
  let defaultHeightCm, defaultHeightFt, defaultHeightIn;
  if (userProfile?.height) {
    if (defaultHeightUnit === 'cm') {
      defaultHeightCm = userProfile.height;
    } else {
      const totalInches = userProfile.height / 2.54;
      defaultHeightFt = Math.floor(totalInches / 12);
      defaultHeightIn = parseFloat((totalInches % 12).toFixed(1));
    }
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: userProfile?.name || '',
      age: userProfile?.age || 25,
      weight: defaultWeight ? parseFloat(defaultWeight.toFixed(1)) : 155,
      weightUnit: defaultWeightUnit,
      heightUnit: defaultHeightUnit,
      heightCm: defaultHeightCm ? parseFloat(defaultHeightCm.toFixed(1)) : 175,
      heightFt: defaultHeightFt || 5,
      heightIn: defaultHeightIn || 9,
      fitnessGoals: userProfile?.fitnessGoals || '',
      availableEquipment: userProfile?.availableEquipment || '',
      preferredWorkoutDays:
        userProfile?.preferredWorkoutDays || '3 times a week',
      skillLevel: userProfile?.skillLevel || 'beginner',
      existingPlan: userProfile?.existingPlan || '',
    },
  });
  
  const heightUnit = form.watch('heightUnit');
  const weightUnit = form.watch('weightUnit');

  function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      let weightInKg = values.weight;
      if (values.weightUnit === 'lbs') {
        weightInKg = values.weight * 0.453592;
      }

      let heightInCm = values.heightCm || 0;
      if (values.heightUnit === 'ft') {
        const totalInches =
          (values.heightFt || 0) * 12 + (values.heightIn || 0);
        heightInCm = totalInches * 2.54;
      }

      const profileData: UserProfile = {
        name: values.name,
        age: values.age,
        weight: weightInKg,
        height: heightInCm,
        displayWeightUnit: values.weightUnit,
        displayHeightUnit: values.heightUnit,
        fitnessGoals: values.fitnessGoals,
        availableEquipment: values.availableEquipment,
        preferredWorkoutDays: values.preferredWorkoutDays,
        skillLevel: values.skillLevel,
        existingPlan: values.existingPlan,
      };
      
      // Always save the profile first
      setUserProfile(profileData);

      const result = await createWorkoutPlanAction(profileData);
      if (result.success && result.data) {
        await addNewPlan(
          result.data,
          userProfile ? 'Regenerated Plan' : 'My First Plan',
          true
        );
        toast({
          title: 'Success!',
          description: 'Your new workout plan has been generated and activated.',
        });
        router.push('/');
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Could not generate workout plan.',
        });
      }
    });
  }
  
  const handleSaveProfile = () => {
    startTransition(async () => {
      const fieldsToValidate: (keyof z.infer<typeof formSchema>)[] = [
        'name', 'age', 'weight', 'weightUnit', 'heightUnit', 'skillLevel'
      ];
      if (form.getValues('heightUnit') === 'cm') {
          fieldsToValidate.push('heightCm');
      } else {
          fieldsToValidate.push('heightFt', 'heightIn');
      }
      
      const isValid = await form.trigger(fieldsToValidate);
      if (!isValid) {
        toast({
          variant: 'destructive',
          title: 'Invalid Profile Data',
          description: 'Please correct your core profile fields before saving.',
        });
        return;
      }

      const values = form.getValues();
      let weightInKg = values.weight;
      if (values.weightUnit === 'lbs') {
        weightInKg = values.weight * 0.453592;
      }

      let heightInCm = values.heightCm || 0;
      if (values.heightUnit === 'ft') {
        const totalInches = (values.heightFt || 0) * 12 + (values.heightIn || 0);
        heightInCm = totalInches * 2.54;
      }
      
      const updatedProfile: UserProfile = {
        ...userProfile!,
        name: values.name,
        age: values.age,
        weight: weightInKg,
        height: heightInCm,
        displayWeightUnit: values.weightUnit,
        displayHeightUnit: values.heightUnit,
        fitnessGoals: values.fitnessGoals,
        availableEquipment: values.availableEquipment,
        preferredWorkoutDays: values.preferredWorkoutDays,
        skillLevel: values.skillLevel,
        existingPlan: values.existingPlan,
        activePlanId: userProfile?.activePlanId,
      };

      setUserProfile(updatedProfile);
      toast({
        title: 'Profile Saved!',
        description: 'Your profile information has been updated.',
      });
      window.scrollTo(0, 0);
    });
  };

  const handleClearData = () => {
    startTransition(async () => {
      await clearAllData();
      form.reset({
        name: '',
        age: 25,
        weight: 155,
        weightUnit: 'lbs',
        heightUnit: 'ft',
        heightCm: 175,
        heightFt: 5,
        heightIn: 9,
        fitnessGoals: '',
        availableEquipment: '',
        preferredWorkoutDays: '3 times a week',
        skillLevel: 'beginner',
        existingPlan: '',
      });
      toast({
        title: 'Data Cleared',
        description: 'All your profile and workout data has been removed.',
      });
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Fitness Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel>Weight</FormLabel>
                <div className="flex items-center gap-4 mt-2">
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            {...field}
                            placeholder={
                              weightUnit === 'kg' ? 'e.g. 70' : 'e.g. 155'
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="weightUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex items-center space-x-4"
                          >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="kg" id="kg" />
                              </FormControl>
                              <FormLabel htmlFor="kg" className="font-normal">
                                kg
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="lbs" id="lbs" />
                              </FormControl>
                              <FormLabel htmlFor="lbs" className="font-normal">
                                lbs
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div>
                <FormLabel>Height</FormLabel>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex-1">
                    {heightUnit === 'cm' ? (
                      <FormField
                        control={form.control}
                        name="heightCm"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                placeholder="e.g. 175"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                          control={form.control}
                          name="heightFt"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  placeholder="ft"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="heightIn"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.1"
                                  {...field}
                                  placeholder="in"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                  <FormField
                    control={form.control}
                    name="heightUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex items-center space-x-4"
                          >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="cm" id="cm" />
                              </FormControl>
                              <FormLabel htmlFor="cm" className="font-normal">
                                cm
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="ft" id="ft" />
                              </FormControl>
                              <FormLabel htmlFor="ft" className="font-normal">
                                ft
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="skillLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skill Level</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your fitness level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">
                        Intermediate
                      </SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fitnessGoals"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fitness Goals</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., lose 10kg, build muscle, improve cardio for a 5k run"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Required for generating a new plan.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="availableEquipment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Available Equipment</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Full gym, dumbbells, or bodyweight only"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Required for generating a new plan. Enter 'bodyweight only'
                    if you have no equipment.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferredWorkoutDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Workout Days/Frequency</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Monday, Wednesday, Friday"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Required for generating a new plan.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button
                  variant="link"
                  className="px-0 flex items-center text-sm text-muted-foreground hover:text-primary"
                >
                  <ChevronsUpDown className="mr-2 h-4 w-4" />
                  Have an existing plan? (Optional)
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <FormField
                  control={form.control}
                  name="existingPlan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Existing Plan</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Paste your current workout plan here. Be as detailed as you can! For example:&#10;Monday: Chest Day&#10;- Bench Press: 3 sets of 5 reps&#10;- Incline Dumbbell Press: 3 sets of 8-10 reps&#10;..."
                          {...field}
                          rows={8}
                        />
                      </FormControl>
                      <FormDescription>
                        Our AI will parse your plan and structure it for the
                        app. If you provide a plan here, the fields above for goals, equipment, etc., become optional.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

            <div className="flex flex-col sm:flex-row-reverse sm:justify-start gap-2">
              <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                <Wand2 className="mr-2" />
                {isPending
                  ? 'Generating...'
                  : userProfile
                  ? 'Update & Regenerate Plan'
                  : 'Generate My Plan'}
              </Button>
              {userProfile && (
                <Button type="button" variant="secondary" onClick={handleSaveProfile} disabled={isPending} className="w-full sm:w-auto">
                  <Save className="mr-2"/>
                  {isPending ? 'Saving...' : 'Save Profile Only'}
                </Button>
              )}
               {userProfile && (
                <div className="sm:mr-auto">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="destructive" className="w-full sm:w-auto">
                        <Trash2 className="mr-2" />
                        Clear My Data
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete all your profile and workout data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearData} disabled={isPending}>
                          {isPending ? 'Clearing Data...' : 'Yes, delete my data'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
