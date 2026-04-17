'use client';

import { useState, useEffect, useContext, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext } from '@/contexts/AppContext';
import type { WorkoutPlan, Exercise } from '@/lib/types';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { AddExerciseDialog } from './AddExerciseDialog';
import { ArrowUp, ArrowDown, Trash2, Plus, Save, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function EditPlanView({ planId }: { planId: string }) {
    const { allPlans, savePlan } = useContext(AppContext);
    const router = useRouter();
    const { toast } = useToast();

    const [plan, setPlan] = useState<WorkoutPlan | null>(null);
    const [isSaving, startSaveTransition] = useTransition();
    
    const [isAddExerciseDialogOpen, setIsAddExerciseDialogOpen] = useState(false);
    const [dayToAddExercise, setDayToAddExercise] = useState<string | null>(null);

    useEffect(() => {
        const planToEdit = allPlans.find(p => p.id === planId);
        if (planToEdit) {
            setPlan(JSON.parse(JSON.stringify(planToEdit)));
        } else if (allPlans.length > 0) {
            // If planId is invalid, maybe redirect or show an error
            // For now, just logging it.
            console.error("Plan not found");
            router.push('/plans');
        }
    }, [planId, allPlans, router]);

    const handleExerciseListChange = (day: string, exercises: Exercise[]) => {
        if (!plan) return;
        const newWeeklyPlan = plan.weeklyWorkoutPlan.map(d => 
            d.day === day ? { ...d, exercises } : d
        );
        setPlan({ ...plan, weeklyWorkoutPlan: newWeeklyPlan });
    };

    const handleDeleteExercise = (day: string, exerciseIndex: number) => {
        const dayPlan = plan?.weeklyWorkoutPlan.find(d => d.day === day);
        if (!dayPlan) return;
        const newExercises = dayPlan.exercises.filter((_, i) => i !== exerciseIndex);
        handleExerciseListChange(day, newExercises);
    };

    const handleMoveExercise = (day: string, index: number, direction: 'up' | 'down') => {
        const dayPlan = plan?.weeklyWorkoutPlan.find(d => d.day === day);
        if (!dayPlan) return;
        const newExercises = [...dayPlan.exercises];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= newExercises.length) return;

        [newExercises[index], newExercises[newIndex]] = [newExercises[newIndex], newExercises[index]];
        handleExerciseListChange(day, newExercises);
    };

    const handleAddExercise = (day: string, newExercise: Exercise) => {
        const dayPlan = plan?.weeklyWorkoutPlan.find(d => d.day === day);
        if (!dayPlan) return;
        const newExercises = [...dayPlan.exercises, newExercise];
        handleExerciseListChange(day, newExercises);
        setIsAddExerciseDialogOpen(false);
    };

    const handleSavePlan = () => {
        if (!plan) return;
        startSaveTransition(async () => {
            await savePlan(plan);
            toast({ title: 'Plan Saved!', description: `Changes to "${plan.name}" have been saved.` });
            router.push('/plans');
        });
    };

    if (!plan) {
        return <div className="p-6">Loading plan editor...</div>;
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                <div>
                    <Button asChild variant="ghost" className="mb-2 -ml-4">
                        <Link href="/plans">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Plans
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tighter">Editing: <span className="text-primary">{plan.name}</span></h1>
                </div>

                <Button onClick={handleSavePlan} disabled={isSaving}>
                    <Save className="mr-2"/>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>

            <Accordion type="multiple" className="w-full space-y-2" defaultValue={plan.weeklyWorkoutPlan.map(d => d.day)}>
                {plan.weeklyWorkoutPlan.map(dayPlan => (
                <AccordionItem value={dayPlan.day} key={dayPlan.day} className="border rounded-lg bg-background">
                    <AccordionTrigger className="px-4 py-3 text-lg hover:no-underline">{dayPlan.day}</AccordionTrigger>
                    <AccordionContent className="px-6 pb-6 border-t">
                    <div className="space-y-2 pt-4">
                        {dayPlan.exercises.map((ex, index) => (
                        <Card key={index} className="flex items-center p-3 justify-between shadow-sm">
                            <div>
                            <p className="font-semibold">{ex.name}</p>
                            <p className="text-sm text-muted-foreground">
                                {ex.sets} sets of {ex.reps} reps - <span className="italic">{ex.weightOrOption}</span>
                            </p>
                            </div>
                            <div className="flex items-center -mr-2">
                            <Button variant="ghost" size="icon" onClick={() => handleMoveExercise(dayPlan.day, index, 'up')} disabled={index === 0}>
                                <ArrowUp className="h-5 w-5" />
                                <span className="sr-only">Move up</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleMoveExercise(dayPlan.day, index, 'down')} disabled={index === dayPlan.exercises.length - 1}>
                                <ArrowDown className="h-5 w-5" />
                                <span className="sr-only">Move down</span>
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteExercise(dayPlan.day, index)}>
                                <Trash2 className="h-5 w-5" />
                                <span className="sr-only">Delete</span>
                            </Button>
                            </div>
                        </Card>
                        ))}
                        {dayPlan.exercises.length === 0 && <p className="text-center text-muted-foreground italic py-4">This is a rest day. Add an exercise to make it a workout day.</p>}
                    </div>
                    <Button variant="secondary" className="mt-4 w-full" onClick={() => {
                        setDayToAddExercise(dayPlan.day);
                        setIsAddExerciseDialogOpen(true);
                    }}>
                        <Plus className="mr-2" /> Add Exercise to {dayPlan.day}
                    </Button>
                    </AccordionContent>
                </AccordionItem>
                ))}
            </Accordion>

            <AddExerciseDialog
                open={isAddExerciseDialogOpen}
                onOpenChange={setIsAddExerciseDialogOpen}
                onAddExercise={(newExercise) => {
                    if (dayToAddExercise) {
                        handleAddExercise(dayToAddExercise, newExercise)
                    }
                }}
            />
        </div>
    );
}
