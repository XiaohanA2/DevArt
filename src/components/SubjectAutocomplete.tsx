'use client'

import { useState, useEffect, useRef } from 'react'
import { getAllSuggestions } from '@/lib/validation'
import { cn } from '@/lib/utils'
import { Sparkles, Palette } from 'lucide-react'

interface SubjectAutocompleteProps {
  input: string
  onSelect: (suggestion: string) => void
  isVisible: boolean
}

export function SubjectAutocomplete({ input, onSelect, isVisible }: SubjectAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<{ subjects: string[]; styles: string[] }>({
    subjects: [],
    styles: []
  })
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  // Flatten suggestions for keyboard navigation
  const allSuggestions = [
    ...suggestions.subjects.map((s, i) => ({ type: 'subject' as const, text: s, originalIndex: i })),
    ...suggestions.styles.map((s, i) => ({ type: 'style' as const, text: s, originalIndex: i }))
  ]

  // Update suggestions when input changes (debounced)
  useEffect(() => {
    if (!isVisible || input.length < 1) {
      setSuggestions({ subjects: [], styles: [] })
      setSelectedIndex(-1)
      return
    }

    const timer = setTimeout(() => {
      const newSuggestions = getAllSuggestions(input)
      setSuggestions(newSuggestions)
      setSelectedIndex(-1)
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [input, isVisible])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible || allSuggestions.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev < allSuggestions.length - 1 ? prev + 1 : prev))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault()
        onSelect(allSuggestions[selectedIndex].text)
      } else if (e.key === 'Escape') {
        setSelectedIndex(-1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, allSuggestions, selectedIndex, onSelect])

  if (!isVisible || allSuggestions.length === 0) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className="absolute z-[100] w-full mb-1 bottom-full bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl overflow-hidden"
    >
      {/* Subjects Section */}
      {suggestions.subjects.length > 0 && (
        <>
          <div className="px-3 py-2 bg-white/5 border-b border-white/5 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs text-white/60">建议的主题</span>
          </div>
          <div className="max-h-[120px] overflow-y-auto">
            {suggestions.subjects.map((suggestion, index) => {
              const globalIndex = index
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => onSelect(suggestion)}
                  onMouseEnter={() => setSelectedIndex(globalIndex)}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm transition-colors',
                    'border-l-2',
                    globalIndex === selectedIndex
                      ? 'bg-violet-500/20 border-violet-500 text-white'
                      : 'bg-transparent border-transparent text-white/70 hover:bg-white/5 hover:text-white/90'
                  )}
                >
                  {suggestion}
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Styles Section */}
      {suggestions.styles.length > 0 && (
        <>
          <div className="px-3 py-2 bg-white/5 border-b border-white/5 flex items-center gap-2">
            <Palette className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-xs text-white/60">推荐的风格</span>
          </div>
          <div className="max-h-[120px] overflow-y-auto">
            {suggestions.styles.map((suggestion, index) => {
              const globalIndex = suggestions.subjects.length + index
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => onSelect(suggestion)}
                  onMouseEnter={() => setSelectedIndex(globalIndex)}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm transition-colors',
                    'border-l-2',
                    globalIndex === selectedIndex
                      ? 'bg-pink-500/20 border-pink-500 text-white'
                      : 'bg-transparent border-transparent text-white/70 hover:bg-white/5 hover:text-white/90'
                  )}
                >
                  {suggestion}
                </button>
              )
            })}
          </div>
        </>
      )}

      <div className="px-3 py-2 bg-white/5 border-t border-white/5 flex items-center justify-between">
        <span className="text-[10px] text-white/40">
          使用 ↑↓ 选择，Enter 确认
        </span>
        <span className="text-[10px] text-white/30">
          ESC 关闭
        </span>
      </div>
    </div>
  )
}
