import React, { useState } from 'react'
import { useSSHKeys } from '../../hooks/useSSHKeys'
import { PickerModal, PickerOption } from '../shared/PickerModal'

interface SSHKeySelectorProps {
  value: string[]
  onChange: (value: string[]) => void
}

export function SSHKeySelector({ value, onChange }: SSHKeySelectorProps) {
  const { sshKeys, loading } = useSSHKeys()
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  if (loading) {
    return (
      <div className="picker-selector ssh-key-selector">
        <button className="picker-selector-button" disabled>
          <span className="picker-selected-primary">Loading SSH keys...</span>
        </button>
      </div>
    )
  }

  if (sshKeys.length === 0) {
    return (
      <div className="picker-selector ssh-key-selector">
        <button className="picker-selector-button" disabled>
          <span className="picker-selected-primary">No SSH keys available</span>
        </button>
      </div>
    )
  }

  const selectedKeys = sshKeys.filter(k => value.includes(k.name))
  const selectedLabel = selectedKeys.length > 0
    ? selectedKeys.length === 1
      ? selectedKeys[0].name
      : `${selectedKeys.length} keys selected`
    : 'No SSH keys (password auth)'

  const pickerOptions: PickerOption[] = sshKeys.map((key) => ({
    value: key.name,
    title: key.name,
    subtitle: key.fingerprint.substring(0, 16) + '...',
    detail: new Date(key.created).toLocaleDateString(),
    description: key.public_key.substring(0, 60) + '...',
  }))

  const handleToggleKey = (keyName: string) => {
    if (value.includes(keyName)) {
      onChange(value.filter(k => k !== keyName))
    } else {
      onChange([...value, keyName])
    }
  }

  return (
    <>
      <div className="picker-selector ssh-key-selector">
        <button
          className="picker-selector-button"
          onClick={() => setIsPickerOpen(true)}
        >
          <div className="picker-selected-info">
            <span className="picker-selected-primary">{selectedLabel}</span>
          </div>
          <svg className="picker-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6"></path>
          </svg>
        </button>
      </div>

      <PickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        title="Select SSH Keys"
        options={pickerOptions}
        selectedValue={value[0] || null}
        onSelect={handleToggleKey}
        multiSelect={true}
        selectedValues={new Set(value)}
      />
    </>
  )
}
