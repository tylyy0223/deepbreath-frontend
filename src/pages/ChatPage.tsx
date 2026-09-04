import { useParams } from 'react-router-dom';
import { ChatWindow } from '../components/chat/ChatWindow';

export function ChatPage() {
  const { mode } = useParams<{ mode: string }>();
  const currentMode = mode || 'science';

  return <ChatWindow mode={currentMode} />;
}
