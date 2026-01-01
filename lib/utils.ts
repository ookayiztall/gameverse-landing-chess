import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getAvatarUrl(raw: unknown) {
  const value = String(raw || "").trim()
  const match = value.match(/https?:\/\/[^\s"'<>]+/i)
  return match?.[0] || null
}
