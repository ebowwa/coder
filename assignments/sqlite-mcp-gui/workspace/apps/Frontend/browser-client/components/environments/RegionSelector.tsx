import React, { useState } from 'react'
import { useLocations, getCountryFlag, useServerTypes, getLocationsForServerType } from '../../hooks/useHetznerData'
import { PickerModal, PickerOption } from '../shared/PickerModal'

interface RegionSelectorProps {
  value: string
  onChange: (value: string) => void
  selectedServerType?: string
}

export function RegionSelector({ value, onChange, selectedServerType }: RegionSelectorProps) {
  const { locations, loading: locationsLoading } = useLocations()
  const { serverTypes, loading: serverTypesLoading } = useServerTypes()
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  // Filter locations to only show those that support the selected server type
  const availableLocations = selectedServerType
    ? (() => {
        const serverType = serverTypes.find(t => t.name === selectedServerType)
        return serverType ? getLocationsForServerType(serverType, locations) : locations
      })()
    : locations

  const selected = availableLocations.find(l => l.name === value) || availableLocations[0]

  const loading = locationsLoading || serverTypesLoading

  if (loading) {
    return (
      <div className="picker-selector region-selector">
        <button className="picker-selector-button" disabled>
          <span className="picker-selected-primary">Loading locations...</span>
        </button>
      </div>
    )
  }

  // Require server type to be selected first
  if (!selectedServerType) {
    return (
      <div className="picker-selector region-selector">
        <button className="picker-selector-button" disabled>
          <span className="picker-selected-primary">Select server type first</span>
        </button>
      </div>
    )
  }

  if (availableLocations.length === 0) {
    return (
      <div className="picker-selector region-selector">
        <button className="picker-selector-button" disabled>
          <span className="picker-selected-primary">
            {selectedServerType ? `No locations available for ${selectedServerType}` : 'No locations available'}
          </span>
        </button>
      </div>
    )
  }

  const selectedFlag = selected ? getCountryFlag(selected.country) : '🌍'

  const pickerOptions: PickerOption[] = availableLocations.map((location) => ({
    value: location.name,
    title: location.name,
    subtitle: getCountryFlag(location.country),
    detail: `${location.city}, ${location.country}`,
    description: location.description,
  }))

  return (
    <>
      <div className="picker-selector region-selector">
        <button
          className="picker-selector-button"
          onClick={() => setIsPickerOpen(true)}
        >
          <div className="picker-selected-info">
            <span className="picker-selected-primary">{selected?.city || selected?.name}</span>
            <span className="picker-selected-secondary region-flag">{selectedFlag}</span>
          </div>
          <svg className="picker-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6"></path>
          </svg>
        </button>
      </div>

      <PickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        title="Select Region"
        options={pickerOptions}
        selectedValue={value}
        onSelect={onChange}
      />
    </>
  )
}
