import React, { useState, useMemo } from 'react'
import { Environment } from "../../../../../../../@ebowwa/codespaces-types/compile"
import { TagBadge } from '../shared/TagBadge'

export type FilterType = 'all' | 'running' | 'stopped' | 'creating'

interface EnvironmentFilterProps {
  value: FilterType
  onChange: (value: FilterType) => void
  onSearchChange: (value: string) => void
  searchValue: string
  onTagFilterChange?: (tag: string | null) => void
  selectedTag?: string | null
  environments: Environment[]
}

export function EnvironmentFilter({ value, onChange, onSearchChange, searchValue, onTagFilterChange, selectedTag, environments }: EnvironmentFilterProps) {
  // Get all unique tags from environments
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    environments.forEach(env => {
      env.tags?.forEach(tag => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }, [environments])
  return (
    <div className="environment-filter">
      <div className="filter-search">
        <input
          type="text"
          placeholder="Search environments..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="filter-tabs">
        <button
          className={`filter-tab ${value === 'all' ? 'active' : ''}`}
          onClick={() => onChange('all')}
        >
          All
        </button>
        <button
          className={`filter-tab ${value === 'running' ? 'active' : ''}`}
          onClick={() => onChange('running')}
        >
          Running
        </button>
        <button
          className={`filter-tab ${value === 'stopped' ? 'active' : ''}`}
          onClick={() => onChange('stopped')}
        >
          Stopped
        </button>
      </div>

      {allTags.length > 0 && (
        <div className="filter-tags">
          <span className="filter-tags-label">Filter by tag:</span>
          <button
            className={`filter-tag-all ${!selectedTag ? 'active' : ''}`}
            onClick={() => onTagFilterChange?.(null)}
          >
            All tags
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              className={`filter-tag ${selectedTag === tag ? 'active' : ''}`}
              onClick={() => onTagFilterChange?.(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
