import { ChatSidebar } from '@/components/chat-sidebar';
import { ChatInterface } from '@/components/chat-interface';

export default function Home() {
  return (
    <main className="flex h-screen w-full overflow-hidden bg-background">
      <ChatSidebar />
      <ChatInterface />
    </main>
  );
}