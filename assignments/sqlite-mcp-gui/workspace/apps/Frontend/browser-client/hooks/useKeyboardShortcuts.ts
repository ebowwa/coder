import { useEffect } from 'react'

interface KeyboardShortcuts {
  [key: string]: () => void
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      const key = e.key.toLowerCase()

      // Handle modifier combinations
      if (e.metaKey || e.ctrlKey) {
        if (key === 'k' && shortcuts['cmd+k']) {
          e.preventDefault()
          shortcuts['cmd+k']()
        }
        if (key === 'n' && shortcuts['cmd+n']) {
          e.preventDefault()
          shortcuts['cmd+n']()
        }
        if (key === 's' && shortcuts['cmd+s']) {
          e.preventDefault()
          shortcuts['cmd+s']()
        }
        return
      }

      // Handle single key presses
      if (shortcuts[key]) {
        e.preventDefault()
        shortcuts[key]()
      }

      // Handle number keys for environments
      if (/^[1-9]$/.test(key) && shortcuts[key]) {
        e.preventDefault()
        shortcuts[key]()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts, enabled])
}
