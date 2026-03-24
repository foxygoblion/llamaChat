"use client";

import React, { useState } from 'react';
import { MessageSquare, Plus, Trash2, History, Edit2, Check, X, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/hooks/use-conversations';

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => void;
}

function formatTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}天前`;
  return new Date(ts).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

export function ChatSidebar({
  conversations,
  activeId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
}: ChatSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const startEdit = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const commitEdit = (id: string) => {
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-border w-64 shrink-0 hidden md:flex">
      {/* Logo / Brand */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border/50">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
          <Bot className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-foreground tracking-tight leading-none">LlamaChat AI</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wider uppercase">智能对话助手</p>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="px-3 py-3">
        <Button
          onClick={onNewConversation}
          className="w-full justify-start gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 transition-all"
          variant="ghost"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">新建对话</span>
        </Button>
      </div>

      <Separator className="bg-border/50 mx-3" style={{ width: 'calc(100% - 24px)' }} />

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3">
              <History className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">暂无对话记录</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">点击「新建对话」开始聊天</p>
          </div>
        ) : (
          <>
            <div className="px-2 py-1.5 flex items-center gap-1.5">
              <History className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                历史对话 ({conversations.length})
              </span>
            </div>
            {conversations.map(conv => (
              <div
                key={conv.id}
                onMouseEnter={() => setHoveredId(conv.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => editingId !== conv.id && onSelectConversation(conv.id)}
                className={cn(
                  'group relative flex items-start gap-2 px-2.5 py-2.5 rounded-lg cursor-pointer transition-all duration-150',
                  activeId === conv.id
                    ? 'bg-primary/15 border border-primary/20'
                    : 'hover:bg-muted/60 border border-transparent'
                )}
              >
                <MessageSquare
                  className={cn(
                    'w-3.5 h-3.5 mt-0.5 shrink-0',
                    activeId === conv.id ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                <div className="flex-1 min-w-0">
                  {editingId === conv.id ? (
                    <div
                      className="flex items-center gap-1"
                      onClick={e => e.stopPropagation()}
                    >
                      <Input
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitEdit(conv.id);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        autoFocus
                        className="h-6 text-xs px-1.5 py-0 bg-background border-border"
                      />
                      <button
                        onClick={() => commitEdit(conv.id)}
                        className="text-primary hover:text-primary/80 shrink-0"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-muted-foreground hover:text-foreground shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p
                        className={cn(
                          'text-xs font-medium truncate leading-tight',
                          activeId === conv.id ? 'text-foreground' : 'text-foreground/80'
                        )}
                      >
                        {conv.title}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {conv.messages.length > 0
                            ? `${conv.messages.filter(m => !m.isError).length} 条消息`
                            : '空对话'}
                        </span>
                        <span className="text-[10px] text-muted-foreground/50">·</span>
                        <span className="text-[10px] text-muted-foreground/70">
                          {formatTime(conv.updatedAt)}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Action buttons */}
                {editingId !== conv.id && (hoveredId === conv.id || activeId === conv.id) && (
                  <div
                    className="flex items-center gap-0.5 shrink-0"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={e => startEdit(conv, e)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="重命名"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onDeleteConversation(conv.id);
                      }}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border/50">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/40">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] text-muted-foreground">对话数据已本地持久化</span>
        </div>
      </div>
    </div>
  );
}
