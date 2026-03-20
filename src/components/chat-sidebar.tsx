import React from 'react';
import { MessageSquare, Settings, Plus, Trash2, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export function ChatSidebar() {
  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-border w-64 p-4 shrink-0 hidden md:flex">
      <div className="flex items-center gap-2 px-2 py-4">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-primary-foreground" />
        </div>
        <h1 className="text-lg font-headline font-semibold text-foreground tracking-tight">LlamaChat AI</h1>
      </div>

      <Button variant="outline" className="w-full justify-start gap-2 mb-6 border-border hover:bg-muted text-foreground">
        <Plus className="w-4 h-4" />
        New Chat
      </Button>

      <div className="flex-1 overflow-y-auto space-y-2">
        <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <History className="w-3 h-3" />
          Recent Chats
        </div>
        
        {/* Mock history items */}
        {['General Inquiry', 'Code Optimization', 'Project Brainstorming'].map((title, i) => (
          <button
            key={i}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-md transition-colors hover:bg-muted text-muted-foreground hover:text-foreground group"
          >
            <span className="truncate">{title}</span>
            <Trash2 className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive" />
          </button>
        ))}
      </div>

      <Separator className="my-4 bg-border/50" />

      <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
        <Settings className="w-4 h-4" />
        Settings
      </Button>
    </div>
  );
}