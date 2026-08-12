export type Status = 'todo' | 'inProgress' | 'done'
export type Priority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  title: string
  description: string
  status: Status
  tags: string[]
  priority: Priority
  deadline?: string // ISO date (yyyy-mm-dd) or undefined
  createdAt: number
  updatedAt: number
}

export type NewTaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>
export type TaskPatch = Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>> & {
  updatedAt?: number
}

