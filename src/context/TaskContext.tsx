import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { NewTaskInput, Status, Task, TaskPatch } from '../types/tasks'
import { applyPatch, defaultBoardState, loadBoardState, normalizeTags, saveBoardState } from '../lib/storage'

/* eslint-disable react-refresh/only-export-components */

type TaskContextValue = {
  tasksById: Record<string, Task>
  columnOrder: Record<Status, string[]>
  addTask: (input: NewTaskInput) => void
  updateTask: (id: string, patch: TaskPatch) => void
  deleteTask: (id: string) => void
  moveTask: (taskId: string, destinationStatus: Status, destinationIndex: number) => void
  moveTaskByStatus: (taskId: string, newStatus: Status) => void
}

const TaskContext = createContext<TaskContextValue | undefined>(undefined)

function createId() {
  // Prefer the built-in UUID generator when available.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const initialState = (() => {
    try {
      if (typeof window === 'undefined') return defaultBoardState()
      return loadBoardState()
    } catch {
      return defaultBoardState()
    }
  })()

  const [tasksById, setTasksById] = useState<Record<string, Task>>(() => initialState.tasksById)
  const [columnOrder, setColumnOrder] = useState<Record<Status, string[]>>(() => initialState.columnOrder)

  useEffect(() => {
    if (typeof window === 'undefined') return
    saveBoardState({ version: 1, tasksById, columnOrder })
  }, [tasksById, columnOrder])

  const addTask = useCallback((input: NewTaskInput) => {
    const now = Date.now()
    const id = createId()

    const task: Task = {
      ...input,
      id,
      createdAt: now,
      updatedAt: now,
      tags: normalizeTags(input.tags),
    }

    setTasksById((prev) => ({ ...prev, [id]: task }))
    setColumnOrder((prev) => ({
      ...prev,
      [task.status]: [...prev[task.status], id],
    }))
  }, [])

  const updateTask = useCallback((id: string, patch: TaskPatch) => {
    setTasksById((prev) => {
      const existing = prev[id]
      if (!existing) return prev
      const nextTask = applyPatch(existing, patch)
      return { ...prev, [id]: nextTask }
    })

    // If status changed, we need to reposition in columnOrder.
    if (patch.status) {
      setColumnOrder((prev) => {
        const sourceStatus = (Object.keys(prev) as Status[]).find((s) => prev[s].includes(id))
        const destStatus = patch.status as Status

        if (!sourceStatus) return prev
        if (sourceStatus === destStatus) return prev // reorder handled elsewhere if needed

        const without = prev[sourceStatus].filter((tid) => tid !== id)
        const insertAt = prev[destStatus].length // append to bottom on status edit
        const nextDest = [...prev[destStatus].slice(0, insertAt), id, ...prev[destStatus].slice(insertAt)]

        return {
          ...prev,
          [sourceStatus]: without,
          [destStatus]: nextDest,
        }
      })
    }
  }, [])

  const deleteTask = useCallback((taskId: string) => {
    setTasksById((prev) => {
      if (!prev[taskId]) return prev
      const next = { ...prev }
      delete next[taskId]
      return next
    })

    setColumnOrder((prev) => {
      const next: Record<Status, string[]> = { ...prev }
      ;(Object.keys(next) as Status[]).forEach((status) => {
        next[status] = next[status].filter((id) => id !== taskId)
      })
      return next
    })
  }, [])

  const moveTask = useCallback((taskId: string, destinationStatus: Status, destinationIndex: number) => {
    setTasksById((prev) => {
      const existing = prev[taskId]
      if (!existing) return prev
      if (existing.status === destinationStatus) {
        return {
          ...prev,
          [taskId]: { ...existing, status: destinationStatus, updatedAt: Date.now() },
        }
      }
      return {
        ...prev,
        [taskId]: { ...existing, status: destinationStatus, updatedAt: Date.now() },
      }
    })

    setColumnOrder((prev) => {
      const statuses = Object.keys(prev) as Status[]
      const sourceStatus = statuses.find((s) => prev[s].includes(taskId)) ?? tasksById[taskId]?.status ?? 'todo'

      const sourceList = prev[sourceStatus].filter((id) => id !== taskId)
      const destListRaw = prev[destinationStatus].filter((id) => id !== taskId)

      const insertIndex = Math.max(0, Math.min(destinationIndex, destListRaw.length))
      const nextDest = [...destListRaw.slice(0, insertIndex), taskId, ...destListRaw.slice(insertIndex)]

      return {
        ...prev,
        [sourceStatus]: sourceList,
        [destinationStatus]: nextDest,
      }
    })
  }, [tasksById])

  const moveTaskByStatus = useCallback(
    (taskId: string, newStatus: Status) => {
      setColumnOrder((prev) => {
        const statuses = Object.keys(prev) as Status[]
        const sourceStatus = statuses.find((s) => prev[s].includes(taskId))
        if (!sourceStatus) return prev

        const destListRaw = prev[newStatus].filter((id) => id !== taskId)
        const sourceList = prev[sourceStatus].filter((id) => id !== taskId)

        return {
          ...prev,
          [sourceStatus]: sourceList,
          [newStatus]: [...destListRaw, taskId],
        }
      })
      setTasksById((prev) => {
        const existing = prev[taskId]
        if (!existing) return prev
        if (existing.status === newStatus) return prev
        return { ...prev, [taskId]: { ...existing, status: newStatus, updatedAt: Date.now() } }
      })
    },
    []
  )

  const value = useMemo<TaskContextValue>(
    () => ({
      tasksById,
      columnOrder,
      addTask,
      updateTask,
      deleteTask,
      moveTask,
      moveTaskByStatus,
    }),
    [tasksById, columnOrder, addTask, updateTask, deleteTask, moveTask, moveTaskByStatus]
  )

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>
}

export function useTaskContext() {
  const ctx = useContext(TaskContext)
  if (!ctx) throw new Error('useTaskContext must be used within TaskProvider')
  return ctx
}

