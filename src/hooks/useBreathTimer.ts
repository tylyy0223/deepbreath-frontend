import { useRef, useCallback, useEffect } from 'react';
import type { BreathPhase, PhaseConfig } from '../types/breath';
import { DEFAULT_BREATH_CONFIG } from '../config/constants';

const PHASE_ORDER: BreathPhase[] = ['inhale', 'hold', 'exhale', 'rest'];

export function useBreathTimer(
  onPhaseChange: (phase: BreathPhase) => void,
  onCycleComplete: () => void,
  onElapsed: () => void,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const configRef = useRef<PhaseConfig>(DEFAULT_BREATH_CONFIG);
  const currentPhaseRef = useRef<BreathPhase>('idle');
  const phaseIndexRef = useRef(0);
  const cyclesRef = useRef(0);
  const totalCyclesRef = useRef(10);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
  }, []);

  const runPhase = useCallback(() => {
    const phase = PHASE_ORDER[phaseIndexRef.current % 4];
    currentPhaseRef.current = phase;
    onPhaseChange(phase);

    const duration = phase === 'idle' ? 1000 : configRef.current[phase];

    timerRef.current = setTimeout(() => {
      phaseIndexRef.current++;

      // Check if a full cycle completed
      if (phaseIndexRef.current > 0 && phaseIndexRef.current % 4 === 0) {
        cyclesRef.current++;
        onCycleComplete();

        if (cyclesRef.current >= totalCyclesRef.current) {
          // All cycles done
          onPhaseChange('idle');
          clearTimers();
          return;
        }
      }

      runPhase();
    }, duration);
  }, [onPhaseChange, onCycleComplete, clearTimers]);

  const start = useCallback(
    (config: PhaseConfig, totalCycles: number) => {
      clearTimers();
      configRef.current = config;
      totalCyclesRef.current = totalCycles;
      phaseIndexRef.current = 0;
      cyclesRef.current = 0;

      // Start elapsed timer (per second)
      elapsedIntervalRef.current = setInterval(() => {
        onElapsed();
      }, 1000);

      runPhase();
    },
    [clearTimers, runPhase, onElapsed],
  );

  const pause = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
  }, []);

  const resume = useCallback(() => {
    if (currentPhaseRef.current === 'idle') return;
    runPhase();
    elapsedIntervalRef.current = setInterval(() => {
      onElapsed();
    }, 1000);
  }, [runPhase, onElapsed]);

  const stop = useCallback(() => {
    clearTimers();
    currentPhaseRef.current = 'idle';
    onPhaseChange('idle');
  }, [clearTimers, onPhaseChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  return { start, pause, resume, stop };
}
