import React, { useState, useMemo, useEffect } from 'react'
import { Environment, getEnvLocationLabel } from "../../../../../../../@ebowwa/codespaces-types/compile"
import { formatElapsedTime } from "../../../../../../../@ebowwa/codespaces-types/compile/time"
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { EnvironmentDetails } from './EnvironmentDetails'
import { EnvironmentFilter, FilterType } from './EnvironmentFilter'
import { RefreshButton } from '../shared/RefreshButton'
import { ResourceMonitor } from '../chart/ResourceMonitor'
import { ResourceChart } from '../chart/ResourceChart'
import { TagBadge } from '../shared/TagBadge'
import { ProgressBar } from '../shared/ProgressBar'
import '../shared/ProgressBar.css'

interface EnvironmentListProps {
  environments: Environment[]
  onDelete: (id: string) => void
  onStart: (id: string) => void
  onStop: (id: string) => void
  onConnect: (id: string) => void
  onClone?: (id: string) => void
  onRefresh?: () => void
  refreshing?: boolean
  onUpdateTags?: (id: string, tags: string[]) => void
  onRefreshResources?: (id: string) => void
}

export function EnvironmentList({ environments, onDelete, onStart, onStop, onConnect, onClone, onRefresh, refreshing, onUpdateTags, onRefreshResources }: EnvironmentListProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [detailsId, setDetailsId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [refreshingResources, setRefreshingResources] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'created' | 'type'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [timeKey, setTimeKey] = useState(0)

  // Refresh elapsed time display every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeKey(prev => prev + 1)
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: Environment['status']) => {
    switch (status) {
      case 'running': return '#22c55e'
      case 'stopped': return '#ef4444'
      case 'creating': return '#f59e0b'
      case 'deleting': return '#6b7280'
      default: return '#6b7280'
    }
  }

  // Filter and search environments
  const filteredEnvironments = useMemo(() => {
    let filtered = environments.filter(env => {
      // Status filter
      if (filterType !== 'all' && env.status !== filterType) {
        return false
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          env.name.toLowerCase().includes(query) ||
          env.serverType.toLowerCase().includes(query) ||
          env.location?.name.toLowerCase().includes(query)
        )
      }

      return true
    })

    // Sort environments
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'type':
          comparison = a.serverType.localeCompare(b.serverType)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [environments, filterType, searchQuery, sortBy, sortOrder])

  return (
    <div className="environment-list">
      <div className="list-header">
        <div className="header-left">
          <h2>Environments</h2>
          <span className="count">{filteredEnvironments.length} of {environments.length}</span>
          <select
            className="sort-select"
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder]
              setSortBy(field)
              setSortOrder(order)
            }}
          >
            <option value="name-asc">Name ↑</option>
            <option value="name-desc">Name ↓</option>
            <option value="status-asc">Status ↑</option>
            <option value="status-desc">Status ↓</option>
            <option value="created-asc">Oldest</option>
            <option value="created-desc">Newest</option>
            <option value="type-asc">Type ↑</option>
            <option value="type-desc">Type ↓</option>
          </select>
        </div>
        <RefreshButton
          onRefresh={() => {
            if (onRefresh) onRefresh()
          }}
          loading={refreshing || false}
          autoRefresh={autoRefresh}
          onToggleAutoRefresh={(enabled) => setAutoRefresh(enabled)}
        />
      </div>

      <EnvironmentFilter
        value={filterType}
        onChange={setFilterType}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        environments={environments}
      />

      {selectedIds.size > 0 && (
        <div className="bulk-actions">
          <span className="selected-count">{selectedIds.size} selected</span>
          <div className="bulk-buttons">
            <button
              className="bulk-btn bulk-start"
              onClick={() => {
                selectedIds.forEach(id => {
                  const env = environments.find(e => e.id === id)
                  if (env && env.status === 'stopped') onStart(id)
                })
                setSelectedIds(new Set())
              }}
              disabled={refreshing}
            >
              Start All
            </button>
            <button
              className="bulk-btn bulk-stop"
              onClick={() => {
                selectedIds.forEach(id => {
                  const env = environments.find(e => e.id === id)
                  if (env && env.status === 'running') onStop(id)
                })
                setSelectedIds(new Set())
              }}
              disabled={refreshing}
            >
              Stop All
            </button>
            <button
              className="bulk-btn bulk-delete"
              onClick={() => {
                selectedIds.forEach(id => onDelete(id))
                setSelectedIds(new Set())
              }}
              disabled={refreshing}
            >
              Delete All
            </button>
            <button
              className="bulk-btn bulk-cancel"
              onClick={() => setSelectedIds(new Set())}
              disabled={refreshing}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {environments.length === 0 ? (
        <div className="empty-state">
          <p>No environments yet. Create your first development environment!</p>
        </div>
      ) : filteredEnvironments.length === 0 ? (
        <div className="empty-state">
          <p>No environments match your filter.</p>
        </div>
      ) : (
        <div className="environments">
          {filteredEnvironments.map((env) => (
            <div
              key={env.id}
              className={`environment-card ${selectedId === env.id ? 'selected' : ''} ${detailsId === env.id ? 'show-details' : ''}`}
            >
              <div className="environment-card-main">
                <div className="environment-info">
                  <div className="environment-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(env.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(new Set([...selectedIds, env.id]))
                        } else {
                          const newSet = new Set(selectedIds)
                          newSet.delete(env.id)
                          setSelectedIds(newSet)
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="environment-header">
                    <h3>{env.name}</h3>
                    <div className="environment-meta">
                      <span>#{env.serverId}</span>
                      <span>•</span>
                      <span>{env.serverType}</span>
                      <span>•</span>
                      <span>{getEnvLocationLabel(env)}</span>
                      {env.ipv4 && (
                        <>
                          <span>•</span>
                          <code>{env.ipv4}</code>
                        </>
                      )}
                      <span>•</span>
                      <span className="elapsed-time" title={`Created: ${new Date(env.createdAt).toLocaleString()}`}>
                        ⏱ {formatElapsedTime(env.createdAt)}
                      </span>
                      <span
                        className={`status-indicator ${env.status}`}
                      >
                        {env.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Show progress bar when action is in progress */}
                {env.progress !== undefined && env.status === 'creating' && (
                  <div className="environment-progress">
                    <ProgressBar
                      progress={env.progress}
                      label={env.status === 'creating' ? 'Creating...' : 'Starting...'}
                      color={getStatusColor(env.status)}
                    />
                  </div>
                )}
              </div>

              <div className="environment-details">
                <div className="detail">
                  <span className="label">Server ID</span>
                  <span>#{env.serverId}</span>
                </div>
                <div className="detail">
                  <span className="label">Type</span>
                  <span>{env.serverType}</span>
                </div>
                <div className="detail">
                  <span className="label">Location</span>
                  <span>{getEnvLocationLabel(env)}</span>
                </div>
                {env.ipv4 && (
                  <div className="detail">
                    <span className="label">IPv4</span>
                    <code>{env.ipv4}</code>
                  </div>
                )}
                {env.ipv6 && (
                  <div className="detail">
                    <span className="label">IPv6</span>
                    <code>{env.ipv6}</code>
                  </div>
                )}
                {env.tags && env.tags.length > 0 && (
                  <div className="detail">
                    <span className="label">Tags</span>
                    <div className="environment-tags">
                      {env.tags.map(tag => (
                        <TagBadge key={tag} tag={tag} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <ResourceMonitor
                environment={env}
                onRefresh={onRefreshResources ? (id) => {
                  setRefreshingResources(new Set([...refreshingResources, id]))
                  onRefreshResources(id)
                  setTimeout(() => {
                    setRefreshingResources(new Set([...refreshingResources].filter(x => x !== id)))
                  }, 2000)
                } : undefined}
                refreshing={refreshingResources.has(env.id)}
              />

              <ResourceChart environment={env} />

              <div className="environment-actions">
                <button
                  className="expand-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDetailsId(detailsId === env.id ? null : env.id)
                  }}
                >
                  {detailsId === env.id ? '▲' : '▼'} Details
                </button>
                {env.status === 'running' && env.ipv4 && (
                  <button
                    className="ssh-btn"
                    onClick={(e) => { e.stopPropagation(); onConnect(env.id) }}
                  >
                    SSH
                  </button>
                )}
                {env.status === 'running' && (
                  <button
                    className="stop-btn"
                    onClick={(e) => { e.stopPropagation(); onStop(env.id) }}
                  >
                    Stop
                  </button>
                )}
                {env.status === 'stopped' && (
                  <button
                    className="start-btn"
                    onClick={(e) => { e.stopPropagation(); onStart(env.id) }}
                  >
                    Start
                  </button>
                )}
                <button
                  className="clone-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onClone) onClone(env.id)
                  }}
                >
                  Clone
                </button>
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteConfirm({ id: env.id, name: env.name })
                  }}
                  disabled={env.status === 'deleting'}
                >
                  {env.status === 'deleting' ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteConfirm && (
        <ConfirmDialog
          isOpen={!!deleteConfirm}
          title="Delete Environment?"
          message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => {
            onDelete(deleteConfirm.id)
            setDeleteConfirm(null)
          }}
          onCancel={() => setDeleteConfirm(null)}
          variant="danger"
        />
      )}

      {detailsId && environments.find(e => e.id === detailsId) && (
        <EnvironmentDetails
          environment={environments.find(e => e.id === detailsId)!}
          onClose={() => setDetailsId(null)}
          onUpdateTags={onUpdateTags}
          onMetadataChange={() => {
            if (onRefresh) onRefresh()
          }}
        />
      )}
    </div>
  )
}
