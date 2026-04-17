'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Line, LineChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend } from 'recharts';
import type { PersonalRecord, CompletedWorkout, UserProfile } from '@/lib/types';
import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TrendingUp, BarChart2 } from 'lucide-react';

interface ExerciseProgressDialogProps {
  exerciseName: string | null;
  onOpenChange: (open: boolean) => void;
  allRecords: PersonalRecord[];
  allWorkouts: CompletedWorkout[];
  userProfile: UserProfile | null;
}

const chartConfig = {
  weight: {
    label: 'Weight',
    color: 'hsl(var(--primary))',
  },
  volume: {
    label: 'Volume',
    color: 'hsl(var(--accent))',
  },
} satisfies ChartConfig;


export function ExerciseProgressDialog({
  exerciseName,
  onOpenChange,
  allRecords,
  allWorkouts,
  userProfile,
}: ExerciseProgressDialogProps) {

  const { prHistory, volumeHistory } = useMemo(() => {
    if (!exerciseName) {
      return { prHistory: [], volumeHistory: [] };
    }

    // 1. Calculate PR History
    const relevantPrs = allRecords
      .filter((pr) => pr.exerciseName === exerciseName)
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    const prHistory = relevantPrs.map((pr) => {
        const displayWeight = userProfile?.displayWeightUnit === 'lbs'
            ? pr.weight * 2.20462
            : pr.weight;
        return {
            date: format(parseISO(pr.date), 'MMM d'),
            weight: parseFloat(displayWeight.toFixed(1)),
        }
    });

    // 2. Calculate Volume History
    const volumeHistory = allWorkouts
        .map(workout => {
            const exerciseLog = workout.exercises.find(ex => ex.exerciseName === exerciseName);
            if (!exerciseLog) return null;

            const totalVolume = exerciseLog.sets.reduce((sum, set) => {
                if (!set.completed) return sum;
                
                const reps = Number(set.reps) || 0;
                // set.weight is stored in KG.
                const weight = typeof set.weight === 'number' ? set.weight : 0;
                
                return sum + (reps * weight);
            }, 0);

            if (totalVolume === 0) return null;

            const displayVolume = userProfile?.displayWeightUnit === 'lbs'
                ? totalVolume * 2.20462
                : totalVolume;

            return {
                rawDate: parseISO(workout.date),
                date: format(parseISO(workout.date), 'MMM d'),
                volume: parseFloat(displayVolume.toFixed(0)),
            };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a,b) => a.rawDate.getTime() - b.rawDate.getTime());


    return { prHistory, volumeHistory };

  }, [exerciseName, allRecords, allWorkouts, userProfile]);

  const weightUnit = userProfile?.displayWeightUnit || 'kg';

  return (
    <Dialog open={!!exerciseName} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Progress for: {exerciseName}</DialogTitle>
          <DialogDescription>
            Visualize your performance over time for this exercise.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto space-y-6 pr-4 pt-2">
            {prHistory.length > 1 ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center text-lg">
                            <TrendingUp className="mr-2 text-primary" />
                            Personal Record Progression ({weightUnit})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[250px] w-full">
                            <LineChart data={prHistory} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                                <Legend />
                                <Line type="monotone" dataKey="weight" stroke="var(--color-weight)" activeDot={{ r: 8 }} />
                            </LineChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            ) : <div className="text-center py-8 text-sm text-muted-foreground">Log at least two PRs for this exercise to see a progression chart.</div>}
            
            {volumeHistory.length > 0 ? (
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center text-lg">
                            <BarChart2 className="mr-2 text-primary" />
                            Workout Volume (Total {weightUnit})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                         <ChartContainer config={chartConfig} className="h-[250px] w-full">
                             <BarChart data={volumeHistory} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                                <Legend />
                                <Bar dataKey="volume" fill="var(--color-volume)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            ): <div className="text-center py-8 text-sm text-muted-foreground">Complete a workout with this exercise to see your volume history.</div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
