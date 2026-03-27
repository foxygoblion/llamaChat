"use client";

import { useState, useCallback, useRef } from "react";
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
    isDuplicateMessage,
  } = useConversations();

  const [isLoading, setIsLoading] = useState(false);

  // Keep a ref to latest conversations so callbacks always see fresh data
  // without needing to be re-created (avoids stale closure bugs).
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  const handleSendMessage = useCallback(
    async (convId: string, userMessage: string, contextStr?: string) => {
      if (isLoading) return;
      
      // 去重检查：如果用户快速发送相同消息，阻止重复提交
      let targetId = convId;
      if (convId === '__new__' || !activeId) {
        targetId = createConversation();
      }
      
      const trimmedMessage = userMessage.trim();
      if (isDuplicateMessage(targetId, trimmedMessage)) {
        // 显示提示而不是阻止
        return;
      }

      // 1. Resolve / create conversation
      let targetId = convId;
      if (convId === "__new__" || !activeId) {
        targetId = createConversation();
        // Wait one tick so the new conversation is in the ref before we use it
        await new Promise((r) => setTimeout(r, 0));
      }

      // 2. Snapshot the CURRENT history BEFORE adding the new user message.
      //    Key fix: read from ref (latest state) synchronously before
      //    addMessage updates state, so history never includes current turn.
      const currentMessages =
        conversationsRef.current.find((c) => c.id === targetId)?.messages ?? [];

      const history = currentMessages
        .filter((m) => !m.isError)
        .map((m) => ({ role: m.role, content: m.content }));

      // 3. Optimistically add user message to UI
      addMessage(targetId, { role: "user", content: userMessage });
      setIsLoading(true);

      try {
        const promptWithContext = contextStr
          ? `${contextStr}\n\n用户问题：${userMessage}`
          : userMessage;

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: promptWithContext,
            history, // pre-snapshot — does NOT include current turn
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

        // 4. Add empty placeholder then stream into it
        addMessage(targetId, { role: "model", content: "" });

        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const token = decoder.decode(value, { stream: true });
          if (token) appendToLastMessage(targetId, token);
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
    // intentionally omit `conversations` — use conversationsRef to avoid
    // stale closures while preventing infinite re-creates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeId, isLoading, createConversation, addMessage, appendToLastMessage]
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
