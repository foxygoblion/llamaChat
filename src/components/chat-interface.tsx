"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, AlertCircle, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChatMessage } from './chat-message';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Conversation, Message } from '@/hooks/use-conversations';

interface ChatInterfaceProps {
  conversation: Conversation | null;
  onSendMessage: (convId: string, userMsg: string) => Promise<void>;
  onNewConversation: () => void;
  isLoading: boolean;
}

export function ChatInterface({
  conversation,
  onSendMessage,
  onNewConversation,
  isLoading,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = conversation?.messages ?? [];

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    if (!conversation) {
      // No active conversation — caller (page) handles creating one
      await onSendMessage('__new__', userMessage);
    } else {
      await onSendMessage(conversation.id, userMessage);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-background relative overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-5 bg-background/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          <h2 className="font-medium text-sm text-foreground truncate">
            {conversation ? conversation.title : '新对话'}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {conversation && messages.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {messages.filter(m => !m.isError).length} 条消息
            </span>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 rounded-full border border-primary/20">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">已连接</span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 relative overflow-hidden">
        <ScrollArea className="h-full px-4 md:px-6 py-6">
          {messages.length === 0 ? (
            <EmptyState onNewConversation={onNewConversation} hasConversation={!!conversation} />
          ) : (
            <div className="max-w-3xl mx-auto w-full">
              {messages.map((msg, i) => (
                <div key={i} className="mb-5">
                  {msg.isError ? (
                    <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>服务错误</AlertTitle>
                      <AlertDescription className="text-sm font-mono break-all">
                        {msg.content}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <ChatMessage role={msg.role} content={msg.content} />
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex w-full mb-5 gap-3 animate-in fade-in">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                  </div>
                  <div className="chat-bubble-ai flex items-center gap-1 py-3">
                    <span className="typing-dot" />
                    <span className="typing-dot [animation-delay:0.2s]" />
                    <span className="typing-dot [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="px-4 md:px-6 py-4 border-t border-border bg-background/60 backdrop-blur-sm shrink-0">
        <div className="max-w-3xl mx-auto relative">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={conversation ? '继续对话...' : '开始新的对话...'}
            className="min-h-[52px] max-h-[180px] w-full pr-14 py-3.5 rounded-xl border-border bg-card focus:ring-primary/40 text-foreground resize-none text-sm"
          />
          <div className="absolute right-2.5 bottom-2.5">
            <Button
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="w-9 h-9 rounded-lg bg-primary hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-30 shadow-lg shadow-primary/20"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
        <p className="text-center text-[9px] text-muted-foreground/50 mt-2.5 uppercase tracking-widest">
          Powered by Custom AI · 对话已自动保存
        </p>
      </div>
    </div>
  );
}

function EmptyState({
  onNewConversation,
  hasConversation,
}: {
  onNewConversation: () => void;
  hasConversation: boolean;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center mt-16 text-center space-y-4 px-4">
      <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-2 border border-border">
        <Sparkles className="w-6 h-6 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          {hasConversation ? '这里空空的' : '欢迎使用 LlamaChat AI'}
        </h3>
        <p className="text-muted-foreground text-sm max-w-xs mt-1.5 leading-relaxed">
          {hasConversation
            ? '在下方输入框发送第一条消息，开启这段对话'
            : '点击「新建对话」或直接在下方输入，开始与 AI 交流'}
        </p>
      </div>
      {!hasConversation && (
        <Button
          onClick={onNewConversation}
          variant="outline"
          size="sm"
          className="gap-2 border-primary/30 text-primary hover:bg-primary/10 mt-2"
        >
          <MessageSquarePlus className="w-4 h-4" />
          新建对话
        </Button>
      )}
    </div>
  );
}
