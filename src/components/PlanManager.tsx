'use client';

import { useContext, useState, useTransition } from 'react';
import { AppContext } from '@/contexts/AppContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import {
  CheckCircle,
  Circle,
  MoreVertical,
  Pencil,
  Trash2,
  Library,
} from 'lucide-react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { RenamePlanDialog } from './RenamePlanDialog';
import type { WorkoutPlan } from '@/lib/types';
import Link from 'next/link';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';

export default function PlanManager() {
  const { allPlans, activePlan, setActivePlan, deletePlan, savePlan } =
    useContext(AppContext);
  const [isActivating, startActivationTransition] = useTransition();
  const [isDeleting, startDeletionTransition] = useTransition();
  const [planToRename, setPlanToRename] = useState<WorkoutPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<WorkoutPlan | null>(null);
  const { toast } = useToast();

  const handleActivate = (planId: string) => {
    startActivationTransition(async () => {
      await setActivePlan(planId);
      toast({ title: 'Plan Activated!', description: 'Your active workout plan has been updated.' });
    });
  };

  const handleDelete = () => {
    if (!planToDelete) return;
    startDeletionTransition(async () => {
      await deletePlan(planToDelete.id!);
      setPlanToDelete(null);
    });
  };

  const handleRename = async (newName: string) => {
    if (!planToRename) return;
    const updatedPlan = { ...planToRename, name: newName };
    await savePlan(updatedPlan);
    toast({ title: 'Plan Renamed', description: `Your plan is now named "${newName}".`});
  };

  const handleRenameDialogOpenChange = (isOpen: boolean) => {
    // When the dialog requests to be closed, update the state.
    if (!isOpen) {
      setPlanToRename(null);
    }
  };

  if (allPlans.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <Card className="max-w-md w-full">
                <CardHeader>
                    <Library className="mx-auto h-12 w-12 text-muted-foreground" />
                    <CardTitle className="text-2xl font-bold">No Plans Yet</CardTitle>
                    <CardDescription className="mt-2">
                        You haven't created any workout plans. Go to your profile to generate your first one!
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/onboarding">Create a Plan</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
        <h1 className="text-3xl font-bold tracking-tighter flex items-center">
          <Library className="mr-3 text-primary" />
          Manage Your Plans
        </h1>
      </div>
      
      <Accordion type="single" collapsible className="w-full space-y-2">
        {allPlans.map((plan) => {
          const isActive = plan.id === activePlan?.id;
          return (
            <AccordionItem value={plan.id!} key={plan.id} className="border rounded-lg bg-background">
              <AccordionPrimitive.Header className="flex items-center w-full px-4 py-3 hover:bg-muted/50 rounded-t-lg data-[state=open]:rounded-b-none">
                <AccordionTrigger className="w-full text-base hover:no-underline p-0">
                    <div className="flex items-center gap-4">
                      {isActive ? (
                        <CheckCircle className="h-6 w-6 text-primary" />
                      ) : (
                        <Circle className="h-6 w-6 text-muted" />
                      )}
                      <span className="font-medium text-left">{plan.name}</span>
                    </div>
                </AccordionTrigger>
                <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
                    {!isActive && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleActivate(plan.id!)}
                        disabled={isActivating}
                      >
                        {isActivating ? 'Activating...' : 'Activate'}
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Plan options for {plan.name}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                         <DropdownMenuItem asChild>
                           <Link href={`/edit-plan/${plan.id!}`}>
                             <Pencil className="mr-2 h-4 w-4" />
                             <span>Edit</span>
                           </Link>
                         </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPlanToRename(plan)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          <span>Rename</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setPlanToDelete(plan)}
                          disabled={isActive}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
              </AccordionPrimitive.Header>
              <AccordionContent className="p-6 border-t">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {plan.weeklyWorkoutPlan.map((dayPlan) => (
                    <div key={dayPlan.day} className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-semibold">{dayPlan.day}</h4>
                      {dayPlan.exercises.length > 0 ? (
                        <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside space-y-1">
                          {dayPlan.exercises.map((ex) => (
                            <li key={ex.name} className="truncate">{ex.name}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground italic">Rest Day</p>
                      )}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <RenamePlanDialog
        open={!!planToRename}
        onOpenChange={handleRenameDialogOpenChange}
        currentName={planToRename?.name || ''}
        onSave={handleRename}
      />
      <AlertDialog
        open={!!planToDelete}
        onOpenChange={() => setPlanToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the workout plan "{planToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Yes, delete plan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
