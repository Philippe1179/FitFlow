'use client';

import { useContext, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { AppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import {
  Footprints,
  Plus,
  Trash2,
  Wand2,
  Flame,
  CheckCircle2,
  Circle,
  Play,
  History,
  Target,
  Pencil,
} from 'lucide-react';
import { NumberPickerDialog } from './NumberPickerDialog';
import { AddHiitWorkoutDialog } from './AddHiitWorkoutDialog';
import { ProgressRing } from './ProgressRing';
import { CelebrationCheck } from './CelebrationCheck';
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
import { useToast } from '@/hooks/use-toast';
import { createHiitWorkoutAction } from '@/app/actions';
import type { HiitWorkout } from '@/lib/types';
import { getTodayCardioStats } from '@/lib/utils';

export default function CardioView() {
  const {
    userProfile,
    setUserProfile,
    cardioLogEntries,
    addCardioLogEntry,
    deleteCardioLogEntry,
    hiitWorkouts,
    saveHiitWorkout,
    deleteHiitWorkout,
  } = useContext(AppContext);
  const { toast } = useToast();

  const [stepsInput, setStepsInput] = useState('');
  const [isLoggingSteps, startLoggingSteps] = useTransition();

  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const [dialogWorkout, setDialogWorkout] = useState<HiitWorkout | null>(null);

  const [durationInput, setDurationInput] = useState('15');
  const [generatePreferences, setGeneratePreferences] = useState('');
  const [isGenerating, startGenerating] = useTransition();

  const dailyStepGoal = userProfile?.dailyStepGoal || 10000;

  const { steps: todaySteps, didHiit: didHiitToday } = useMemo(
    () => getTodayCardioStats(cardioLogEntries),
    [cardioLogEntries]
  );

  const goalMetToday = todaySteps >= dailyStepGoal || didHiitToday;

  const [showGoalCelebration, setShowGoalCelebration] = useState(false);
  const wasGoalMetRef = useRef(goalMetToday);
  useEffect(() => {
    if (goalMetToday && !wasGoalMetRef.current) {
      setShowGoalCelebration(true);
      const timeout = setTimeout(() => setShowGoalCelebration(false), 2200);
      wasGoalMetRef.current = true;
      return () => clearTimeout(timeout);
    }
    wasGoalMetRef.current = goalMetToday;
  }, [goalMetToday]);

  const sortedHistory = useMemo(() => {
    return [...cardioLogEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [cardioLogEntries]);

  const handleSetGoal = (value: number) => {
    if (!userProfile) return;
    setUserProfile({ ...userProfile, dailyStepGoal: value });
  };

  const handleLogSteps = () => {
    const val = parseInt(stepsInput, 10);
    if (isNaN(val) || val <= 0) return;
    startLoggingSteps(async () => {
      await addCardioLogEntry({ type: 'steps', steps: val });
      setStepsInput('');
      toast({ title: 'Steps logged!' });
    });
  };

  const handleGenerate = () => {
    if (!userProfile) return;
    const duration = parseInt(durationInput, 10) || 15;
    startGenerating(async () => {
      const result = await createHiitWorkoutAction(
        userProfile,
        duration,
        generatePreferences || undefined
      );
      if (result.success && result.data) {
        setDialogWorkout({ ...result.data, source: 'ai' });
        setIsManualDialogOpen(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error,
        });
      }
    });
  };

  const handleSaveHiitWorkout = async (workout: HiitWorkout) => {
    await saveHiitWorkout(workout);
    toast({ title: 'HIIT Workout Saved!', description: workout.name });
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsManualDialogOpen(open);
    if (!open) setDialogWorkout(null);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tighter">Cardio</h1>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center">
                <Target className="mr-2 text-accent" />
                Today's Goal
              </CardTitle>
              <CardDescription>
                Hit your daily cardio goal with steps, or swap in a HIIT session.
              </CardDescription>
            </div>
            {goalMetToday ? (
              <div className="flex items-center gap-1 text-sm font-medium text-accent">
                <CheckCircle2 className="h-5 w-5" /> Goal Met
              </div>
            ) : (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Circle className="h-5 w-5" /> Not Yet
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <ProgressRing value={todaySteps} max={dailyStepGoal} size={104} strokeWidth={9}>
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold font-headline leading-none">
                  {todaySteps.toLocaleString()}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  / {dailyStepGoal.toLocaleString()}
                </span>
              </div>
            </ProgressRing>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Footprints className="h-4 w-4 text-accent" /> Steps today
              </div>
              <NumberPickerDialog
                title="Set Daily Step Goal"
                initialValue={dailyStepGoal}
                onSave={handleSetGoal}
                incrementSteps={[500, 1000, 2500]}
                trigger={
                  <Button variant="outline" size="sm">
                    Edit Goal
                  </Button>
                }
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Log steps..."
              value={stepsInput}
              onChange={(e) => setStepsInput(e.target.value)}
              className="max-w-[160px]"
            />
            <Button size="sm" disabled={isLoggingSteps || !stepsInput} onClick={handleLogSteps}>
              <Plus className="mr-1 h-4 w-4" /> Log Steps
            </Button>
          </div>
          {didHiitToday && (
            <p className="text-sm text-muted-foreground">
              You've already completed a HIIT session today — goal met either way.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex justify-between items-start flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center">
                <Flame className="mr-2 text-orange-500 dark:text-orange-400" />
                HIIT Workouts
              </CardTitle>
              <CardDescription>
                A high-intensity circuit is a great cardio-goal equivalent when you can't walk.
              </CardDescription>
            </div>
          </div>
          <Textarea
            value={generatePreferences}
            onChange={(e) => setGeneratePreferences(e.target.value)}
            placeholder='Equipment & preferences for AI generation (optional) — e.g. "I have a jump rope", "no exercises on the ground"'
            className="min-h-[50px] text-sm"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              type="number"
              value={durationInput}
              onChange={(e) => setDurationInput(e.target.value)}
              className="w-16 h-9"
              title="Target duration (minutes)"
            />
            <Button size="sm" variant="outline" onClick={handleGenerate} disabled={isGenerating}>
              <Wand2 className="mr-1 h-4 w-4" /> {isGenerating ? 'Generating...' : 'Generate with AI'}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setDialogWorkout(null);
                setIsManualDialogOpen(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" /> Create Manually
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {hiitWorkouts.length > 0 ? (
            hiitWorkouts.map((workout) => (
              <div
                key={workout.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{workout.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {workout.rounds} rounds &middot; {workout.intervals.length} exercises
                    {workout.source === 'ai' ? ' · AI-generated' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button asChild size="sm">
                    <Link href={`/cardio/hiit/${workout.id}`}>
                      <Play className="mr-1 h-4 w-4" /> Start
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setDialogWorkout(workout);
                      setIsManualDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                    <span className="sr-only">Edit {workout.name}</span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Delete {workout.name}</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{workout.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this HIIT workout. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => workout.id && deleteHiitWorkout(workout.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Yes, delete it
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No HIIT workouts yet. Generate one with AI or build your own.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="mr-2" />
            Cardio History
          </CardTitle>
          <CardDescription>Your logged steps and HIIT sessions.</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedHistory.length > 0 ? (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {sortedHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="flex justify-between items-center text-sm px-2 py-2 rounded hover:bg-muted/50 group"
                >
                  <div className="flex items-center gap-2">
                    {entry.type === 'steps' ? (
                      <Footprints className="h-4 w-4 text-accent" />
                    ) : (
                      <Flame className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                    )}
                    <span>
                      {entry.type === 'steps'
                        ? `${entry.steps?.toLocaleString()} steps`
                        : entry.hiitWorkoutName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      {new Date(entry.date).toLocaleDateString()}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => deleteCardioLogEntry(entry.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No cardio logged yet.
            </p>
          )}
        </CardContent>
      </Card>

      <AddHiitWorkoutDialog
        open={isManualDialogOpen}
        onOpenChange={handleDialogOpenChange}
        onSave={handleSaveHiitWorkout}
        initialWorkout={dialogWorkout}
        userProfile={userProfile}
      />

      {showGoalCelebration && createPortal(
        <div
          className="fixed inset-0 z-[110] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center gap-4 p-8 pointer-events-none"
        >
          <CelebrationCheck size={96} />
          <h2 className="text-3xl font-bold tracking-tighter">Daily Goal Met!</h2>
          <p className="text-muted-foreground text-center">Nice work hitting your cardio goal today.</p>
        </div>,
        document.body
      )}
    </div>
  );
}
