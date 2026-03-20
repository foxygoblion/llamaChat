import React from 'react';
import { User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  role: 'user' | 'model';
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={cn("flex w-full mb-6 gap-4 animate-in fade-in slide-in-from-bottom-2", isUser ? "flex-row-reverse" : "flex-row")}>
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        isUser ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
      )}>
        {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </div>
      
      <div className={cn(
        "flex flex-col max-w-[80%]",
        isUser ? "items-end" : "items-start"
      )}>
        <div className={isUser ? "chat-bubble-user" : "chat-bubble-ai"}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
        <span className="text-[10px] mt-1 text-muted-foreground px-2">
          {isUser ? "You" : "Llama AI"}
        </span>
      </div>
    </div>
  );
}