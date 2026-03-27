"use client";

import { useState, useEffect, useCallback } from 'react';

export interface Message {
  id: string; // 消息唯一 ID
  timestamp: number; // 消息时间戳
  role: 'user' | 'model';
  content: string;
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'llamachat_conversations';
const ACTIVE_CONV_KEY = 'llamachat_active_conversation';

function generateMessageId(): string {
  return 'msg_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function generateTitle(firstMessage: string): string {
  return firstMessage.length > 40
    ? firstMessage.slice(0, 40) + '...'
    : firstMessage;
}

function loadFromStorage(): Conversation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Conversation[];
  } catch {
    return [];
  }
}

function saveToStorage(conversations: Conversation[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch {
    // storage full or unavailable
  }
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadFromStorage();
    setConversations(stored);
    const savedActiveId = localStorage.getItem(ACTIVE_CONV_KEY);
    if (savedActiveId && stored.find(c => c.id === savedActiveId)) {
      setActiveId(savedActiveId);
    } else if (stored.length > 0) {
      setActiveId(stored[0].id);
    }
    setHydrated(true);
  }, []);

  // Persist active id
  useEffect(() => {
    if (!hydrated) return;
    if (activeId) {
      localStorage.setItem(ACTIVE_CONV_KEY, activeId);
    } else {
      localStorage.removeItem(ACTIVE_CONV_KEY);
    }
  }, [activeId, hydrated]);

  const activeConversation = conversations.find(c => c.id === activeId) ?? null;

  const createConversation = useCallback((): string => {
    const newConv: Conversation = {
      id: generateId(),
      title: '新对话',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setConversations(prev => {
      const updated = [newConv, ...prev];
      saveToStorage(updated);
      return updated;
    });
    setActiveId(newConv.id);
    return newConv.id;
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== id);
      saveToStorage(updated);
      return updated;
    });
    setActiveId(prev => {
      if (prev !== id) return prev;
      const remaining = conversations.filter(c => c.id !== id);
      return remaining.length > 0 ? remaining[0].id : null;
    });
  }, [conversations]);

  const addMessage = useCallback((convId: string, message: Omit<Message, 'timestamp'>) => {
    setConversations(prev => {
      const updated = prev.map(c => {
        if (c.id !== convId) return c;
        const newMessages = [...c.messages, { ...message, timestamp: Date.now() }];
        const title =
          c.title === '新对话' && message.role === 'user'
            ? generateTitle(message.content)
            : c.title;
        return { ...c, messages: newMessages, title, updatedAt: Date.now() };
      });
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const updateLastMessage = useCallback((convId: string, content: string) => {
    setConversations(prev => {
      const updated = prev.map(c => {
        if (c.id !== convId) return c;
        const messages = [...c.messages];
        if (messages.length > 0) {
          messages[messages.length - 1] = {
            ...messages[messages.length - 1],
            content,
          };
        }
        return { ...c, messages, updatedAt: Date.now() };
      });
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const appendToLastMessage = useCallback((convId: string, chunk: string) => {
    setConversations(prev => {
      const updated = prev.map(c => {
        if (c.id !== convId) return c;
        const messages = [...c.messages];
        if (messages.length > 0) {
          const last = messages[messages.length - 1];
          messages[messages.length - 1] = {
            ...last,
            content: last.content + chunk,
          };
        }
        return { ...c, messages, updatedAt: Date.now() };
      });
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const renameConversation = useCallback((id: string, title: string) => {
    setConversations(prev => {
      const updated = prev.map(c =>
        c.id === id ? { ...c, title, updatedAt: Date.now() } : c
      );
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const isDuplicateMessage = useCallback((convId: string, message: string): boolean => {
    const conversation = conversations.find(c => c.id === convId);
    if (!conversation || conversation.messages.length === 0) {
      return false;
    }
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    if (lastMessage.role !== 'user') {
      return false;
    }
    return lastMessage.content.trim() === message.trim();
  }, [conversations]);

  return {
    conversations,
    activeId,
    activeConversation,
    hydrated,
    setActiveId,
    createConversation,
    deleteConversation,
    addMessage,
    updateLastMessage,
    appendToLastMessage,
    renameConversation,
    isDuplicateMessage,
  };
}
