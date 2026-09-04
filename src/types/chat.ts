// === Chat Types ===

export interface ChatSession {
  id: number;
  title?: string;
  mode?: string;
  created_at?: string;
  updated_at?: string;
  message_count?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
  session_id?: number;
  images?: string[];
}

export interface ChatMode {
  value: string;
  label: string;
  description?: string;
}

export interface ChatRequest {
  message: string;
  session_id?: number | null;
  mode?: string;
  use_rag?: boolean;
}
