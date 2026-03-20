"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChatMessage } from './chat-message';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Message {
  role: 'user' | 'model';
  content: string;
  isError?: boolean;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMessage,
          history: messages.filter(m => !m.isError),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to connect to AI service';
        setMessages(prev => [...prev, { 
          role: 'model', 
          content: errorMessage,
          isError: true 
        }]);
        setIsLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setMessages(prev => [...prev, { role: 'model', content: 'Failed to read response stream', isError: true }]);
        setIsLoading(false);
        return;
      }

      setMessages(prev => [...prev, { role: 'model', content: '' }]);

      let accumulatedResponse = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        accumulatedResponse += chunk;

        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg && lastMsg.role === 'model') {
            lastMsg.content = accumulatedResponse;
          }
          return newMessages;
        });
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'model', 
        content: `Connection Error: ${error.message || 'Could not connect to the server.'}`,
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-background relative">
      <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="font-headline font-medium text-foreground">Active Session</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">Connected</span>
          </div>
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden">
        <ScrollArea className="h-full px-6 py-8">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center mt-20 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4 border border-border">
                <Sparkles className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-headline font-semibold text-foreground">Welcome to LlamaChat AI</h3>
              <p className="text-muted-foreground max-w-sm text-sm">
                Powered by your custom AI service. Ask me anything about data governance, coding, or general knowledge.
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full">
              {messages.map((msg, i) => (
                <div key={i} className="mb-6">
                  {msg.isError ? (
                    <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive-foreground">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Service Error</AlertTitle>
                      <AlertDescription className="text-sm font-mono break-all">
                        {msg.content}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <ChatMessage role={msg.role} content={msg.content} />
                  )}
                </div>
              ))}
              {isLoading && messages[messages.length-1]?.role === 'user' && (
                <div className="flex w-full mb-6 gap-4 animate-in fade-in">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  </div>
                  <div className="chat-bubble-ai flex items-center gap-1">
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

      <div className="p-6 border-t border-border bg-background/50">
        <div className="max-w-3xl mx-auto relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message here..."
            className="min-h-[60px] max-h-[200px] w-full pr-14 py-4 rounded-xl border-border bg-card focus:ring-primary/50 text-foreground resize-none"
          />
          <div className="absolute right-3 bottom-3">
            <Button
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="w-10 h-10 rounded-lg bg-primary hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-30"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-4 uppercase tracking-widest font-medium">
          Powered by your Custom AI service
        </p>
      </div>
    </div>
  );
}
