'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';

interface RenamePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  onSave: (newName: string) => Promise<void>;
}

export function RenamePlanDialog({ open, onOpenChange, currentName, onSave }: RenamePlanDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState(currentName);
  const [isSaving, startSavingTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setName(currentName);
    }
  }, [open, currentName]);

  const handleSave = () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Invalid Name',
        description: 'Plan name cannot be empty.',
      });
      return;
    }

    startSavingTransition(async () => {
        try {
            await onSave(name.trim());
            onOpenChange(false); // Close dialog on success
        } catch (e) {
            console.error('Failed to save plan name:', e);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not rename the plan. Please try again.',
            });
        }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rename Workout Plan</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="plan-name" className="text-right">
              Name
            </Label>
            <Input
              id="plan-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              disabled={isSaving}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Name'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
