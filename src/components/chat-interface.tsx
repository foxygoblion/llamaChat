"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Loader2,
  Sparkles,
  AlertCircle,
  MessageSquarePlus,
  GitBranch,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatMessage } from "./chat-message";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RepoTreeBrowser } from "./repo-tree-browser";
import { FileAttachmentBar } from "./file-attachment-bar";
import { UploadButtons, DropZone } from "./upload-buttons";
import { useFileContext } from "@/hooks/use-file-context";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/hooks/use-conversations";

interface ChatInterfaceProps {
  conversation: Conversation | null;
  onSendMessage: (convId: string, userMsg: string, contextStr?: string) => Promise<void>;
  onNewConversation: () => void;
  isLoading: boolean;
}

export function ChatInterface({
  conversation,
  onSendMessage,
  onNewConversation,
  isLoading,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [showRepoTree, setShowRepoTree] = useState(false);
  const [showContextPreview, setShowContextPreview] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    attachedFiles,
    repoTree,
    repoName,
    isProcessingRepo,
    selectedCount,
    totalFiles,
    addFile,
    removeFile,
    loadRepo,
    clearRepo,
    toggleFile,
    toggleDir,
    buildContextString,
  } = useFileContext();

  const messages = conversation?.messages ?? [];

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-open tree when repo first loaded
  useEffect(() => {
    if (repoTree) setShowRepoTree(true);
  }, [repoTree]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!input.trim() || isLoading) return;

      const userMessage = input.trim();
      setInput("");

      const contextStr = buildContextString();
      const targetId = conversation?.id ?? "__new__";
      await onSendMessage(targetId, userMessage, contextStr || undefined);
    },
    [input, isLoading, buildContextString, conversation, onSendMessage]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const contextStr = buildContextString();
  const hasContext = attachedFiles.filter((f) => f.selected).length > 0;

  return (
    <div className="flex flex-col flex-1 h-full bg-background overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-5 bg-background/80 backdrop-blur-md sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          <h2 className="font-medium text-sm text-foreground truncate">
            {conversation ? conversation.title : "新对话"}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasContext && (
            <button
              onClick={() => setShowContextPreview((v) => !v)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-green-500/30 bg-green-500/8 hover:bg-green-500/15 transition-colors"
            >
              <GitBranch className="w-3 h-3 text-green-400" />
              <span className="text-[10px] text-green-400">
                {selectedCount} 文件上下文
              </span>
              {showContextPreview ? (
                <ChevronUp className="w-3 h-3 text-green-400/70" />
              ) : (
                <ChevronDown className="w-3 h-3 text-green-400/70" />
              )}
            </button>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 rounded-full border border-primary/20">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">
              已连接
            </span>
          </div>
        </div>
      </header>

      {/* Context Preview Panel */}
      {showContextPreview && hasContext && (
        <div className="border-b border-border/50 bg-[hsl(231,16%,11%)] shrink-0">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-green-400/80">
                代码上下文预览（将随下一条消息发送）
              </span>
              <span className="text-[10px] text-muted-foreground">
                {new Blob([contextStr]).size < 1024
                  ? `${new Blob([contextStr]).size} B`
                  : `${(new Blob([contextStr]).size / 1024).toFixed(1)} KB`}
              </span>
            </div>
            <pre className="text-[10px] font-mono text-muted-foreground bg-muted/30 rounded-lg p-3 max-h-32 overflow-auto leading-relaxed">
              {contextStr.slice(0, 800)}
              {contextStr.length > 800 && "\n... (更多内容已截断)"}
            </pre>
          </div>
        </div>
      )}

      {/* Repo Tree Side Panel */}
      {showRepoTree && repoTree && (
        <div
          className="fixed inset-y-0 right-0 z-30 w-80 shadow-2xl"
          style={{ top: "3.5rem" }}
        >
          <RepoTreeBrowser
            tree={repoTree}
            repoName={repoName}
            attachedFiles={attachedFiles}
            onToggleFile={toggleFile}
            onToggleDir={toggleDir}
            onClose={() => setShowRepoTree(false)}
            selectedCount={selectedCount}
            totalFiles={totalFiles}
          />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 relative overflow-hidden">
        <ScrollArea className="h-full px-4 md:px-6 py-6">
          {messages.length === 0 ? (
            <EmptyState
              onNewConversation={onNewConversation}
              hasConversation={!!conversation}
            />
          ) : (
            <div
              className={cn(
                "mx-auto w-full transition-all duration-300",
                showRepoTree && repoTree ? "max-w-2xl" : "max-w-3xl"
              )}
            >
              {messages.map((msg, i) => (
                <div key={i} className="mb-5">
                  {msg.isError ? (
                    <Alert
                      variant="destructive"
                      className="bg-destructive/10 border-destructive/20"
                    >
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

              {isLoading && messages[messages.length - 1]?.role === "user" && (
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
      <div
        className={cn(
          "px-4 md:px-6 py-4 border-t border-border bg-background/60 backdrop-blur-sm shrink-0 transition-all duration-300",
          showRepoTree && repoTree ? "mr-80" : ""
        )}
      >
        <div className="max-w-3xl mx-auto">
          <DropZone onFileDrop={addFile} onRepoDrop={loadRepo} disabled={isLoading}>
            {/* Attached files bar */}
            {attachedFiles.length > 0 && (
              <FileAttachmentBar
                files={attachedFiles}
                repoName={repoName}
                selectedCount={selectedCount}
                onRemoveFile={removeFile}
                onToggleFile={toggleFile}
                onOpenRepoTree={() => setShowRepoTree(true)}
                onClearRepo={clearRepo}
              />
            )}

            {/* Text input row */}
            <div className="relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  hasContext
                    ? `描述你的问题，${selectedCount} 个代码文件已就绪...`
                    : conversation
                    ? "继续对话，或拖拽文件来添加代码上下文..."
                    : "开始新的对话，可拖拽文件或点击下方按钮上传代码..."
                }
                className="min-h-[52px] max-h-[180px] w-full pl-3 pr-24 py-3.5 rounded-xl border-border bg-card focus:ring-primary/40 text-foreground resize-none text-sm"
              />

              {/* Bottom-right controls */}
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <UploadButtons
                  onFileSelect={addFile}
                  onRepoSelect={loadRepo}
                  isProcessingRepo={isProcessingRepo}
                  disabled={isLoading}
                />
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
          </DropZone>
        </div>

        <p className="text-center text-[9px] text-muted-foreground/40 mt-2.5 uppercase tracking-widest">
          {hasContext
            ? `📎 ${selectedCount} 个文件将作为上下文 · Shift+Enter 换行`
            : "📎 单文件 · 🗂 仓库 · 拖拽上传 · Shift+Enter 换行"}
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
    <div className="h-full flex flex-col items-center justify-center mt-12 text-center space-y-4 px-6">
      <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center mb-1 border border-border/60">
        <Sparkles className="w-7 h-7 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          {hasConversation ? "开始这段对话" : "欢迎使用 LlamaChat AI"}
        </h3>
        <p className="text-muted-foreground text-sm max-w-sm mt-1.5 leading-relaxed">
          {hasConversation
            ? "在下方输入框发送第一条消息，或上传代码文件作为上下文"
            : "可以直接聊天，也可以上传单个文件或整个代码仓库来找 Bug、分析代码"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2 max-w-xs w-full">
        {[
          { icon: "📎", label: "单文件上传", desc: "TS/JS/PY/RS..." },
          { icon: "🗂", label: "仓库上传", desc: "选择文件夹" },
          { icon: "✅", label: "按需选择", desc: "勾选相关文件" },
          { icon: "🔍", label: "精准找 Bug", desc: "代码上下文" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/40 text-left"
          >
            <span className="text-base">{item.icon}</span>
            <div>
              <p className="text-[11px] font-medium text-foreground/80">
                {item.label}
              </p>
              <p className="text-[10px] text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {!hasConversation && (
        <Button
          onClick={onNewConversation}
          variant="outline"
          size="sm"
          className="gap-2 border-primary/30 text-primary hover:bg-primary/10 mt-1"
        >
          <MessageSquarePlus className="w-4 h-4" />
          新建对话
        </Button>
      )}
    </div>
  );
}
