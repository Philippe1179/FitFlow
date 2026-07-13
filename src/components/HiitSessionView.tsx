'use client';

import { AppContext } from '@/contexts/AppContext';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ArrowLeft, Bell, CheckCircle2, Flame, SkipForward } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Segment = {
  kind: 'work' | 'rest';
  label: string;
  seconds: number;
  roundNumber: number;
};

export default function HiitSessionView({ workoutId }: { workoutId: string }) {
  const { hiitWorkouts, addCardioLogEntry } = useContext(AppContext);
  const { toast } = useToast();

  const workout = hiitWorkouts.find((w) => w.id === workoutId);

  const segments = useMemo<Segment[]>(() => {
    if (!workout) return [];
    const list: Segment[] = [];
    for (let round = 1; round <= workout.rounds; round++) {
      workout.intervals.forEach((interval) => {
        list.push({ kind: 'work', label: interval.name, seconds: interval.workSeconds, roundNumber: round });
        if (interval.restSeconds > 0) {
          list.push({ kind: 'rest', label: 'Rest', seconds: interval.restSeconds, roundNumber: round });
        }
      });
    }
    return list;
  }, [workout]);

  const cumulativeMs = useMemo(() => {
    const cumulative = [0];
    segments.forEach((s) => cumulative.push(cumulative[cumulative.length - 1] + s.seconds * 1000));
    return cumulative;
  }, [segments]);
  const totalDurationMs = cumulativeMs[cumulativeMs.length - 1] || 0;

  const [status, setStatus] = useState<'ready' | 'running' | 'finished'>('ready');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const sessionStartRef = useRef<number | null>(null);
  const hasLoggedRef = useRef(false);

  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const backgroundAudioRef = useRef<{ silentSource: AudioBufferSourceNode; beepGain: GainNode } | null>(null);

  useEffect(() => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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

  const playSound = useCallback((freq: number, duration: number) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    gainNode.gain.value = 0.1;
    oscillator.frequency.value = freq;
    oscillator.type = 'sine';
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  }, []);

  const scheduleBackgroundBeep = useCallback((remainingMs: number) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const silentBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const silentSource = ctx.createBufferSource();
    silentSource.buffer = silentBuffer;
    silentSource.loop = true;
    silentSource.connect(ctx.destination);
    silentSource.start();

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

  const finishSession = useCallback(() => {
    if (hasLoggedRef.current || !workout) return;
    hasLoggedRef.current = true;
    setStatus('finished');
    cancelBackgroundBeep();
    const sw = swRegistrationRef.current?.active;
    if (sw) sw.postMessage({ type: 'CANCEL_NOTIFICATION' });
    addCardioLogEntry({ type: 'hiit', hiitWorkoutName: workout.name });
    toast({ title: 'HIIT Session Complete!', description: `Nice work on "${workout.name}".` });
  }, [workout, addCardioLogEntry, toast, cancelBackgroundBeep]);

  const startSession = async () => {
    if (segments.length === 0) return;
    if ('Notification' in window && Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      setNotifPermission(result);
    }
    sessionStartRef.current = Date.now();
    setCurrentIndex(0);
    setRemainingSeconds(segments[0].seconds);
    setStatus('running');
  };

  // Absolute-clock ticking: recomputed from sessionStartRef each tick, so backgrounding
  // and JS timer throttling can't desync the displayed segment/remaining time.
  useEffect(() => {
    if (status !== 'running') return;
    const tick = () => {
      if (!sessionStartRef.current) return;
      const elapsed = Date.now() - sessionStartRef.current;
      if (elapsed >= totalDurationMs) {
        finishSession();
        return;
      }
      let idx = 0;
      while (idx < segments.length - 1 && cumulativeMs[idx + 1] <= elapsed) idx++;
      setCurrentIndex(idx);
      setRemainingSeconds(Math.max(0, Math.ceil((cumulativeMs[idx + 1] - elapsed) / 1000)));
    };
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [status, segments, cumulativeMs, totalDurationMs, finishSession]);

  // Beep near the end of each segment and on segment transitions.
  const prevIndexRef = useRef(currentIndex);
  useEffect(() => {
    if (status !== 'running') return;
    if (prevIndexRef.current !== currentIndex) {
      playSound(880, 0.4);
      prevIndexRef.current = currentIndex;
    } else if (remainingSeconds <= 3 && remainingSeconds > 1) {
      playSound(440, 0.15);
    } else if (remainingSeconds === 1) {
      playSound(659, 0.2);
    }
  }, [remainingSeconds, currentIndex, status, playSound]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const sw = swRegistrationRef.current?.active;
      if (status !== 'running' || !sessionStartRef.current) return;

      if (document.visibilityState === 'hidden') {
        const nextBoundaryAbs = sessionStartRef.current + cumulativeMs[currentIndex + 1];
        const remaining = nextBoundaryAbs - Date.now();
        if (remaining > 0) {
          scheduleBackgroundBeep(remaining);
          if (sw && Notification.permission === 'granted') {
            const nextSegment = segments[currentIndex + 1];
            sw.postMessage({
              type: 'SCHEDULE_NOTIFICATION',
              endsAt: nextBoundaryAbs,
              title: nextSegment ? `Next: ${nextSegment.label}` : 'HIIT Session Complete!',
              body: nextSegment ? `${nextSegment.kind === 'work' ? 'Work' : 'Rest'} — ${nextSegment.seconds}s` : 'Great job — session finished.',
            });
          }
        }
      } else {
        cancelBackgroundBeep();
        if (sw) sw.postMessage({ type: 'CANCEL_NOTIFICATION' });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [status, currentIndex, segments, cumulativeMs, scheduleBackgroundBeep, cancelBackgroundBeep]);

  const skipSegment = () => {
    if (!sessionStartRef.current) return;
    const targetElapsed = cumulativeMs[currentIndex + 1];
    sessionStartRef.current = Date.now() - targetElapsed;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!workout) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Button asChild variant="ghost">
          <Link href="/cardio">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Cardio
          </Link>
        </Button>
        <p className="text-muted-foreground">This HIIT workout could not be found.</p>
      </div>
    );
  }

  if (status === 'finished') {
    return (
      <div className="p-4 md:p-6 flex flex-col items-center justify-center gap-6 text-center min-h-[60vh]">
        <CheckCircle2 className="h-16 w-16 text-primary" />
        <h1 className="text-3xl font-bold tracking-tighter">Session Complete!</h1>
        <p className="text-muted-foreground">
          "{workout.name}" has been logged to your cardio history.
        </p>
        <Button asChild size="lg">
          <Link href="/cardio">Back to Cardio</Link>
        </Button>
      </div>
    );
  }

  if (status === 'ready') {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Button asChild variant="ghost" className="mb-2">
          <Link href="/cardio">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Cardio
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tighter">{workout.name}</h1>

        {notifPermission === 'default' && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            <Bell className="h-4 w-4 shrink-0 text-primary" />
            <span>You'll be prompted to enable notifications so interval alerts still fire in the background.</span>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Flame className="mr-2 text-primary" />
              {workout.rounds} rounds
            </CardTitle>
            <CardDescription>Total time: {formatTime(Math.round(totalDurationMs / 1000))}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {workout.intervals.map((interval, i) => (
              <div key={i} className="flex justify-between rounded-md p-2 bg-muted/50 text-sm">
                <span className="font-medium">{interval.name}</span>
                <span className="text-muted-foreground">
                  {interval.workSeconds}s work / {interval.restSeconds}s rest
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Button size="lg" className="w-full" onClick={startSession}>
          Start Session
        </Button>
      </div>
    );
  }

  const currentSegment = segments[currentIndex];
  const nextSegment = segments[currentIndex + 1];

  return (
    <>
      <div className="p-4 md:p-6">
        <p className="text-muted-foreground">Session in progress…</p>
      </div>
      {createPortal(
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center gap-6 p-8">
          <p className="text-muted-foreground text-sm uppercase tracking-widest">
            Round {currentSegment.roundNumber} of {workout.rounds} · {currentSegment.kind === 'work' ? 'Work' : 'Rest'}
          </p>
          <p className="text-xl font-semibold text-center">{currentSegment.label}</p>
          <span className="font-mono text-8xl font-bold text-primary tabular-nums">
            {formatTime(remainingSeconds)}
          </span>
          {nextSegment && (
            <p className="text-muted-foreground text-sm">
              Up next: {nextSegment.label} ({nextSegment.kind === 'work' ? 'Work' : 'Rest'})
            </p>
          )}
          <div className="flex gap-3 mt-4">
            <Button variant="outline" size="lg" className="text-lg px-8" onClick={skipSegment}>
              <SkipForward className="mr-2 h-5 w-5" /> Skip
            </Button>
            <Button variant="secondary" size="lg" className="text-lg px-8" onClick={finishSession}>
              Finish Early
            </Button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
