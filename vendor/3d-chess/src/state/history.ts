import { create } from 'zustand'

import type { History } from '@chess/components/History'

type HistoryState = {
  history: History[]
  reset: VoidFunction
  addItem: (item: History) => void
  undo: VoidFunction
}

export const useHistoryState = create<HistoryState>()((set) => ({
  history: [] as History[],
  reset: () => set({ history: [] }),
  addItem: (item: History) => set((state) => ({ history: [...state.history, item] })),
  undo: () => set((state) => ({ history: state.history.slice(0, -1) })),
}))
