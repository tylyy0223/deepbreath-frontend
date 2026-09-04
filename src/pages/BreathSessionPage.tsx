import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBreathStore } from '../stores/breathStore';
import { useBreathTimer } from '../hooks/useBreathTimer';
import { useBreathVoice } from '../hooks/useBreathVoice';
import { BreathingCircle } from '../components/breath/BreathingCircle';
import { BreathGuidance } from '../components/breath/BreathGuidance';
import { BreathControls } from '../components/breath/BreathControls';
import { CompletionModal } from '../components/breath/CompletionModal';
import { Spinner } from '../components/ui/Spinner';
import { DEFAULT_BREATH_CONFIG } from '../config/constants';
import type { BreathPhase } from '../types/breath';

export function BreathSessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    activeExercise,
    isActive,
    phase,
    cycleCount,
    elapsedSeconds,
    totalCycles,
    fetchExerciseDetail,
    startExercise,
    setPhase,
    setCycleCount,
    incrementElapsed,
    completeExercise,
    reset,
  } = useBreathStore();

  const [isPaused, setIsPaused] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const voice = useBreathVoice();

  const handlePhaseChange = useCallback((p: BreathPhase) => {
    setPhase(p);
    // 语音陪伴：跟随阶段播报（idle 不播）
    if (p !== 'idle') voice.play(p);
  }, [setPhase, voice]);

  const handleCycleComplete = useCallback(() => {
    const newCount = useBreathStore.getState().cycleCount + 1;
    setCycleCount(newCount);
  }, [setCycleCount]);

  const handleElapsed = useCallback(() => {
    incrementElapsed();
  }, [incrementElapsed]);

  const timer = useBreathTimer(handlePhaseChange, handleCycleComplete, handleElapsed);

  // Load exercise detail on mount (do NOT auto-start — wait for the start button)
  useEffect(() => {
    if (id) {
      fetchExerciseDetail(Number(id));
    }
    return () => {
      reset();
    };
  }, [id, fetchExerciseDetail, reset]);

  // Watch for completion
  useEffect(() => {
    if (isActive && !showCompletion && cycleCount >= totalCycles && phase === 'idle' && elapsedSeconds > 5) {
      setShowCompletion(true);
      timer.stop();
      voice.play('complete');
    }
  }, [isActive, cycleCount, totalCycles, phase, elapsedSeconds, showCompletion, timer, voice]);

  const handleStart = () => {
    setIsPaused(false);
    setShowCompletion(false);
    if (id) {
      startExercise(Number(id)).then(() => {
        if (voice.enabled) {
          // 先播开场引导，再进入呼吸节奏
          voice.play('start');
          setTimeout(() => timer.start(DEFAULT_BREATH_CONFIG, totalCycles), 4200);
        } else {
          timer.start(DEFAULT_BREATH_CONFIG, totalCycles);
        }
      });
    }
  };

  const handlePause = () => {
    setIsPaused(true);
    timer.pause();
    voice.stop();
  };

  const handleResume = () => {
    setIsPaused(false);
    timer.resume();
  };

  const handleStop = () => {
    timer.stop();
    voice.stop();
    if (elapsedSeconds > 5) {
      setShowCompletion(true);
    } else {
      navigate('/app/breath');
    }
  };

  const handleSave = async () => {
    await completeExercise(elapsedSeconds);
  };

  if (!activeExercise) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Back button + voice toggle */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/app/breath')}
          className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
        >
          ← 返回列表
        </button>
        <button
          onClick={voice.toggle}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors
            ${voice.enabled
              ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-900/30 dark:border-primary-700 dark:text-primary-400'
              : 'bg-white border-gray-200 text-gray-400 dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-500'}`}
          title={voice.enabled ? '关闭语音陪伴' : '开启语音陪伴'}
        >
          {voice.enabled ? '🔊 语音陪伴' : '🔇 语音已关'}
        </button>
      </div>

      <h2 className="text-lg font-semibold text-gray-800 dark:text-zinc-200 mb-1">{activeExercise.name}</h2>
      <p className="text-sm text-gray-500 mb-6">{activeExercise.description}</p>

      {/* Breathing circle */}
      <BreathingCircle phase={phase} />

      {/* Guidance text */}
      <BreathGuidance
        phase={phase}
        cycleCount={cycleCount}
        totalCycles={totalCycles}
      />

      {/* Timer */}
      <p className="text-center text-sm text-gray-400 mt-3 mb-6">
        {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
      </p>

      {/* Controls */}
      <BreathControls
        isActive={isActive}
        isPaused={isPaused}
        phase={phase}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onStop={handleStop}
      />

      {/* Completion modal */}
      {showCompletion && (
        <CompletionModal
          exerciseName={activeExercise.name}
          durationSec={elapsedSeconds}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
