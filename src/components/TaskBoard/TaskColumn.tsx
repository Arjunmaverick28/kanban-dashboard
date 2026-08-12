import { Droppable } from 'react-beautiful-dnd'
import type { Status, Task } from '../../types/tasks'
import { TaskCard } from './TaskCard'

type Props = {
  status: Status
  title: string
  tasks: Task[]
  onOpenTask: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
}

export function TaskColumn({ status, title, tasks, onOpenTask, onDeleteTask }: Props) {
  return (
    <section className="flex min-h-[320px] flex-col rounded-2xl border bg-gray-50 p-3">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-600">
          {tasks.length}
        </span>
      </header>

      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={[
              'flex flex-1 flex-col gap-2 rounded-xl p-2 transition',
              snapshot.isDraggingOver ? 'bg-purple-50' : 'bg-white/60',
            ].join(' ')}
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                onOpen={onOpenTask}
                onDelete={onDeleteTask}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </section>
  )
}

