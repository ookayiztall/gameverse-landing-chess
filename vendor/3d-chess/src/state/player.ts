import { nanoid } from 'nanoid'
import { create } from 'zustand'

import type { Color } from '@logic/pieces'
import { isDev } from '@chess/utils/isDev'

const USERNAME_STORAGE_KEY = 'gameverse.chess.username'
const ID_STORAGE_KEY = 'gameverse.chess.id'

const getStoredValue = (key: string): string | null => {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

const setStoredValue = (key: string, value: string | null): void => {
  if (typeof window === 'undefined') return
  try {
    if (value == null || value === '') {
      window.localStorage.removeItem(key)
      return
    }
    window.localStorage.setItem(key, value)
  } catch {
    return
  }
}

const getInitialUsername = (): string => {
  const stored = getStoredValue(USERNAME_STORAGE_KEY)
  if (stored && stored.trim().length >= 3) return stored.trim()
  return isDev ? `dev` : ``
}

const getInitialId = (): string => {
  const stored = getStoredValue(ID_STORAGE_KEY)
  if (stored && stored.trim().length > 0) return stored.trim()
  const next = nanoid()
  setStoredValue(ID_STORAGE_KEY, next)
  return next
}

export type Message = {
  author: string
  message: string
}

type MessageState = {
  messages: Message[]
  addMessage: (message: Message) => void
}

export const useMessageState = create<MessageState>()((set) => ({
  messages: [] as Message[],
  addMessage: (message: Message) => set((state) => ({ messages: [...state.messages, message] })),
}))

type OpponentState = {
  position: [number, number, number]
  mousePosition: [number, number, number]
  setPosition: (position: [number, number, number]) => void
  setMousePosition: (mousePosition: [number, number, number]) => void
  name: string
  setName: (name: string) => void
}

export const useOpponentState = create<OpponentState>()((set) => ({
  position: [0, 100, 0],
  setPosition: (position: OpponentState['position']) => set({ position }),
  name: ``,
  setName: (name: string) => set({ name }),
  mousePosition: [0, 0, 0],
  setMousePosition: (mousePosition: OpponentState['mousePosition']) => set({ mousePosition }),
}))

type PlayerState = {
  username: string
  id: string
  setUsername: (username: string) => void
  hydrated: boolean
  hydrateFromStorage: () => void
  room: string
  setRoom: (room: string) => void
  joinedRoom: boolean
  setJoinedRoom: (joinedRoom: boolean) => void
  playerColor: Color
  setPlayerColor: (color: Color) => void
}

export const usePlayerState = create<PlayerState>()((set) => ({
  username: isDev ? `dev` : ``,
  setUsername: (username: string) => {
    setStoredValue(USERNAME_STORAGE_KEY, username.trim())
    set({ username: username.trim() })
  },
  id: nanoid(),
  hydrated: false,
  hydrateFromStorage: () => {
    if (typeof window === 'undefined') return
    const storedUsername = getStoredValue(USERNAME_STORAGE_KEY)
    const username =
      storedUsername && storedUsername.trim().length >= 3
        ? storedUsername.trim()
        : undefined

    const storedId = getStoredValue(ID_STORAGE_KEY)
    const id = storedId && storedId.trim().length > 0 ? storedId.trim() : nanoid()
    setStoredValue(ID_STORAGE_KEY, id)

    set((state) => ({
      id,
      username: username ?? state.username,
      hydrated: true,
    }))
  },
  room: isDev ? `room` : ``,
  setRoom: (room: string) => set({ room }),
  joinedRoom: false,
  setJoinedRoom: (joinedRoom: boolean) => set({ joinedRoom }),
  playerColor: `white`,
  setPlayerColor: (color: Color) => set({ playerColor: color }),
}))
