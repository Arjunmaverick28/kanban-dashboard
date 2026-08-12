import { useMemo } from 'react'
import { DragDropContext, type DropResult } from 'react-beautiful-dnd'
import { useTaskContext } from '../../context/TaskContext'
import type { Status } from '../../types/tasks'
import { TaskColumn } from './TaskColumn'

const STATUSES: Array<{ status: Status; title: string }> = [
  { status: 'todo', title: 'To Do' },
  { status: 'inProgress', title: 'In Progress' },
  { status: 'done', title: 'Done' },
]

export function TaskBoard({ onOpenTask }: { onOpenTask: (taskId: string) => void }) {
  const { tasksById, columnOrder, moveTask, deleteTask } = useTaskContext()

  const tasksByStatus = useMemo(() => {
    const out: Record<Status, typeof tasksById[string][]> = {
      todo: [],
      inProgress: [],
      done: [],
    }

    STATUSES.forEach(({ status }) => {
      const ids = columnOrder[status] ?? []
      out[status] = ids.map((id) => tasksById[id]).filter(Boolean)
    })

    return out
  }, [columnOrder, tasksById])

  function onDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const destinationStatus = destination.droppableId as Status
    moveTask(draggableId, destinationStatus, destination.index)
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid gap-4 md:grid-cols-3">
        {STATUSES.map(({ status, title }) => (
          <TaskColumn
            key={status}
            status={status}
            title={title}
            tasks={tasksByStatus[status]}
            onOpenTask={onOpenTask}
            onDeleteTask={deleteTask}
          />
        ))}
      </div>
    </DragDropContext>
  )
}

