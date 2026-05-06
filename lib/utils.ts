import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function dedupeById<T extends { id: string }>(items: T[]) {
  return items.filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index)
}
