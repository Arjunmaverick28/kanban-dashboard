/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import type { Priority, Status } from '../../types/tasks'
import { useTaskContext } from '../../context/TaskContext'

type Props = {
  taskId: string
  onClose: () => void
}

function parseTags(input: string) {
  return input
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

const PRIORITIES: Priority[] = ['low', 'medium', 'high']

export function TaskModal({ taskId, onClose }: Props) {
  const { tasksById, updateTask } = useTaskContext()
  const task = tasksById[taskId]

  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<Status>('todo')
  const [tagsInput, setTagsInput] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [deadline, setDeadline] = useState('')

  const title = useMemo(() => task?.title ?? '', [task?.title])

  useEffect(() => {
    if (!task) return
    setDescription(task.description)
    setStatus(task.status)
    setTagsInput(task.tags.join(', '))
    setPriority(task.priority)
    setDeadline(task.deadline ?? '')
  }, [taskId, task])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  if (!task) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        // Close when clicking on the overlay.
        if (e.currentTarget === e.target) onClose()
      }}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Task details"
      >
        <div className="flex items-start justify-between gap-3 border-b p-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-gray-900">{title}</h3>
            <p className="mt-1 text-xs text-gray-500">
              Created {new Date(task.createdAt).toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="md:col-span-2 flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-700">Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px] resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-200"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-700">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-200"
              >
                <option value="todo">To Do</option>
                <option value="inProgress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-700">Priority</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-200"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p[0].toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            <label className="md:col-span-2 flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-700">Tags</span>
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-200"
                placeholder="comma, separated"
              />
            </label>

            <label className="md:col-span-2 flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-700">Deadline (optional)</span>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-200"
              />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t p-4">
          <button
            type="button"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
            onClick={() => {
              const patch = {
                description: description.trim(),
                status,
                tags: parseTags(tagsInput),
                priority,
                deadline: deadline ? deadline : undefined,
                updatedAt: Date.now(),
              }

              updateTask(taskId, patch)
              onClose()
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

