"use client";

import { useState, useCallback } from "react";

export type FileLanguage =
    "lua"
  | "typescript"
  | "javascript"
  | "python"
  | "rust"
  | "go"
  | "java"
  | "cpp"
  | "c"
  | "css"
  | "html"
  | "json"
  | "yaml"
  | "markdown"
  | "shell"
  | "sql"
  | "text"
  | "unknown";

export interface AttachedFile {
  id: string;
  name: string;
  path: string; // relative path (for repo files)
  content: string;
  language: FileLanguage;
  size: number; // bytes
  selected: boolean; // for repo files, whether included in context
  fromRepo: boolean;
}

export interface RepoNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: RepoNode[];
  language?: FileLanguage;
  size?: number;
  content?: string;
  selected?: boolean;
}

const LANG_MAP: Record<string, FileLanguage> = {
  lua: "lua",
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  py: "python",
  rs: "rust",
  go: "go",
  java: "java",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  c: "c",
  h: "c",
  hpp: "cpp",
  css: "css",
  scss: "css",
  less: "css",
  html: "html",
  htm: "html",
  json: "json",
  jsonc: "json",
  yaml: "yaml",
  yml: "yaml",
  md: "markdown",
  mdx: "markdown",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  fish: "shell",
  sql: "sql",
  txt: "text",
  env: "text",
  gitignore: "text",
  prettierrc: "json",
  eslintrc: "json",
};

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".turbo",
  ".cache",
  "coverage",
  "__pycache__",
  ".venv",
  "venv",
  ".idea",
  ".vscode",
  "vendor",
  "target",
  ".DS_Store",
]);

const MAX_FILE_SIZE = 500 * 1024; // 500KB per file
const MAX_TOTAL_CONTEXT = 200 * 1024; // 200KB total context

function detectLanguage(filename: string): FileLanguage {
  const parts = filename.split(".");
  if (parts.length < 2) return "text";
  const ext = parts[parts.length - 1].toLowerCase();
  return LANG_MAP[ext] ?? "unknown";
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function isTextFile(filename: string): boolean {
  const lang = detectLanguage(filename);
  return lang !== "unknown";
}

async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file, "utf-8");
  });
}

function buildTree(files: File[]): RepoNode {
  const root: RepoNode = { name: "root", path: "", type: "dir", children: [] };

  for (const file of files) {
    // webkitRelativePath: "folderName/src/index.ts"
    const relativePath = (file as any).webkitRelativePath || file.name;
    const parts = relativePath.split("/");

    // Skip ignored dirs
    if (parts.some((p: string) => IGNORED_DIRS.has(p))) continue;
    // Skip non-text files
    if (!isTextFile(parts[parts.length - 1])) continue;
    // Skip large files
    if (file.size > MAX_FILE_SIZE) continue;

    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      let child = node.children?.find(
        (c) => c.name === part && c.type === "dir"
      );
      if (!child) {
        child = {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          type: "dir",
          children: [],
        };
        node.children = node.children ?? [];
        node.children.push(child);
      }
      node = child;
    }

    const fileName = parts[parts.length - 1];
    node.children = node.children ?? [];
    node.children.push({
      name: fileName,
      path: relativePath,
      type: "file",
      language: detectLanguage(fileName),
      size: file.size,
      selected: true, // default selected
    });
  }

  return root;
}

function sortTree(node: RepoNode): RepoNode {
  if (!node.children) return node;
  node.children = node.children
    .map(sortTree)
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  return node;
}

