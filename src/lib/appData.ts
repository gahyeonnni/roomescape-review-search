import { createContext, useContext } from 'react'
import type { Comment, Dataset, Person } from './types'
import type { SimilarityIndex } from './search'

export interface AppData {
  data: Dataset
  people: Map<string, Person>
  index: SimilarityIndex
  commentsById: Map<string, Comment>
}

export const AppDataContext = createContext<AppData | null>(null)

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('AppDataContext 밖에서 useAppData 사용됨')
  return ctx
}