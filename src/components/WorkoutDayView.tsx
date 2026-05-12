'use client';

import { AppContext } from '@/contexts/AppContext';
import { useCallback, useContext, useEffect, useRef, useState, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import {
  Bike,
  Bell,
  Check,
  Flame,
  Dumbbell,
  Wind,
  NotebookText,
  Star,
  ArrowLeft,
  Play,
  Timer,
  Info,
  Replace,
  Copy,
} from 'lucide-react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Textarea } from './ui/textarea';
import type {
  CompletedWorkout,
  Exercise,
  ExerciseLog,
  WorkoutDayPlan,
} from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { placeholderImages } from '@/lib/placeholder-images.json';
import Link from 'next/link';
import { NumberPickerDialog } from './NumberPickerDialog';
import { useRouter } from 'next/navigation';
import {
  getExerciseExplanationAction,
  suggestAlternativeExerciseAction,
} from '@/app/actions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from './ui/dialog';
import { Skeleton } from './ui/skeleton';

type ExerciseState = {
  [key: string]: {
    sets: { reps: string | number; weight: string | number; completed: boolean }[];
    notes: string;
  };
};

export default function WorkoutDayView({ day }: { day: string }) {
  const { activePlan, addCompletedWorkout, userProfile, savePlan, completedWorkouts } =
    useContext(AppContext);
  const { toast } = useToast();
  const router = useRouter();

  const dayPlan = activePlan?.weeklyWorkoutPlan.find(
    (d) => d.day.toLowerCase() === day.toLowerCase()
  );

  const [exerciseState, setExerciseState] = useState<ExerciseState>({});
  const [restTimers, setRestTimers] = useState<{ [key: string]: number }>({});

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [activeTimerKey, setActiveTimerKey] = useState<string | null>(null);
  const timerEndTimeRef = useRef<number | null>(null);
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(null);

  // Sound effect state
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const backgroundAudioRef = useRef<{ silentSource: AudioBufferSourceNode; beepGain: GainNode } | null>(null);

  // Explanation Dialog state
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(
    null
  );
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplanationLoading, startExplanationTransition] = useTransition();

  // Suggestion Dialog state
  const [isSwapDialogOpen, setIsSwapDialogOpen] = useState(false);
  const [exerciseToSwap, setExerciseToSwap] = useState<Exercise | null>(null);
  const [suggestion, setSuggestion] = useState<{
    alternativeExerciseName: string;
    reasoning: string;
  } | null>(null);
  const [isSuggestionLoading, startSuggestionTransition] = useTransition();

  useEffect(() => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    setAudioContext(ctx);
    audioContextRef.current = ctx;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
      navigator.serviceWorker.ready.then((reg) => {
        swRegistrationRef.current = reg;
      });
    }
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
  };

  useEffect(() => {
    if (dayPlan) {
      const initializeExerciseState = () => {
        const previousDayWorkout = completedWorkouts
          .filter((w) => w.day.toLowerCase() === dayPlan.day.toLowerCase())
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        const initialState: ExerciseState = {};
        dayPlan?.exercises.forEach((ex) => {
          const prevExercise = previousDayWorkout?.exercises.find(
            (e) => e.exerciseName === ex.name
          );

          if (prevExercise && prevExercise.sets.length > 0) {
            initialState[ex.name] = {
              sets: Array.from({ length: ex.sets }, (_, i) => {
                const prevSet = prevExercise.sets[i] ?? prevExercise.sets[prevExercise.sets.length - 1];
                let displayWeight: string | number = '';
                if (typeof prevSet.weight === 'number' && prevSet.weight !== 0) {
                  displayWeight = userProfile?.displayWeightUnit === 'lbs'
                    ? Math.round(prevSet.weight * 2.20462 * 10) / 10
                    : prevSet.weight;
                } else if (prevSet.weight !== 0) {
                  displayWeight = prevSet.weight;
                }
                return { reps: prevSet.reps, weight: displayWeight, completed: false };
              }),
              notes: '',
            };
          } else {
            initialState[ex.name] = {
              sets: Array.from({ length: ex.sets }, () => ({
                reps: '',
                weight: '',
                completed: false,
              })),
              notes: '',
            };
          }
        });
        setExerciseState(initialState);
      };

      try {
        const savedStateJSON = localStorage.getItem(
          `workout-progress-${activePlan?.id}-${dayPlan.day}`
        );
        if (savedStateJSON) {
          const savedState = JSON.parse(savedStateJSON);
          const planExerciseNames = dayPlan.exercises.map((e) => e.name);
          const savedExerciseNames = Object.keys(savedState);
          if (
            planExerciseNames.length === savedExerciseNames.length &&
            planExerciseNames.every((name) => savedExerciseNames.includes(name))
          ) {
            setExerciseState(savedState);
          } else {
            initializeExerciseState();
          }
        } else {
          initializeExerciseState();
        }
      } catch (e) {
        console.error(
          'Failed to load or parse saved workout state from localStorage.',
          e
        );
        localStorage.removeItem(`workout-progress-${activePlan?.id}-${dayPlan.day}`);
        initializeExerciseState();
      }

      const initialRestTimers: { [key: string]: number } = {};
      dayPlan.exercises.forEach((ex) => {
        initialRestTimers[ex.name] = 60; // Default 60 seconds
      });
      try {
        const savedTimersJSON = localStorage.getItem(
          `workout-rest-timers-${activePlan?.id}-${dayPlan.day}`
        );
        if (savedTimersJSON) {
          const savedTimers = JSON.parse(savedTimersJSON);
          setRestTimers({ ...initialRestTimers, ...savedTimers });
        } else {
          setRestTimers(initialRestTimers);
        }
      } catch (e) {
        console.error(
          'Failed to load or parse rest timers from localStorage.',
          e
        );
        setRestTimers(initialRestTimers);
      }
    }
  }, [dayPlan, activePlan?.id, completedWorkouts, userProfile]);

  useEffect(() => {
    if (dayPlan && Object.keys(exerciseState).length > 0) {
      localStorage.setItem(
        `workout-progress-${activePlan?.id}-${dayPlan.day}`,
        JSON.stringify(exerciseState)
      );
    }
  }, [exerciseState, dayPlan, activePlan?.id]);

  useEffect(() => {
    if (dayPlan && Object.keys(restTimers).length > 0) {
      localStorage.setItem(
        `workout-rest-timers-${activePlan?.id}-${dayPlan.day}`,
        JSON.stringify(restTimers)
      );
    }
  }, [restTimers, dayPlan, activePlan?.id]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        if (!timerEndTimeRef.current) return;
        const remaining = Math.ceil((timerEndTimeRef.current - Date.now()) / 1000);
        if (remaining <= 0) {
          clearInterval(interval!);
          setTimerSeconds(0);
          setIsTimerRunning(false);
        } else {
          setTimerSeconds(remaining);
        }
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  const scheduleBackgroundBeep = useCallback((remainingMs: number) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    // Silent loop keeps the iOS audio session alive so scheduled events can fire
    const silentBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const silentSource = ctx.createBufferSource();
    silentSource.buffer = silentBuffer;
    silentSource.loop = true;
    silentSource.connect(ctx.destination);
    silentSource.start();

    // Schedule the beep on the audio hardware clock — fires even when JS is suspended
    const beepTime = ctx.currentTime + remainingMs / 1000;
    const osc = ctx.createOscillator();
    const beepGain = ctx.createGain();
    osc.connect(beepGain);
    beepGain.connect(ctx.destination);
    beepGain.gain.value = 0.8;
    osc.frequency.value = 880;
    osc.start(beepTime);
    osc.stop(beepTime + 0.8);

    backgroundAudioRef.current = { silentSource, beepGain };
  }, []);

  const cancelBackgroundBeep = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!backgroundAudioRef.current || !ctx) return;
    const { silentSource, beepGain } = backgroundAudioRef.current;
    try { silentSource.stop(); } catch {}
    beepGain.gain.setValueAtTime(0, ctx.currentTime);
    backgroundAudioRef.current = null;
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const sw = swRegistrationRef.current?.active;
      if (document.visibilityState === 'hidden') {
        if (timerEndTimeRef.current) {
          const remaining = timerEndTimeRef.current - Date.now();
          if (remaining > 0) {
            // Option 2: schedule beep on the Web Audio hardware clock
            scheduleBackgroundBeep(remaining);

            if (sw && Notification.permission === 'granted') {
              // Option 3: immediate notification showing the end time
              const endTime = new Date(timerEndTimeRef.current).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              });
              sw.postMessage({
                type: 'SHOW_NOW_NOTIFICATION',
                title: 'Rest Timer Running',
                body: `Ends at ${endTime}`,
              });

              // Schedule the "Rest Over!" notification for when the timer ends
              sw.postMessage({
                type: 'SCHEDULE_NOTIFICATION',
                endsAt: timerEndTimeRef.current,
                title: 'Rest Over!',
                body: 'Time for your next set.',
              });
            }
          }
        }
      } else {
        cancelBackgroundBeep();
        if (sw) sw.postMessage({ type: 'CANCEL_NOTIFICATION' });
        if (timerEndTimeRef.current) {
          const remaining = Math.ceil((timerEndTimeRef.current - Date.now()) / 1000);
          if (remaining <= 0) {
            setTimerSeconds(0);
            setIsTimerRunning(false);
          } else {
            setTimerSeconds(remaining);
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [scheduleBackgroundBeep, cancelBackgroundBeep]);

  useEffect(() => {
    const playSound = (freq: number, duration: number) => {
      if (!audioContext) return;
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      gainNode.gain.value = 0.1;
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    };

    if (isTimerRunning) {
      if (timerSeconds <= 5 && timerSeconds > 1) {
        playSound(440, 0.15); 
      } else if (timerSeconds === 1) {
        playSound(659, 0.2); 
      }
    } else {
      if (timerSeconds === 0 && activeTimerKey) {
        playSound(880, 0.5); 
        toast({
          title: 'Rest Over!',
          description: 'Time for your next set.',
        });
        setActiveTimerKey(null); 
      }
    }
  }, [timerSeconds, isTimerRunning, audioContext, toast, activeTimerKey]);

  const cancelNotification = () => {
    const sw = swRegistrationRef.current?.active;
    if (!sw) return;
    sw.postMessage({ type: 'CANCEL_NOTIFICATION' });
  };

  const startTimer = async (exName: string, setIndex: number) => {
    const duration = restTimers[exName] || 60;
    if (isTimerRunning) stopTimer();

    if ('Notification' in window && Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      setNotifPermission(result);
    }

    const endTime = Date.now() + duration * 1000;
    timerEndTimeRef.current = endTime;
    setTimerSeconds(duration);
    setIsTimerRunning(true);
    setActiveTimerKey(`${exName}-${setIndex}`);
  };

  const stopTimer = () => {
    cancelNotification();
    cancelBackgroundBeep();
    timerEndTimeRef.current = null;
    setIsTimerRunning(false);
    setActiveTimerKey(null);
    setTimerSeconds(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSetChange = (
    exName: string,
    setIndex: number,
    field: 'reps' | 'weight' | 'completed',
    value: string | boolean | number
  ) => {
    setExerciseState((prev) => ({
      ...prev,
      [exName]: {
        ...prev[exName],
        sets: prev[exName].sets.map((set, i) =>
          i === setIndex ? { ...set, [field]: value } : set
        ),
      },
    }));
  };

  const handleNotesChange = (exName: string, value: string) => {
    setExerciseState((prev) => ({
      ...prev,
      [exName]: {
        ...prev[exName],
        notes: value,
      },
    }));
  };

  const handleToggleAllSets = (exName: string) => {
    const sets = exerciseState[exName]?.sets;
    if (!sets) return;
    const allCompleted = sets.every((s) => s.completed);
    if (allCompleted) {
      setExerciseState((prev) => ({
        ...prev,
        [exName]: {
          ...prev[exName],
          sets: prev[exName].sets.map((set) => ({ ...set, completed: false })),
        },
      }));
    } else {
      const template = sets.find((s) => s.reps !== '' || s.weight !== '') ?? sets[0];
      setExerciseState((prev) => ({
        ...prev,
        [exName]: {
          ...prev[exName],
          sets: prev[exName].sets.map((set) => ({
            completed: true,
            reps: set.reps !== '' ? set.reps : template.reps,
            weight: set.weight !== '' ? set.weight : template.weight,
          })),
        },
      }));
    }
  };

  const handleCopyPreviousSet = (exName: string, setIndex: number) => {
    const previousSet = exerciseState[exName]?.sets[setIndex - 1];
    if (previousSet) {
      setExerciseState((prev) => ({
        ...prev,
        [exName]: {
          ...prev[exName],
          sets: prev[exName].sets.map((set, i) =>
            i === setIndex
              ? { ...set, reps: previousSet.reps, weight: previousSet.weight }
              : set
          ),
        },
      }));
    }
  };

  const handleFinishWorkout = () => {
    if (!dayPlan || !userProfile || !activePlan) return;

    const completedExercises: ExerciseLog[] = Object.entries(exerciseState)
      .filter(([_, data]) => data.sets.some((s) => s.completed))
      .map(([name, data]) => ({
        exerciseName: name,
        sets: data.sets.map((s) => {
          const weightInput = String(s.weight).trim();
          let finalWeight: number | string;

          if (weightInput === '' || Number(weightInput) === 0) {
            finalWeight = 0;
          } else {
            const weightAsNumber = Number(weightInput);
            if (!isNaN(weightAsNumber)) {
              if (userProfile.displayWeightUnit === 'lbs') {
                finalWeight = weightAsNumber * 0.453592;
              } else {
                finalWeight = weightAsNumber;
              }
            } else {
              finalWeight = weightInput;
            }
          }

          return {
            reps: s.reps,
            weight: finalWeight,
            completed: s.completed,
          };
        }),
        notes: data.notes,
      }));

    if (completedExercises.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Empty Workout',
        description: "You haven't completed any exercises.",
      });
      return;
    }

    const completedWorkout: CompletedWorkout = {
      date: new Date().toISOString(),
      day: dayPlan.day,
      exercises: completedExercises,
      weightUnitStored: 'kg',
    };

    addCompletedWorkout(completedWorkout);
    toast({
      title: 'Workout Complete!',
      description: `Great job, ${userProfile?.name}! Your workout has been logged.`,
    });

    localStorage.removeItem(`workout-progress-${activePlan.id}-${dayPlan.day}`);
    localStorage.removeItem(`workout-rest-timers-${activePlan.id}-${dayPlan.day}`);

    router.push('/');
  };

  const handleGetExplanation = (exerciseName: string) => {
    setSelectedExercise(exerciseName);
    setIsExplanationOpen(true);
    setExplanation(null);
    startExplanationTransition(async () => {
      const result = await getExerciseExplanationAction(exerciseName);
      if (result.success && result.data) {
        setExplanation(result.data);
      } else {
        setExplanation(
          'Sorry, we could not fetch an explanation for this exercise at the moment. Please try again later.'
        );
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error,
        });
      }
    });
  };

  const handleSwapExercise = (exercise: Exercise) => {
    if (!userProfile || !dayPlan) return;
    setExerciseToSwap(exercise);
    setSuggestion(null);
    setIsSwapDialogOpen(true);
    startSuggestionTransition(async () => {
      const result = await suggestAlternativeExerciseAction(
        exercise.name,
        userProfile,
        dayPlan
      );
      if (result.success && result.data) {
        setSuggestion(result.data);
      } else {
        setSuggestion({
          alternativeExerciseName: 'Error',
          reasoning: 'Could not fetch a suggestion. Please try again later.',
        });
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error,
        });
      }
    });
  };

  const handleAcceptSwap = () => {
    if (
      !suggestion ||
      !exerciseToSwap ||
      !activePlan ||
      !dayPlan ||
      suggestion.alternativeExerciseName === 'Error'
    )
      return;

    const newExercises = dayPlan.exercises.map((ex) =>
      ex.name === exerciseToSwap.name
        ? { ...ex, name: suggestion.alternativeExerciseName }
        : ex
    );

    const newDayPlan: WorkoutDayPlan = { ...dayPlan, exercises: newExercises };

    const newWeeklyPlan = activePlan.weeklyWorkoutPlan.map((dp) =>
      dp.day.toLowerCase() === day.toLowerCase() ? newDayPlan : dp
    );

    const newWorkoutPlan = { ...activePlan, weeklyWorkoutPlan: newWeeklyPlan };

    savePlan(newWorkoutPlan);

    setExerciseState((prev) => {
      const newState = { ...prev };
      const exerciseData = newState[exerciseToSwap.name];
      delete newState[exerciseToSwap.name];
      newState[suggestion.alternativeExerciseName] = exerciseData;
      return newState;
    });

    setRestTimers((prev) => {
      const newTimers = { ...prev };
      const timerData = newTimers[exerciseToSwap.name];
      delete newTimers[exerciseToSwap.name];
      newTimers[suggestion.alternativeExerciseName] = timerData || 60;
      return newTimers;
    });

    toast({
      title: 'Exercise Swapped!',
      description: `"${exerciseToSwap.name}" was replaced with "${suggestion.alternativeExerciseName}".`,
    });

    setIsSwapDialogOpen(false);
    setExerciseToSwap(null);
    setSuggestion(null);
  };

  const isRestDay = !dayPlan || dayPlan.exercises.length === 0;

  if (isRestDay) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <Button asChild variant="ghost" className="mb-2">
            <Link href="/plan">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Plan
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tighter">
            Rest Day: <span className="text-primary">{dayPlan?.day || day}</span>
          </h1>
        </div>
        <Card>
          <CardHeader>
            <Image
              src={
                placeholderImages[1]?.imageUrl ||
                'https://picsum.photos/seed/restday/600/400'
              }
              alt={placeholderImages[1]?.description || 'Rest day'}
              data-ai-hint={placeholderImages[1]?.imageHint || 'fitness rest'}
              width={600}
              height={400}
              className="rounded-t-lg object-cover"
            />
          </CardHeader>
          <CardContent className="pt-4 text-center">
            <CardTitle className="text-2xl font-bold">
              Active Recovery
            </CardTitle>
            <CardDescription className="mt-2">
              Rest days are for recovery. Here are some suggestions to help your
              body recuperate.
            </CardDescription>
          </CardContent>
        </Card>

        {dayPlan?.cardio && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Bike className="mr-2 text-primary" />
                Light Cardio
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-muted-foreground whitespace-pre-wrap">
                {dayPlan.cardio}
              </p>
            </CardContent>
          </Card>
        )}
        {dayPlan?.coolDown && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Wind className="mr-2 text-primary" />
                Stretching & Mobility
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-muted-foreground whitespace-pre-wrap">
                {dayPlan.coolDown}
              </p>
            </CardContent>
          </Card>
        )}
        {dayPlan?.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Star className="mr-2 text-primary" />
                Coach's Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-muted-foreground whitespace-pre-wrap">
                {dayPlan.notes}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const stickyTimerLabel = (() => {
    if (!activeTimerKey) return null;
    const lastDash = activeTimerKey.lastIndexOf('-');
    const exName = activeTimerKey.substring(0, lastDash);
    const setNum = parseInt(activeTimerKey.substring(lastDash + 1)) + 1;
    return `${exName} · Set ${setNum}`;
  })();

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
        <div>
          <Button asChild variant="ghost" className="mb-2">
            <Link href="/plan">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Plan
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tighter">
            Workout: <span className="text-primary">{dayPlan.day}</span>
          </h1>
        </div>
        <Button onClick={handleFinishWorkout} className="hidden sm:flex">
          <Check className="mr-2 h-4 w-4" />
          Finish & Log Workout
        </Button>
      </div>

      {notifPermission === 'default' && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 shrink-0 text-primary" />
            <span>Enable notifications to get alerted when your rest timer ends — even while using other apps.</span>
          </div>
          <Button size="sm" variant="outline" onClick={requestNotificationPermission}>
            Enable
          </Button>
        </div>
      )}

      {dayPlan.warmUp && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Flame className="mr-2 text-primary" />
              Warm-Up
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground whitespace-pre-wrap">
              {dayPlan.warmUp}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <Dumbbell className="text-primary" />
        <h2 className="text-2xl font-semibold tracking-tight">Main Workout</h2>
      </div>

      <div className="space-y-4">
        {dayPlan.exercises.map((ex, exIndex) => (
          <Card key={ex.name} className="overflow-hidden">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{ex.name}</CardTitle>
                  <CardDescription>
                    Target: {ex.sets} sets of {ex.reps} reps
                    <br />
                    Suggestion: {ex.weightOrOption}
                  </CardDescription>
                </div>
                <div className="flex -my-2 -mr-2">
                  <NumberPickerDialog
                    title="Set Rest Time (seconds)"
                    initialValue={restTimers[ex.name] || 60}
                    onSave={(value) =>
                      setRestTimers((prev) => ({ ...prev, [ex.name]: value }))
                    }
                    incrementSteps={[15, 30, 60]}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        title={`Set Rest Time: ${restTimers[ex.name] || 60}s`}
                      >
                        <Timer className="h-5 w-5 text-muted-foreground" />
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSwapExercise(ex)}
                    disabled={isSuggestionLoading}
                    title="Swap Exercise"
                  >
                    <Replace className="h-5 w-5 text-muted-foreground" />
                    <span className="sr-only">Swap exercise for {ex.name}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleGetExplanation(ex.name)}
                    title="Get Explanation"
                  >
                    <Info className="h-5 w-5 text-muted-foreground" />
                    <span className="sr-only">
                      Get explanation for {ex.name}
                    </span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid grid-cols-[auto,1fr,1fr] sm:grid-cols-[auto,1fr,1fr,auto] items-center gap-2 sm:gap-4 text-sm text-center font-semibold text-muted-foreground">
                <Checkbox
                  checked={
                    exerciseState[ex.name]?.sets.every((s) => s.completed)
                      ? true
                      : exerciseState[ex.name]?.sets.some((s) => s.completed)
                      ? 'indeterminate'
                      : false
                  }
                  onCheckedChange={() => handleToggleAllSets(ex.name)}
                  className="h-5 w-5"
                  aria-label="Mark all sets done"
                  title="Mark all sets done"
                />
                <div>Reps</div>
                <div>Weight ({userProfile?.displayWeightUnit || 'kg'})</div>
                <div className="hidden sm:block" />
              </div>
              {exerciseState[ex.name]?.sets.map((set, setIndex) => (
                <div key={setIndex} className="space-y-2">
                  <div className="grid grid-cols-[auto,1fr,1fr] sm:grid-cols-[auto,1fr,1fr,auto] items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Checkbox
                        id={`${ex.name}-set-${setIndex}`}
                        checked={set.completed}
                        onCheckedChange={(checked) =>
                          handleSetChange(ex.name, setIndex, 'completed', !!checked)
                        }
                        className="h-5 w-5"
                      />
                      <label
                        htmlFor={`${ex.name}-set-${setIndex}`}
                        className="font-semibold text-sm"
                      >
                        <span className="sm:hidden">{setIndex + 1}</span>
                        <span className="hidden sm:inline">Set {setIndex + 1}</span>
                      </label>
                      {setIndex > 0 ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => handleCopyPreviousSet(ex.name, setIndex)}
                          title="Copy from previous set"
                        >
                          <Copy className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      ) : (
                        <div className="h-6 w-6 shrink-0" />
                      )}
                    </div>

                    <NumberPickerDialog
                      title={`Set ${setIndex + 1} Reps`}
                      initialValue={set.reps}
                      onSave={(value) =>
                        handleSetChange(ex.name, setIndex, 'reps', value)
                      }
                      incrementSteps={[1, 5, 10]}
                      trigger={
                        <Button variant="outline" className="h-10 text-base">
                          {set.reps || (
                            <span className="text-muted-foreground">
                              {typeof ex.reps === 'string' ? ex.reps : 'Reps'}
                            </span>
                          )}
                        </Button>
                      }
                    />

                    <NumberPickerDialog
                      title={`Set ${setIndex + 1} Weight (${userProfile?.displayWeightUnit || 'kg'})`}
                      initialValue={set.weight}
                      onSave={(value) =>
                        handleSetChange(ex.name, setIndex, 'weight', value)
                      }
                      incrementSteps={[2.5, 5, 10]}
                      trigger={
                        <Button variant="outline" className="h-10 text-base">
                          {set.weight ? (
                            `${set.weight}`
                          ) : (
                            <span className="text-muted-foreground">Weight</span>
                          )}
                        </Button>
                      }
                    />

                    <div className="hidden sm:flex justify-center items-center">
                      {set.completed && !isTimerRunning && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => startTimer(ex.name, setIndex)}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Start Rest
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Timer row — mobile only */}
                  <div className="sm:hidden">
                    {set.completed && !isTimerRunning && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={() => startTimer(ex.name, setIndex)}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Rest ({restTimers[ex.name] || 60}s)
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <div className="relative mt-4">
                <NotebookText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea
                  placeholder="How did it feel? Add notes here."
                  value={exerciseState[ex.name]?.notes || ''}
                  onChange={(e) => handleNotesChange(ex.name, e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {dayPlan.cardio && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Bike className="mr-2 text-primary" />
              Light Cardio
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground whitespace-pre-wrap">
              {dayPlan.cardio}
            </p>
          </CardContent>
        </Card>
      )}

      {dayPlan.coolDown && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Wind className="mr-2 text-primary" />
              Cool-Down
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground whitespace-pre-wrap">
              {dayPlan.coolDown}
            </p>
          </CardContent>
        </Card>
      )}

      {dayPlan.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Star className="mr-2 text-primary" />
              Coach's Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground whitespace-pre-wrap">
              {dayPlan.notes}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="pt-4">
        <Button onClick={handleFinishWorkout} className="w-full">
          <Check className="mr-2 h-4 w-4" />
          Finish & Log Workout
        </Button>
      </div>

      {/* Fullscreen rest timer overlay — rendered in document.body via portal to escape sidebar transforms */}
      {isTimerRunning && createPortal(
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center gap-6 p-8">
          <p className="text-muted-foreground text-sm uppercase tracking-widest">Resting after</p>
          <p className="text-xl font-semibold text-center">{stickyTimerLabel}</p>
          <span className="font-mono text-8xl font-bold text-primary tabular-nums">{formatTime(timerSeconds)}</span>
          {timerEndTimeRef.current && (
            <p className="text-muted-foreground text-sm">
              ends at {new Date(timerEndTimeRef.current).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </p>
          )}
          <Button variant="outline" size="lg" className="mt-4 text-lg px-10" onClick={stopTimer}>
            Skip Rest
          </Button>
        </div>,
        document.body
      )}

      <Dialog open={isExplanationOpen} onOpenChange={setIsExplanationOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedExercise}</DialogTitle>
            <DialogDescription>
              A guide to proper form and execution.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            {isExplanationLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/6" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {explanation}
              </p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSwapDialogOpen} onOpenChange={setIsSwapDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Swap Exercise: {exerciseToSwap?.name}</DialogTitle>
            <DialogDescription>
              Here's a suggested alternative based on your equipment and goals.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            {isSuggestionLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ) : suggestion ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary">
                  {suggestion.alternativeExerciseName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {suggestion.reasoning}
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleAcceptSwap}
              disabled={
                isSuggestionLoading ||
                !suggestion ||
                suggestion.alternativeExerciseName === 'Error'
              }
            >
              Accept & Swap
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
