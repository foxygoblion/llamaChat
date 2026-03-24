"use client";

import React, { useState, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  X,
  CheckSquare,
  Square,
  Minus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RepoNode, FileLanguage } from "@/hooks/use-file-context";

interface RepoTreeProps {
  tree: RepoNode;
  repoName: string;
  attachedFiles: Array<{ path: string; selected: boolean }>;
  onToggleFile: (path: string, selected: boolean) => void;
  onToggleDir: (path: string, selected: boolean) => void;
  onClose: () => void;
  selectedCount: number;
  totalFiles: number;
}

const LANG_COLORS: Record<FileLanguage, string> = {
  typescript: "text-blue-400",
  javascript: "text-yellow-400",
  python: "text-green-400",
  rust: "text-orange-400",
  go: "text-cyan-400",
  java: "text-red-400",
  cpp: "text-purple-400",
  c: "text-purple-300",
  css: "text-pink-400",
  html: "text-orange-300",
  json: "text-gray-400",
  yaml: "text-gray-400",
  markdown: "text-gray-300",
  shell: "text-green-300",
  sql: "text-blue-300",
  text: "text-gray-400",
  unknown: "text-gray-500",
};

const LANG_LABELS: Partial<Record<FileLanguage, string>> = {
  typescript: "TS",
  javascript: "JS",
  python: "PY",
  rust: "RS",
  go: "GO",
  java: "JV",
  cpp: "C++",
  c: "C",
  css: "CSS",
  html: "HTML",
  json: "JSON",
  yaml: "YAML",
  markdown: "MD",
  shell: "SH",
  sql: "SQL",
};

function FileIcon({ language }: { language?: FileLanguage }) {
  if (!language || language === "unknown" || language === "text") {
    return <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />;
  }
  return (
    <FileCode
      className={cn("w-3.5 h-3.5 shrink-0", LANG_COLORS[language] ?? "text-gray-400")}
    />
  );
}

function getDirSelectionState(
  dirPath: string,
  files: Array<{ path: string; selected: boolean }>
): "all" | "none" | "partial" {
  const dirFiles = files.filter(
    (f) => f.path.startsWith(dirPath + "/") || f.path === dirPath
  );
  if (dirFiles.length === 0) return "none";
  const sel = dirFiles.filter((f) => f.selected).length;
  if (sel === 0) return "none";
  if (sel === dirFiles.length) return "all";
  return "partial";
}

interface TreeNodeProps {
  node: RepoNode;
  depth: number;
  files: Array<{ path: string; selected: boolean }>;
  onToggleFile: (path: string, selected: boolean) => void;
  onToggleDir: (path: string, selected: boolean) => void;
  filter: string;
}

