import type { Status, Task, TaskPatch } from '../types/tasks'

export type BoardStateV1 = {
  version: 1
  tasksById: Record<string, Task>
  columnOrder: Record<Status, string[]>
}

const STORAGE_KEY = 'kanbanTasksV1'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function defaultBoardState(): BoardStateV1 {
  return {
    version: 1,
    tasksById: {},
    columnOrder: {
      todo: [],
      inProgress: [],
      done: [],
    },
  }
}

export function loadBoardState(): BoardStateV1 {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultBoardState()

    const parsed = JSON.parse(raw) as unknown
    if (!isObject(parsed)) return defaultBoardState()

    if (parsed.version !== 1) return defaultBoardState()

    // Basic shape checks; keep it permissive to avoid wiping user data on minor schema changes.
    const tasksById = (parsed as BoardStateV1).tasksById ?? {}
    const columnOrder = (parsed as BoardStateV1).columnOrder ?? defaultBoardState().columnOrder

    return {
      version: 1,
      tasksById,
      columnOrder,
    }
  } catch {
    return defaultBoardState()
  }
}

export function saveBoardState(state: BoardStateV1) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function normalizeTags(tags: string[]): string[] {
  const deduped = new Set(
    tags
      .map((t) => t.trim())
      .filter(Boolean)
  )
  return Array.from(deduped)
}

export function applyPatch(task: Task, patch: TaskPatch): Task {
  return {
    ...task,
    ...patch,
    tags: patch.tags ? normalizeTags(patch.tags) : task.tags,
    updatedAt: patch.updatedAt ?? Date.now(),
  }
}

