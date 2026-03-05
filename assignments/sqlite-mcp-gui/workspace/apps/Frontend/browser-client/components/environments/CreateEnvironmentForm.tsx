import React from 'react'
import { ServerTypeSelector } from './ServerTypeSelector'
import { RegionSelector } from './RegionSelector'
import { SSHKeySelector } from './SSHKeySelector'
import { useLocations, useServerTypes, getLocationsForServerType } from '../../hooks/useHetznerData'

interface CreateEnvironmentFormProps {
  newEnvName: string
  setNewEnvName: (name: string) => void
  selectedServerType: string
  setSelectedServerType: (type: string) => void
  selectedRegion: string
  setSelectedRegion: (region: string) => void
  selectedSSHKeys: string[]
  setSelectedSSHKeys: (keys: string[]) => void
  creating: boolean
  onCreate: () => void
  // Metadata
  newEnvDescription: string
  setNewEnvDescription: (desc: string) => void
  newEnvProject: string
  setNewEnvProject: (project: string) => void
  newEnvOwner: string
  setNewEnvOwner: (owner: string) => void
  newEnvPurpose: string
  setNewEnvPurpose: (purpose: string) => void
  newEnvType: 'development' | 'staging' | 'production' | 'testing'
  setNewEnvType: (type: 'development' | 'staging' | 'production' | 'testing') => void
  showMetadataOptions: boolean
  setShowMetadataOptions: (show: boolean) => void
  createInputRef: React.RefObject<HTMLInputElement>
}

export function CreateEnvironmentForm({
  newEnvName,
  setNewEnvName,
  selectedServerType,
  setSelectedServerType,
  selectedRegion,
  setSelectedRegion,
  selectedSSHKeys,
  setSelectedSSHKeys,
  creating,
  onCreate,
  newEnvDescription,
  setNewEnvDescription,
  newEnvProject,
  setNewEnvProject,
  newEnvOwner,
  setNewEnvOwner,
  newEnvPurpose,
  setNewEnvPurpose,
  newEnvType,
  setNewEnvType,
  showMetadataOptions,
  setShowMetadataOptions,
  createInputRef,
}: CreateEnvironmentFormProps) {
  const { locations } = useLocations()
  const { serverTypes } = useServerTypes()

  // When server type changes, auto-select a compatible region if current one isn't available
  const handleServerTypeChange = (newServerType: string) => {
    setSelectedServerType(newServerType)

    const serverType = serverTypes.find(t => t.name === newServerType)
    if (serverType) {
      const availableLocations = getLocationsForServerType(serverType, locations)
      const currentLocationAvailable = availableLocations.some(l => l.name === selectedRegion)

      // If current region isn't available, select the first available one
      if (!currentLocationAvailable && availableLocations.length > 0) {
        setSelectedRegion(availableLocations[0].name)
      }
    }
  }

  return (
    <section className="create-env">
      <h2>Create Environment <span className="keyboard-hint">⌘N</span></h2>
      <div className="form">
        <input
          ref={createInputRef}
          type="text"
          placeholder="Environment name..."
          value={newEnvName}
          onChange={(e) => setNewEnvName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && onCreate()}
          disabled={creating}
        />
      </div>
      <div className="form">
        <ServerTypeSelector
          value={selectedServerType}
          onChange={handleServerTypeChange}
          selectedRegion={selectedRegion}
        />
        <RegionSelector
          value={selectedRegion}
          onChange={setSelectedRegion}
          selectedServerType={selectedServerType}
        />
        <SSHKeySelector
          value={selectedSSHKeys}
          onChange={setSelectedSSHKeys}
        />
        <button onClick={onCreate} disabled={creating || !newEnvName.trim()}>
          {creating ? 'Creating...' : 'Create'}
        </button>
      </div>

      {/* Optional metadata - collapsible */}
      <div className="form metadata-toggle">
        <button
          className="metadata-toggle-btn"
          onClick={() => setShowMetadataOptions(!showMetadataOptions)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showMetadataOptions ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>
            <path d="m6 9 6 6 6-6"></path>
          </svg>
          Optional Metadata
        </button>
      </div>

      {showMetadataOptions && (
        <div className="metadata-form">
          <div className="metadata-row">
            <input
              type="text"
              placeholder="Description"
              value={newEnvDescription}
              onChange={(e) => setNewEnvDescription(e.target.value)}
            />
            <input
              type="text"
              placeholder="Project"
              value={newEnvProject}
              onChange={(e) => setNewEnvProject(e.target.value)}
            />
          </div>
          <div className="metadata-row">
            <input
              type="text"
              placeholder="Owner"
              value={newEnvOwner}
              onChange={(e) => setNewEnvOwner(e.target.value)}
            />
            <input
              type="text"
              placeholder="Purpose"
              value={newEnvPurpose}
              onChange={(e) => setNewEnvPurpose(e.target.value)}
            />
          </div>
          <div className="metadata-row">
            <select
              value={newEnvType}
              onChange={(e) => setNewEnvType(e.target.value as any)}
            >
              <option value="development">Development</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
              <option value="testing">Testing</option>
            </select>
          </div>
        </div>
      )}
    </section>
  )
}
