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
import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { HiitWorkout, HiitInterval } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface AddHiitWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (workout: HiitWorkout) => void;
  initialWorkout?: HiitWorkout | null;
}

const emptyInterval = (): HiitInterval => ({
  name: '',
  workSeconds: 30,
  restSeconds: 15,
});

export function AddHiitWorkoutDialog({
  open,
  onOpenChange,
  onSave,
  initialWorkout,
}: AddHiitWorkoutDialogProps) {
  const isReviewMode = !!initialWorkout;
  const [name, setName] = useState('');
  const [rounds, setRounds] = useState('3');
  const [intervals, setIntervals] = useState<HiitInterval[]>([emptyInterval()]);
  const { toast } = useToast();

  useEffect(() => {
    if (open && initialWorkout) {
      setName(initialWorkout.name);
      setRounds(String(initialWorkout.rounds));
      setIntervals(
        initialWorkout.intervals.length > 0 ? initialWorkout.intervals : [emptyInterval()]
      );
    } else if (open && !initialWorkout) {
      setName('');
      setRounds('3');
      setIntervals([emptyInterval()]);
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

    onSave({
      ...(initialWorkout?.id ? { id: initialWorkout.id } : {}),
      name,
      rounds: roundsNum,
      intervals: validIntervals,
      source: initialWorkout?.source || 'manual',
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isReviewMode ? 'Review AI-Generated Workout' : 'Create HIIT Workout'}</DialogTitle>
          <DialogDescription>
            {isReviewMode
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
                className="grid grid-cols-[1fr,auto,auto,auto] items-center gap-2 rounded-md border p-2"
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
                  onClick={() => removeInterval(index)}
                  disabled={intervals.length === 1}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Columns: exercise name, work (seconds), rest (seconds).
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save HIIT Workout</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
