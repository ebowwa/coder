import React, { useState } from 'react'
import { useServerTypes, formatServerTypeInfo, getServerTypesForLocation, isServerTypeAvailableInLocation } from '../../hooks/useHetznerData'
import { PickerModal, PickerOption } from '../shared/PickerModal'

interface ServerTypeSelectorProps {
  value: string
  onChange: (value: string) => void
  selectedRegion?: string
}

export function ServerTypeSelector({ value, onChange, selectedRegion }: ServerTypeSelectorProps) {
  const { serverTypes, loading } = useServerTypes()
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  // Filter server types to only show those available in the selected region
  const availableServerTypes = selectedRegion
    ? getServerTypesForLocation(selectedRegion, serverTypes)
    : serverTypes

  const selected = availableServerTypes.find(t => t.name === value) || availableServerTypes[0] || null

  if (loading || !selected) {
    return (
      <div className="picker-selector server-type-selector">
        <button className="picker-selector-button" disabled>
          <span className="picker-selected-primary">Loading server types...</span>
        </button>
      </div>
    )
  }

  if (availableServerTypes.length === 0) {
    return (
      <div className="picker-selector server-type-selector">
        <button className="picker-selector-button" disabled>
          <span className="picker-selected-primary">
            {selectedRegion ? `No server types available in ${selectedRegion}` : 'No server types available'}
          </span>
        </button>
      </div>
    )
  }

  const selectedInfo = selected ? formatServerTypeInfo(selected) : null

  const pickerOptions: PickerOption[] = availableServerTypes.map((type) => {
    const info = formatServerTypeInfo(type)
    return {
      value: type.name,
      title: type.name,
      subtitle: `€${info.price}/mo`,
      detail: `${info.vcpus} vCPUs • ${info.ram} RAM • ${info.disk}`,
      description: type.description,
    }
  })

  return (
    <>
      <div className="picker-selector server-type-selector">
        <button
          className="picker-selector-button"
          onClick={() => setIsPickerOpen(true)}
        >
          <div className="picker-selected-info">
            <span className="picker-selected-primary">{selected?.name}</span>
            <span className="picker-selected-secondary">€{selectedInfo?.price || '0'}/mo</span>
          </div>
          <svg className="picker-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6"></path>
          </svg>
        </button>
      </div>

      <PickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        title="Select Server Type"
        options={pickerOptions}
        selectedValue={value}
        onSelect={onChange}
      />
    </>
  )
}
