"use client";

import React, { useRef, useState } from "react";
import { Paperclip, FolderOpen, Upload, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadButtonsProps {
  onFileSelect: (file: File) => Promise<void>;
  onRepoSelect: (files: FileList) => Promise<void>;
  isProcessingRepo: boolean;
  disabled?: boolean;
}

export function UploadButtons({
  onFileSelect,
  onRepoSelect,
  isProcessingRepo,
  disabled,
}: UploadButtonsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const repoInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      await onFileSelect(file);
    } catch (err: any) {
      setError(err.message ?? "上传失败");
      setTimeout(() => setError(null), 3000);
    }
    e.target.value = "";
  };

  const handleRepoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError(null);
    try {
      await onRepoSelect(files);
    } catch (err: any) {
      setError(err.message ?? "仓库加载失败");
      setTimeout(() => setError(null), 3000);
    }
    e.target.value = "";
  };

  return (
    <div className="relative flex items-center gap-0.5">
      {/* Single file upload */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isProcessingRepo}
        title="上传单个文件"
        className={cn(
          "w-8 h-8 flex items-center justify-center rounded-lg transition-all",
          "text-muted-foreground hover:text-foreground hover:bg-muted/60",
          "disabled:opacity-30 disabled:cursor-not-allowed"
        )}
      >
        <Paperclip className="w-4 h-4" />
      </button>

      {/* Repo upload */}
      <button
        type="button"
        onClick={() => repoInputRef.current?.click()}
        disabled={disabled || isProcessingRepo}
        title="上传代码仓库"
        className={cn(
          "w-8 h-8 flex items-center justify-center rounded-lg transition-all relative",
          "text-muted-foreground hover:text-foreground hover:bg-muted/60",
          "disabled:opacity-30 disabled:cursor-not-allowed"
        )}
      >
        {isProcessingRepo ? (
          <Upload className="w-4 h-4 animate-bounce text-primary" />
        ) : (
          <FolderOpen className="w-4 h-4" />
        )}
      </button>

      {/* Error tooltip */}
      {error && (
        <div className="absolute bottom-full left-0 mb-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-destructive/90 text-destructive-foreground text-[11px] rounded-lg whitespace-nowrap shadow-lg z-50">
          <AlertTriangle className="w-3 h-3" />
          {error}
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ts,.tsx,.js,.jsx,.mjs,.cjs,.py,.rs,.go,.java,.cpp,.cc,.cxx,.c,.h,.hpp,.css,.scss,.less,.html,.htm,.json,.jsonc,.yaml,.yml,.md,.mdx,.sh,.bash,.zsh,.sql,.txt,.env,.gitignore,.prettierrc,.eslintrc,.lua"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={repoInputRef}
        type="file"
        // @ts-ignore — webkitdirectory is valid HTML but missing from TS types
        webkitdirectory="true"
        multiple
        onChange={handleRepoChange}
        className="hidden"
      />
    </div>
  );
}

// ── Drop zone wrapper ─────────────────────────────────────────────────────────
interface DropZoneProps {
  onFileDrop: (file: File) => Promise<void>;
  onRepoDrop: (files: FileList) => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
}

export function DropZone({
  onFileDrop,
  children,
  disabled,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCount = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCount.current++;
    if (dragCount.current === 1) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCount.current--;
    if (dragCount.current === 0) setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCount.current = 0;
    setIsDragging(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length === 1) {
      await onFileDrop(files[0]);
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="relative"
    >
      {isDragging && !disabled && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-primary/60 bg-primary/5 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-primary animate-bounce" />
            <span className="text-sm font-medium text-primary">拖放文件到这里</span>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
