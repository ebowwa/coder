import React, { useState } from 'react'
import { TagBadge } from './TagBadge'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export function TagInput({ tags, onChange, placeholder = 'Add tag...' }: TagInputProps) {
  const [inputValue, setInputValue] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  const addTag = () => {
    const trimmed = inputValue.trim().toLowerCase()
    if (!trimmed) return

    // Validate tag format: alphanumeric, hyphens, underscores
    if (!/^[a-z0-9_-]+$/.test(trimmed)) {
      return
    }

    // Check for duplicates
    if (tags.includes(trimmed)) {
      setInputValue('')
      return
    }

    onChange([...tags, trimmed])
    setInputValue('')
  }

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(t => t !== tagToRemove))
  }

  return (
    <div className="tag-input">
      <div className="tag-list">
        {tags.map(tag => (
          <TagBadge
            key={tag}
            tag={tag}
            onRemove={() => removeTag(tag)}
          />
        ))}
        <input
          type="text"
          className="tag-input-field"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={tags.length === 0 ? placeholder : ''}
        />
      </div>
      <div className="tag-hint">Press Enter to add, click × to remove</div>
    </div>
  )
}