function TreeNode({
  node,
  depth,
  files,
  onToggleFile,
  onToggleDir,
  filter,
}: TreeNodeProps) {
  const [open, setOpen] = useState(depth < 2);

  const matchesFilter = useCallback(
    (n: RepoNode): boolean => {
      if (!filter) return true;
      if (n.type === "file") {
        return n.name.toLowerCase().includes(filter.toLowerCase());
      }
      return (n.children ?? []).some(matchesFilter);
    },
    [filter]
  );

  if (!matchesFilter(node)) return null;

  if (node.type === "file") {
    const fileState = files.find((f) => f.path === node.path);
    const selected = fileState?.selected ?? node.selected ?? true;

    return (
      <div
        className={cn(
          "flex items-center gap-1.5 py-[3px] px-2 rounded cursor-pointer group select-none",
          "hover:bg-white/5 transition-colors"
        )}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={() => onToggleFile(node.path, !selected)}
      >
        {/* Checkbox */}
        <div className="shrink-0 text-muted-foreground">
          {selected ? (
            <CheckSquare className="w-3.5 h-3.5 text-primary" />
          ) : (
            <Square className="w-3.5 h-3.5" />
          )}
        </div>
        <FileIcon language={node.language} />
        <span
          className={cn(
            "text-[12px] truncate flex-1",
            selected ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {node.name}
        </span>
        {node.language && LANG_LABELS[node.language] && (
          <span
            className={cn(
              "text-[9px] font-mono shrink-0 opacity-60",
              LANG_COLORS[node.language]
            )}
          >
            {LANG_LABELS[node.language]}
          </span>
        )}
        {node.size && (
          <span className="text-[9px] text-muted-foreground/50 shrink-0">
            {node.size < 1024
              ? `${node.size}B`
              : `${(node.size / 1024).toFixed(1)}K`}
          </span>
        )}
      </div>
    );
  }

  // Directory node
  const dirState = getDirSelectionState(node.path, files);

  const CheckIcon =
    dirState === "all"
      ? CheckSquare
      : dirState === "partial"
      ? Minus
      : Square;

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-[3px] px-2 rounded hover:bg-white/5 transition-colors cursor-pointer select-none group"
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={() => setOpen((o) => !o)}
      >
        {/* Dir checkbox */}
        <div
          className="shrink-0 text-muted-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onToggleDir(node.path, dirState !== "all");
          }}
        >
          <CheckIcon
            className={cn(
              "w-3.5 h-3.5",
              dirState !== "none" ? "text-primary/70" : ""
            )}
          />
        </div>

        {open ? (
          <FolderOpen className="w-3.5 h-3.5 text-yellow-400/80 shrink-0" />
        ) : (
          <Folder className="w-3.5 h-3.5 text-yellow-400/60 shrink-0" />
        )}
        <span className="text-[12px] text-foreground/80 flex-1 truncate font-medium">
          {node.name}
        </span>
        <span className="text-[9px] text-muted-foreground/40">
          {node.children?.length ?? 0}
        </span>
        {open ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground/50" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
        )}
      </div>

      {open && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              files={files}
              onToggleFile={onToggleFile}
              onToggleDir={onToggleDir}
              filter={filter}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function RepoTreeBrowser({
  tree,
  repoName,
  attachedFiles,
  onToggleFile,
  onToggleDir,
  onClose,
  selectedCount,
  totalFiles,
}: RepoTreeProps) {
  const [filter, setFilter] = useState("");

  return (
    <div className="flex flex-col h-full bg-[hsl(231,16%,11%)] border border-border/60 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50 bg-[hsl(231,16%,13%)]">
        <div className="flex items-center gap-2 min-w-0">
          <Folder className="w-4 h-4 text-yellow-400 shrink-0" />
          <span className="text-sm font-mono text-foreground truncate">{repoName}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-muted-foreground">
            {selectedCount}/{totalFiles} 已选
          </span>
          <button
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border/30">
        <div className="flex items-center gap-2 bg-muted/40 rounded-md px-2.5 py-1.5">
          <Search className="w-3 h-3 text-muted-foreground shrink-0" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="过滤文件..."
            className="flex-1 bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground/50 outline-none"
          />
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/20">
        <button
          className="text-[10px] text-primary/70 hover:text-primary transition-colors"
          onClick={() => {
            tree.children?.forEach((child) => {
              if (child.type === "dir") onToggleDir(child.path, true);
              else onToggleFile(child.path, true);
            });
          }}
        >
          全选
        </button>
        <span className="text-muted-foreground/30">·</span>
        <button
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => {
            tree.children?.forEach((child) => {
              if (child.type === "dir") onToggleDir(child.path, false);
              else onToggleFile(child.path, false);
            });
          }}
        >
          取消全选
        </button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1 font-mono">
        {tree.children?.map((child) => (
          <TreeNode
            key={child.path || child.name}
            node={child}
            depth={0}
            files={attachedFiles}
            onToggleFile={onToggleFile}
            onToggleDir={onToggleDir}
            filter={filter}
          />
        ))}
      </div>

      {/* Footer stats */}
      <div className="px-3 py-2 border-t border-border/30 bg-[hsl(231,16%,12%)]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {selectedCount > 0
              ? `${selectedCount} 个文件将作为代码上下文`
              : "未选择文件"}
          </span>
          {selectedCount > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] text-primary">上下文已就绪</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
