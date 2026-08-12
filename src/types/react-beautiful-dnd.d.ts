/* eslint-disable @typescript-eslint/no-explicit-any */

declare module 'react-beautiful-dnd' {
  import * as React from 'react'

  export type DropResult = {
    draggableId: string
    source: { droppableId: string; index: number }
    destination?: { droppableId: string; index: number }
  }

  export const DragDropContext: React.ComponentType<{
    onDragEnd: (result: DropResult) => void
    children: React.ReactNode
  }>

  export const Droppable: React.ComponentType<{
    droppableId: string
    children: (provided: any, snapshot: any) => React.ReactNode
  }>

  export const Draggable: React.ComponentType<{
    draggableId: string
    index: number
    children: (provided: any, snapshot: any) => React.ReactNode
  }>
}

