'use client'
import { useEffect, useState } from 'react'

export function useIsDark(): boolean {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const fromStorage = () => setDark(localStorage.getItem('participant_theme') === 'black')
    const fromEvent = (e: Event) => setDark((e as CustomEvent<string>).detail === 'black')
    fromStorage()
    window.addEventListener('storage', fromStorage)
    window.addEventListener('sc-theme', fromEvent)
    return () => {
      window.removeEventListener('storage', fromStorage)
      window.removeEventListener('sc-theme', fromEvent)
    }
  }, [])
  return dark
}
