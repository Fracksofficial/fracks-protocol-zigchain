'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Get initial theme from localStorage first, then cookie, then system
    const localTheme = localStorage.getItem('theme') as Theme
    const cookieTheme = document.cookie
      .split('; ')
      .find(row => row.startsWith('theme='))
      ?.split('=')[1] as Theme
    
    const savedTheme = localTheme || cookieTheme
    
    if (savedTheme) {
      setThemeState(savedTheme)
      document.documentElement.classList.remove('dark', 'light')
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark')
      }
    } else {
      const initialTheme: Theme = 'light'
      setThemeState(initialTheme)
      document.cookie = `theme=${initialTheme}; path=/; max-age=31536000`
      localStorage.setItem('theme', initialTheme)
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    document.documentElement.classList.remove('dark', 'light')
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    }
    document.cookie = `theme=${newTheme}; path=/; max-age=31536000`
    localStorage.setItem('theme', newTheme)
  }

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  if (!mounted) {
    return null
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
