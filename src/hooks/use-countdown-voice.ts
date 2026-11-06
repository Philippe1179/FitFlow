'use client';

import { useCallback, useRef } from 'react';

/** Highest number the voice counts down from. */
export const COUNTDOWN_VOICE_FROM = 5;

const COUNTS = Array.from({ length: COUNTDOWN_VOICE_FROM }, (_, i) => COUNTDOWN_VOICE_FROM - i);
const clipUrl = (n: number) => `/audio/countdown/${n}.wav`;

/**
 * Speaks the final seconds of an interval ("5… 4… 3… 2… 1").
 *
 * Prefers pre-rendered voice clips in `public/audio/countdown/` — those decode
 * into AudioBuffers, so they can be scheduled on the Web Audio clock and still
 * fire while the tab is hidden. When the clips aren't present it falls back to
 * the browser's own speech voice, which only works while the tab is visible.
 */
export function useCountdownVoice(getAudioContext: () => AudioContext | null) {
  const clipsRef = useRef<Map<number, AudioBuffer> | null>(null);
  const loadRef = useRef<Promise<void> | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Held in a ref so callers can pass an inline getter without this hook's
  // returned callbacks changing identity on every render.
  const getContextRef = useRef(getAudioContext);
  getContextRef.current = getAudioContext;

  const loadClips = useCallback(() => {
    if (loadRef.current) return loadRef.current;
    const ctx = getContextRef.current();
    if (!ctx) return Promise.resolve();
    loadRef.current = (async () => {
      try {
        const decoded = await Promise.all(
          COUNTS.map(async (n) => {
            const res = await fetch(clipUrl(n));
            if (!res.ok) throw new Error(`no clip for ${n}`);
            return [n, await ctx.decodeAudioData(await res.arrayBuffer())] as const;
          })
        );
        clipsRef.current = new Map(decoded);
      } catch {
        // No clips generated yet — speech synthesis covers it.
        clipsRef.current = null;
      }
    })();
    return loadRef.current;
  }, []);

  const pickVoice = () => {
    if (voiceRef.current) return voiceRef.current;
    const voices = window.speechSynthesis?.getVoices() ?? [];
    if (voices.length === 0) return null; // getVoices() populates asynchronously; retry next call
    const english = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
    const pool = english.length > 0 ? english : voices;
    voiceRef.current =
      pool.find((v) => /natural|neural|enhanced|premium|google|siri/i.test(v.name)) ?? pool[0];
    return voiceRef.current;
  };

  /**
   * Schedules a clip on the audio clock. Returns the node (so it can be
   * cancelled) or null when no clips are loaded.
   */
  const scheduleCount = useCallback(
    (n: number, when?: number) => {
      const ctx = getContextRef.current();
      const buffer = clipsRef.current?.get(n);
      if (!ctx || !buffer) return null;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(when ?? ctx.currentTime);
      return source;
    },
    []
  );

  /** Says the number now. Returns false if neither clips nor speech are available. */
  const sayCount = useCallback(
    (n: number) => {
      if (scheduleCount(n)) return true;
      const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
      if (!synth) return false;
      // Drop any lagging utterance so slow voices can't queue up behind the count.
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(String(n));
      const voice = pickVoice();
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }
      utterance.rate = 1.15;
      synth.speak(utterance);
      return true;
    },
    [scheduleCount]
  );

  /** Call from the user gesture that starts the session. */
  const primeVoice = useCallback(() => {
    loadClips();
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
    if (!synth) return;
    // Safari/iOS only unlocks speech after a gesture-initiated utterance.
    const unlock = new SpeechSynthesisUtterance(' ');
    unlock.volume = 0;
    synth.speak(unlock);
  }, [loadClips]);

  return { primeVoice, sayCount, scheduleCount };
}
