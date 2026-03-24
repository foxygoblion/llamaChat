"use client";

import { useState, useCallback } from "react";
import { ChatSidebar } from "@/components/chat-sidebar";
import { ChatInterface } from "@/components/chat-interface";
import { useConversations } from "@/hooks/use-conversations";

export default function Home() {
  const {
    conversations,
    activeId,
    activeConversation,
    hydrated,
    setActiveId,
    createConversation,
    deleteConversation,
    addMessage,
    appendToLastMessage,
    renameConversation,
  } = useConversations();

  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = useCallback(
    async (convId: string, userMessage: string, contextStr?: string) => {
      // If __new__ or no conversation, create one first
      let targetId = convId;
      if (convId === "__new__" || !activeId) {
        targetId = createConversation();
        await new Promise((r) => setTimeout(r, 0));
      }

      // Add user message to history
      addMessage(targetId, { role: "user", content: userMessage });
      setIsLoading(true);

      try {
        // Build history (exclude errors)
        const conv = conversations.find((c) => c.id === targetId);
        const history = (conv?.messages ?? [])
          .filter((m) => !m.isError)
          .map((m) => ({ role: m.role, content: m.content }));

        // Prepend file context to the prompt if provided
        const promptWithContext = contextStr
          ? `${contextStr}\n\n用户问题：${userMessage}`
          : userMessage;

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: promptWithContext,
            history,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          addMessage(targetId, {
            role: "model",
            content: errorData.error || "连接 AI 服务失败",
            isError: true,
          });
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          addMessage(targetId, {
            role: "model",
            content: "读取响应流失败",
            isError: true,
          });
          return;
        }

        // Add placeholder model message
        addMessage(targetId, { role: "model", content: "" });

        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          appendToLastMessage(targetId, chunk);
        }
      } catch (error: any) {
        addMessage(targetId, {
          role: "model",
          content: `连接错误：${error.message || "无法连接到服务器"}`,
          isError: true,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [activeId, conversations, createConversation, addMessage, appendToLastMessage]
  );

  const handleNewConversation = useCallback(() => {
    createConversation();
  }, [createConversation]);

  if (!hydrated) {
    return (
      <main className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span>加载中...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen w-full overflow-hidden bg-background">
      <ChatSidebar
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={setActiveId}
        onNewConversation={handleNewConversation}
        onDeleteConversation={deleteConversation}
        onRenameConversation={renameConversation}
      />
      <ChatInterface
        conversation={activeConversation}
        onSendMessage={handleSendMessage}
        onNewConversation={handleNewConversation}
        isLoading={isLoading}
      />
    </main>
  );
}
