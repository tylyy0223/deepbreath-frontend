// === Breath Types ===

export interface BreathExercise {
  id: number;
  name: string;
  description: string;
  duration_min: number;
  cycles?: number;
  pattern?: string;
  image_url?: string;
  difficulty?: string;
}

export interface BreathExerciseDetail extends BreathExercise {
  steps?: BreathStep[];
  benefits?: string;
  instructions?: string;
}

export interface BreathStep {
  phase: 'inhale' | 'hold' | 'exhale' | 'rest';
  duration_ms: number;
  label: string;
}

export interface BreathCompleteRequest {
  exercise_id: number;
  duration_sec: number;
  completed?: boolean;
}

export interface BreathHistoryItem {
  id: number;
  exercise_id: number | null;
  exercise_title: string;
  duration_sec: number;
  completed: boolean;
  completed_at: string | null;
  started_at: string | null;
}

export interface BreathStats {
  total_sessions: number;
  total_minutes: number;
  streak_days: number;
  week_sessions: number;
}

export type BreathPhase = 'idle' | 'inhale' | 'hold' | 'exhale' | 'rest';

export interface PhaseConfig {
  inhale: number;
  hold: number;
  exhale: number;
  rest: number;
}
