'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, Loader2, Info } from 'lucide-react';
import type { HiitWorkout, HiitInterval, UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { suggestHiitIntervalAction } from '@/app/actions';
import { ExerciseExplanationDialog } from './ExerciseExplanationDialog';

interface AddHiitWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (workout: HiitWorkout) => void;
  initialWorkout?: HiitWorkout | null;
  userProfile: UserProfile | null;
}

const DEFAULTS_STORAGE_KEY = 'hiit-last-used-defaults';

type HiitDefaults = {
  workSeconds: number;
  restSeconds: number;
  restBetweenRoundsSeconds: number;
};

const FALLBACK_DEFAULTS: HiitDefaults = {
  workSeconds: 30,
  restSeconds: 15,
  restBetweenRoundsSeconds: 30,
};

const getStoredDefaults = (): HiitDefaults => {
  if (typeof window === 'undefined') return FALLBACK_DEFAULTS;
  try {
    const raw = localStorage.getItem(DEFAULTS_STORAGE_KEY);
    if (raw) return { ...FALLBACK_DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return FALLBACK_DEFAULTS;
};

const setStoredDefaults = (defaults: HiitDefaults) => {
  try {
    localStorage.setItem(DEFAULTS_STORAGE_KEY, JSON.stringify(defaults));
  } catch {}
};

const emptyInterval = (): HiitInterval => {
  const defaults = getStoredDefaults();
  return { name: '', workSeconds: defaults.workSeconds, restSeconds: defaults.restSeconds };
};

export function AddHiitWorkoutDialog({
  open,
  onOpenChange,
  onSave,
  initialWorkout,
  userProfile,
}: AddHiitWorkoutDialogProps) {
  const isEditingSaved = !!initialWorkout?.id;
  const isReviewMode = !!initialWorkout && !isEditingSaved;
  const [name, setName] = useState('');
  const [rounds, setRounds] = useState('3');
  const [restBetweenRounds, setRestBetweenRounds] = useState('30');
  const [intervals, setIntervals] = useState<HiitInterval[]>([emptyInterval()]);
  const [rerollPreferences, setRerollPreferences] = useState('');
  const [rerollingIndex, setRerollingIndex] = useState<number | null>(null);
  const [explainingExercise, setExplainingExercise] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && initialWorkout) {
      setName(initialWorkout.name);
      setRounds(String(initialWorkout.rounds));
      setRestBetweenRounds(String(initialWorkout.restBetweenRoundsSeconds ?? 30));
      setIntervals(
        initialWorkout.intervals.length > 0 ? initialWorkout.intervals : [emptyInterval()]
      );
    } else if (open && !initialWorkout) {
      setName('');
      setRounds('3');
      setRestBetweenRounds(String(getStoredDefaults().restBetweenRoundsSeconds));
      setIntervals([emptyInterval()]);
    }
    if (open) {
      setRerollPreferences('');
      setRerollingIndex(null);
    }
  }, [open, initialWorkout]);

  const updateInterval = (
    index: number,
    field: keyof HiitInterval,
    value: string
  ) => {
    setIntervals((prev) =>
      prev.map((interval, i) => {
        if (i !== index) return interval;
        if (field === 'name') return { ...interval, name: value };
        const numeric = parseInt(value, 10);
        return { ...interval, [field]: isNaN(numeric) ? 0 : numeric };
      })
    );
  };

  const addInterval = () => {
    setIntervals((prev) => [...prev, emptyInterval()]);
  };

  const removeInterval = (index: number) => {
    setIntervals((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReroll = async (index: number) => {
    if (!userProfile) return;
    const target = intervals[index];
    if (!target.name.trim()) return;
    setRerollingIndex(index);
    try {
      const result = await suggestHiitIntervalAction(
        target.name,
        userProfile,
        { name: name || 'HIIT Workout', rounds: parseInt(rounds, 10) || 1, intervals },
        rerollPreferences || undefined
      );
      if (result.success && result.data) {
        setIntervals((prev) =>
          prev.map((interval, i) => (i === index ? result.data!.interval : interval))
        );
        toast({ title: `Swapped in "${result.data.interval.name}"`, description: result.data.reasoning });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } finally {
      setRerollingIndex(null);
    }
  };

  const handleSave = () => {
    const roundsNum = parseInt(rounds, 10);
    const validIntervals = intervals.filter((i) => i.name.trim());

    if (!name.trim() || isNaN(roundsNum) || roundsNum <= 0 || validIntervals.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Input',
        description: 'Please provide a workout name, valid rounds, and at least one named interval.',
      });
      return;
    }

    if (validIntervals.some((i) => i.workSeconds <= 0)) {
      toast({
        variant: 'destructive',
        title: 'Invalid Input',
        description: 'Every interval needs a work time greater than 0 seconds.',
      });
      return;
    }

    const restBetweenRoundsNum = parseInt(restBetweenRounds, 10);
    const restBetweenRoundsSeconds = isNaN(restBetweenRoundsNum) ? 0 : Math.max(0, restBetweenRoundsNum);

    const lastInterval = validIntervals[validIntervals.length - 1];
    setStoredDefaults({
      workSeconds: lastInterval.workSeconds,
      restSeconds: lastInterval.restSeconds,
      restBetweenRoundsSeconds,
    });

    onSave({
      ...(initialWorkout?.id ? { id: initialWorkout.id } : {}),
      name,
      rounds: roundsNum,
      intervals: validIntervals,
      restBetweenRoundsSeconds,
      source: initialWorkout?.source || 'manual',
    });

    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEditingSaved
                ? 'Edit HIIT Workout'
                : isReviewMode
                ? 'Review AI-Generated Workout'
                : 'Create HIIT Workout'}
            </DialogTitle>
            <DialogDescription>
              {isEditingSaved
                ? 'Update this workout — changes apply when you save.'
                : isReviewMode
                ? 'Edit anything before saving — nothing is saved yet.'
                : 'Build a work/rest circuit to repeat for a set number of rounds.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="hiit-name" className="text-right">
                Name
              </Label>
              <Input
                id="hiit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="e.g. Rainy Day Cardio Blast"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="hiit-rounds" className="text-right">
                Rounds
              </Label>
              <Input
                id="hiit-rounds"
                type="number"
                value={rounds}
                onChange={(e) => setRounds(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="hiit-round-rest" className="text-right">
                Rest Between Rounds
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="hiit-round-rest"
                  type="number"
                  value={restBetweenRounds}
                  onChange={(e) => setRestBetweenRounds(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">seconds — separate from each exercise's own rest below</span>
              </div>
            </div>

            {userProfile && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="hiit-reroll-prefs" className="text-right pt-2">
                  AI Preferences
                </Label>
                <Textarea
                  id="hiit-reroll-prefs"
                  value={rerollPreferences}
                  onChange={(e) => setRerollPreferences(e.target.value)}
                  className="col-span-3 min-h-[60px]"
                  placeholder='e.g. "I have a jump rope", "no exercises on the ground"'
                />
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Intervals (one circuit lap)</Label>
                <Button variant="outline" size="sm" onClick={addInterval}>
                  <Plus className="mr-1 h-4 w-4" /> Add Interval
                </Button>
              </div>
              {intervals.map((interval, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[1fr,auto,auto,auto,auto,auto] items-center gap-2 rounded-md border p-2"
                >
                  <Input
                    value={interval.name}
                    onChange={(e) => updateInterval(index, 'name', e.target.value)}
                    placeholder="Exercise name"
                  />
                  <Input
                    type="number"
                    value={interval.workSeconds}
                    onChange={(e) => updateInterval(index, 'workSeconds', e.target.value)}
                    className="w-16"
                    title="Work seconds"
                  />
                  <Input
                    type="number"
                    value={interval.restSeconds}
                    onChange={(e) => updateInterval(index, 'restSeconds', e.target.value)}
                    className="w-16"
                    title="Rest seconds"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => setExplainingExercise(interval.name)}
                    disabled={!interval.name.trim()}
                    title="What is this exercise?"
                  >
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="sr-only">Explain {interval.name}</span>
                  </Button>
                  {userProfile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => handleReroll(index)}
                      disabled={rerollingIndex !== null || !interval.name.trim()}
                      title="Reroll this exercise with AI"
                    >
                      {rerollingIndex === index ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <RefreshCw className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="sr-only">Reroll {interval.name}</span>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => removeInterval(index)}
                    disabled={intervals.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="sr-only">Remove {interval.name || 'interval'}</span>
                  </Button>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Columns: exercise name, work (seconds), rest (seconds).
                {userProfile && ' Use the reroll icon to get an AI-suggested swap for one exercise.'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{isEditingSaved ? 'Save Changes' : 'Save HIIT Workout'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ExerciseExplanationDialog
        exerciseName={explainingExercise}
        onOpenChange={(open) => !open && setExplainingExercise(null)}
      />
    </>
  );
}
