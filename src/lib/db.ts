/**
 * IndexedDB wrapper for persistent storage of patterns and folders.
 * Uses the `idb` library for promise-based access.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Pattern, MaterialSpec } from '@/engine/types';

export interface SavedPattern {
  id: string;
  name: string;
  description?: string;
  designer?: string;
  source: 'own' | 'purchased' | 'free' | 'generated';
  language: 'es' | 'en' | 'mixed';
  sourceText: string;
  pattern: Pattern; // full parsed structure
  materials: MaterialSpec;
  thumbnail?: string; // data URL
  folderId?: string;
  isCompleted: boolean;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Folder {
  id: string;
  name: string;
  color?: string;
  parentId?: string;
  position: number;
  createdAt: number;
}

/**
 * A project = a complete amigurumi composed of multiple parts (head, body,
 * arms, legs, ears, etc.). Each part is a SavedPattern referenced by ID.
 * Projects let the user group related pieces together.
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  /** Hex color for the project chip. */
  color?: string;
  /** Emoji shown on the project card. */
  icon?: string;
  /** IDs of patterns belonging to this project, in display order. */
  patternIds: string[];
  /** Optional thumbnail (data URL). */
  thumbnail?: string;
  isCompleted: boolean;
  createdAt: number;
  updatedAt: number;
}

interface AchisDB extends DBSchema {
  patterns: {
    key: string;
    value: SavedPattern;
    indexes: { 'by-folder': string; 'by-updated': number };
  };
  folders: {
    key: string;
    value: Folder;
    indexes: { 'by-parent': string };
  };
  projects: {
    key: string;
    value: Project;
    indexes: { 'by-updated': number };
  };
}

let dbPromise: Promise<IDBPDatabase<AchisDB>> | null = null;

function getDB(): Promise<IDBPDatabase<AchisDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AchisDB>('achis-de-amor', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const patternStore = db.createObjectStore('patterns', { keyPath: 'id' });
          patternStore.createIndex('by-folder', 'folderId');
          patternStore.createIndex('by-updated', 'updatedAt');
          const folderStore = db.createObjectStore('folders', { keyPath: 'id' });
          folderStore.createIndex('by-parent', 'parentId');
        }
        if (oldVersion < 2) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('by-updated', 'updatedAt');
        }
      },
    });
  }
  return dbPromise;
}

// ─── Patterns ─────────────────────────────────────────────────────────────

export async function savePattern(pattern: SavedPattern): Promise<void> {
  const db = await getDB();
  await db.put('patterns', { ...pattern, updatedAt: Date.now() });
}

export async function getPattern(id: string): Promise<SavedPattern | undefined> {
  const db = await getDB();
  return db.get('patterns', id);
}

export async function listPatterns(folderId?: string): Promise<SavedPattern[]> {
  const db = await getDB();
  if (folderId) {
    return db.getAllFromIndex('patterns', 'by-folder', folderId);
  }
  const all = await db.getAll('patterns');
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deletePattern(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('patterns', id);
}

// ─── Folders ──────────────────────────────────────────────────────────────

export async function saveFolder(folder: Folder): Promise<void> {
  const db = await getDB();
  await db.put('folders', folder);
}

export async function listFolders(): Promise<Folder[]> {
  const db = await getDB();
  const all = await db.getAll('folders');
  return all.sort((a, b) => a.position - b.position);
}

export async function deleteFolder(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('folders', id);
}

// ─── Projects ─────────────────────────────────────────────────────────────

export async function saveProject(project: Project): Promise<void> {
  const db = await getDB();
  await db.put('projects', { ...project, updatedAt: Date.now() });
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await getDB();
  return db.get('projects', id);
}

export async function listProjects(): Promise<Project[]> {
  const db = await getDB();
  const all = await db.getAll('projects');
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('projects', id);
}

export async function addPatternToProject(projectId: string, patternId: string): Promise<void> {
  const project = await getProject(projectId);
  if (!project) return;
  if (project.patternIds.includes(patternId)) return;
  await saveProject({
    ...project,
    patternIds: [...project.patternIds, patternId],
  });
}

export async function removePatternFromProject(projectId: string, patternId: string): Promise<void> {
  const project = await getProject(projectId);
  if (!project) return;
  await saveProject({
    ...project,
    patternIds: project.patternIds.filter((id) => id !== patternId),
  });
}

// ─── Bulk import / export ─────────────────────────────────────────────────

export interface BackupData {
  version: 2;
  exportedAt: number;
  patterns: SavedPattern[];
  folders: Folder[];
  projects: Project[];
}

export async function exportAll(): Promise<BackupData> {
  const [patterns, folders, projects] = await Promise.all([
    listPatterns(),
    listFolders(),
    listProjects(),
  ]);
  return {
    version: 2,
    exportedAt: Date.now(),
    patterns,
    folders,
    projects,
  };
}

export async function importAll(data: BackupData | { version: 1; patterns: SavedPattern[]; folders: Folder[]; exportedAt: number }): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['patterns', 'folders', 'projects'], 'readwrite');
  const ops: Promise<unknown>[] = [];
  for (const p of data.patterns) ops.push(tx.objectStore('patterns').put(p));
  for (const f of data.folders) ops.push(tx.objectStore('folders').put(f));
  if ('projects' in data && data.projects) {
    for (const pr of data.projects) ops.push(tx.objectStore('projects').put(pr));
  }
  await Promise.all(ops);
  await tx.done;
}

/** Generate a unique id (sortable, random suffix). */
export function newId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
