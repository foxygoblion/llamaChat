"use client";

import React from "react";
import {
  FileCode,
  FileText,
  X,
  GitFork,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AttachedFile, FileLanguage } from "@/hooks/use-file-context";

const LANG_COLORS: Record<string, string> = {
  lua: "border-purple-300/40 bg-purple-300/10 text-purple-200",
  typescript: "border-blue-500/40 bg-blue-500/10 text-blue-300",
  javascript: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  python: "border-green-500/40 bg-green-500/10 text-green-300",
  rust: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  go: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
  java: "border-red-500/40 bg-red-500/10 text-red-300",
  cpp: "border-purple-500/40 bg-purple-500/10 text-purple-300",
  c: "border-purple-400/40 bg-purple-400/10 text-purple-200",
  css: "border-pink-500/40 bg-pink-500/10 text-pink-300",
  html: "border-orange-400/40 bg-orange-400/10 text-orange-200",
  json: "border-gray-400/40 bg-gray-400/10 text-gray-300",
  yaml: "border-gray-400/40 bg-gray-400/10 text-gray-300",
  markdown: "border-gray-300/40 bg-gray-300/10 text-gray-200",
  shell: "border-green-400/40 bg-green-400/10 text-green-200",
  sql: "border-blue-300/40 bg-blue-300/10 text-blue-200",
  text: "border-gray-400/40 bg-gray-400/10 text-gray-300",
  unknown: "border-gray-500/30 bg-gray-500/10 text-gray-400",
};

interface FileAttachmentBarProps {
  files: AttachedFile[];
  repoName: string;
  selectedCount: number;
  onRemoveFile: (id: string) => void;
  onToggleFile: (path: string, selected: boolean) => void;
  onOpenRepoTree: () => void;
  onClearRepo: () => void;
}

export function FileAttachmentBar({
  files,
  repoName,
  selectedCount,
  onRemoveFile,
  onToggleFile,
  onOpenRepoTree,
  onClearRepo,
}: FileAttachmentBarProps) {
  const standaloneFiles = files.filter((f) => !f.fromRepo);
  const repoFiles = files.filter((f) => f.fromRepo);

  if (files.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 px-1 pb-2">
      {/* Repo summary chip */}
      {repoFiles.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenRepoTree}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/8 hover:bg-primary/15 transition-colors group"
          >
            <GitFork className="w-3.5 h-3.5 text-primary/80" />
            <span className="text-[11px] font-medium text-primary/90">
              {repoName}
            </span>
            <span className="text-[10px] text-primary/50 bg-primary/10 px-1.5 py-0.5 rounded-full">
              {selectedCount}/{repoFiles.length} 文件
            </span>
          </button>
          <button
            onClick={onClearRepo}
            className="text-[10px] text-muted-foreground hover:text-destructive transition-colors px-1.5 py-1 rounded"
          >
            移除仓库
          </button>
        </div>
      )}

      {/* Standalone files */}
      {standaloneFiles.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {standaloneFiles.map((file) => (
            <FileChip
              key={file.id}
              file={file}
              onRemove={() => onRemoveFile(file.id)}
              onToggle={() => onToggleFile(file.path, !file.selected)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FileChip({
  file,
  onRemove,
  onToggle,
}: {
  file: AttachedFile;
  onRemove: () => void;
  onToggle: () => void;
}) {
  const colorClass =
    LANG_COLORS[file.language as string] ?? LANG_COLORS.unknown;
  console.log("Lua 文件状态：", file.name, file.language, file.selected);
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg border text-[11px] font-medium transition-all",
        colorClass,
        !file.selected && "opacity-40 line-through"
      )}
    >
      <FileCode className="w-3 h-3 shrink-0" />
      <span className="max-w-[140px] truncate">{file.name}</span>
      <span className="opacity-50 text-[9px]">
        {file.size < 1024
          ? `${file.size}B`
          : `${(file.size / 1024).toFixed(1)}K`}
      </span>
      <button
        onClick={onToggle}
        className="opacity-50 hover:opacity-100 transition-opacity p-0.5 rounded"
        title={file.selected ? "排除此文件" : "包含此文件"}
      >
        {file.selected ? (
          <Eye className="w-3 h-3" />
        ) : (
          <EyeOff className="w-3 h-3" />
        )}
      </button>
      <button
        onClick={onRemove}
        className="opacity-50 hover:opacity-100 transition-opacity p-0.5 rounded hover:text-red-400"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
