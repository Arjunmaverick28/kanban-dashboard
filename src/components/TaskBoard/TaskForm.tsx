import { useState } from 'react'
import type { NewTaskInput, Priority, Status } from '../../types/tasks'
import { useTaskContext } from '../../context/TaskContext'

const STATUSES: Array<{ value: Status; label: string }> = [
  { value: 'todo', label: 'To Do' },
  { value: 'inProgress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

const PRIORITIES: Array<{ value: Priority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

export function TaskForm() {
  const { addTask } = useTaskContext()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<Status>('todo')
  const [tags, setTags] = useState('') // comma-separated
  const [priority, setPriority] = useState<Priority>('medium')
  const [deadline, setDeadline] = useState('')

  function submit() {
    const normalizedTags = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const payload: NewTaskInput = {
      title: title.trim(),
      description: description.trim(),
      status,
      tags: normalizedTags,
      priority,
      deadline: deadline ? deadline : undefined,
    }

    addTask(payload)
    setTitle('')
    setDescription('')
    setStatus('todo')
    setTags('')
    setPriority('medium')
    setDeadline('')
  }

  return (
    <form
      className="mb-4 rounded-2xl border bg-white p-4 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim()) return
        submit()
      }}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-700">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-200"
            placeholder="e.g., Write project outline"
            required
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-700">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-200"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-xs font-semibold text-gray-700">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[88px] resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-200"
            placeholder="Add more context (optional)"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-700">Tags</span>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-200"
            placeholder="comma, separated"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-700">Priority</span>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-200"
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-xs font-semibold text-gray-700">Deadline (optional)</span>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-200"
          />
        </label>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          onClick={() => {
            setTitle('')
            setDescription('')
            setStatus('todo')
            setTags('')
            setPriority('medium')
            setDeadline('')
          }}
        >
          Reset
        </button>
        <button
          type="submit"
          className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
        >
          Create Task
        </button>
      </div>
    </form>
  )
}

