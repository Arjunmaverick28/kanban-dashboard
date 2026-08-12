import { Draggable } from 'react-beautiful-dnd'
import type { Task } from '../../types/tasks'

type Props = {
  task: Task
  index: number
  onOpen: (taskId: string) => void
  onDelete: (taskId: string) => void
}

function priorityBadgeClass(priority: Task['priority']) {
  switch (priority) {
    case 'high':
      return 'bg-red-50 text-red-700 border-red-200'
    case 'medium':
      return 'bg-amber-50 text-amber-800 border-amber-200'
    case 'low':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

export function TaskCard({ task, index, onOpen, onDelete }: Props) {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={[
            'rounded-xl border bg-white p-3 shadow-sm transition',
            snapshot.isDragging ? 'ring-2 ring-purple-400 shadow-md' : 'hover:shadow',
          ].join(' ')}
        >
          <div
            {...provided.dragHandleProps}
            className="cursor-grab select-none"
            onClick={() => onOpen(task.id)}
            role="button"
            tabIndex={0}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-gray-900">{task.title}</div>
                {task.description ? (
                  <div className="mt-1 line-clamp-3 text-xs text-gray-600">
                    {task.description}
                  </div>
                ) : null}
              </div>
              <div
                className={[
                  'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                  priorityBadgeClass(task.priority),
                ].join(' ')}
              >
                {task.priority}
              </div>
            </div>

            {task.tags.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {task.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              className="rounded-lg bg-purple-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-purple-700"
              onClick={(e) => {
                e.stopPropagation()
                onOpen(task.id)
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(task.id)
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </Draggable>
  )
}