export function useFileContext() {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [repoTree, setRepoTree] = useState<RepoNode | null>(null);
  const [isProcessingRepo, setIsProcessingRepo] = useState(false);
  const [repoName, setRepoName] = useState<string>("");

  // ── Single file upload ──────────────────────────────────────────────────
  const addFile = useCallback(async (file: File) => {
    if (!isTextFile(file.name)) {
      throw new Error(`不支持的文件类型: ${file.name}`);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`文件过大 (最大 500KB): ${file.name}`);
    }
    const content = await readFileContent(file);
    const af: AttachedFile = {
      id: genId(),
      name: file.name,
      path: file.name,
      content,
      language: detectLanguage(file.name),
      size: file.size,
      selected: true,
      fromRepo: false,
    };
    setAttachedFiles((prev) => [...prev, af]);
    return af;
  }, []);

  const removeFile = useCallback((id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // ── Repo upload ─────────────────────────────────────────────────────────
  const loadRepo = useCallback(async (files: FileList) => {
    setIsProcessingRepo(true);
    try {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      // Derive repo name from first file's path
      const firstPath = (fileArray[0] as any).webkitRelativePath || "";
      const name = firstPath.split("/")[0] || "repository";
      setRepoName(name);

      // Build tree structure (metadata only)
      const tree = sortTree(buildTree(fileArray));

      // Attach content to file nodes lazily — store File objects by path
      const fileMap = new Map<string, File>();
      for (const f of fileArray) {
        const rel = (f as any).webkitRelativePath || f.name;
        fileMap.set(rel, f);
      }

      // Read content for all text files
      const readNode = async (node: RepoNode): Promise<void> => {
        if (node.type === "file") {
          const f = fileMap.get(node.path);
          if (f) {
            try {
              node.content = await readFileContent(f);
            } catch {
              node.content = "// Failed to read file";
            }
          }
        }
        if (node.children) {
          await Promise.all(node.children.map(readNode));
        }
      };

      await readNode(tree);
      setRepoTree(tree);

      // Sync to attachedFiles (replace previous repo files)
      const repoFiles: AttachedFile[] = [];
      const collectFiles = (node: RepoNode) => {
        if (node.type === "file" && node.content !== undefined) {
          repoFiles.push({
            id: genId(),
            name: node.name,
            path: node.path,
            content: node.content,
            language: node.language ?? "text",
            size: node.size ?? 0,
            selected: node.selected ?? true,
            fromRepo: true,
          });
        }
        node.children?.forEach(collectFiles);
      };
      collectFiles(tree);

      setAttachedFiles((prev) => [
        ...prev.filter((f) => !f.fromRepo),
        ...repoFiles,
      ]);
    } finally {
      setIsProcessingRepo(false);
    }
  }, []);

  const clearRepo = useCallback(() => {
    setRepoTree(null);
    setRepoName("");
    setAttachedFiles((prev) => prev.filter((f) => !f.fromRepo));
  }, []);

  // ── Selection toggle ────────────────────────────────────────────────────
  const toggleFile = useCallback((path: string, selected: boolean) => {
    setAttachedFiles((prev) =>
      prev.map((f) => (f.path === path ? { ...f, selected } : f))
    );
    // Also update tree node
    setRepoTree((prev) => {
      if (!prev) return prev;
      const updateNode = (node: RepoNode): RepoNode => {
        if (node.type === "file" && node.path === path) {
          return { ...node, selected };
        }
        if (node.children) {
          return { ...node, children: node.children.map(updateNode) };
        }
        return node;
      };
      return updateNode(prev);
    });
  }, []);

  const toggleDir = useCallback((dirPath: string, selected: boolean) => {
    // Toggle all files under this dir
    setAttachedFiles((prev) =>
      prev.map((f) =>
        f.path.startsWith(dirPath + "/") || f.path === dirPath
          ? { ...f, selected }
          : f
      )
    );
    setRepoTree((prev) => {
      if (!prev) return prev;
      const updateNode = (node: RepoNode): RepoNode => {
        if (node.path === dirPath || node.path.startsWith(dirPath + "/")) {
          const updated: RepoNode = { ...node, selected };
          if (node.children) {
            updated.children = node.children.map(updateNode);
          }
          return updated;
        }
        if (node.children) {
          return { ...node, children: node.children.map(updateNode) };
        }
        return node;
      };
      return updateNode(prev);
    });
  }, []);

  // ── Build context string for AI ─────────────────────────────────────────
  const buildContextString = useCallback((): string => {
    const selected = attachedFiles.filter((f) => f.selected);
    if (selected.length === 0) return "";

    let total = 0;
    const parts: string[] = [];

    for (const f of selected) {
      const header = `\n\n--- File: ${f.path} ---\n\`\`\`${f.language}\n`;
      const footer = "\n```";
      const chunk = header + f.content + footer;
      total += chunk.length;
      if (total > MAX_TOTAL_CONTEXT) {
        parts.push(
          `\n\n--- File: ${f.path} ---\n[文件内容过大，已截断]`
        );
        break;
      }
      parts.push(chunk);
    }

    return `以下是相关代码文件内容：\n${parts.join("")}`;
  }, [attachedFiles]);

  const selectedCount = attachedFiles.filter((f) => f.selected).length;
  const totalFiles = attachedFiles.length;

  return {
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
  };
}
