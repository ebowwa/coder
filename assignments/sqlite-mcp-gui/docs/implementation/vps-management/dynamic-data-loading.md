# Dynamic Data Loading Documentation

## Overview

This document describes the implementation of dynamic data loading for Hetzner server types and regions, replacing the previous hardcoded data approach.

## Problem Statement

### Original Implementation Issues

The application previously used hardcoded server types and regions in multiple components:

1. **CostEstimate.tsx**: Hardcoded `SERVER_PRICES` map with fixed pricing
2. **SettingsPanel.tsx**: Hardcoded `SERVER_TYPES` and `REGIONS` arrays
3. **useAppState.ts**: Hardcoded default values (`'cpx11'`, `'nbg1'`)
4. **AI Prompts**: Constraints limiting suggestions to specific server types
5. **Backend**: Mock mode using hardcoded defaults

### Impact

- **Less Maintainable**: Required code changes whenever Hetzner updated pricing or added new server types/locations
- **Stale Data**: Could not reflect real-time pricing changes
- **Limited Options**: Users couldn't access newly released server types or regions
- **Inconsistent Data**: Different components might have different versions of the same data
- **Developer Burden**: Manual updates required for every API change

## Solution

### Architecture

The solution implements a centralized data fetching pattern using React hooks:

```
┌─────────────────┐
│  Frontend App   │
└────────┬────────┘
         │
         │ Fetch
         ▼
┌─────────────────┐     ┌─────────────────────┐
│ useServerTypes  │────▶│  Backend API        │
├─────────────────┤     │  /api/server-types  │
│ useLocations   │────▶│  /api/locations     │
└─────────────────┘     └──────────┬──────────┘
                                 │
                                 │ Fetch
                                 ▼
                        ┌─────────────────┐
                        │  Hetzner API    │
                        │  /pricing       │
                        └─────────────────┘
```

### Implementation Details

#### 1. Data Fetching Hooks (`useHetznerData.ts`)

```typescript
// Hook for fetching server types
export function useServerTypes() {
  const [serverTypes, setServerTypes] = useState<HetznerServerType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchServerTypes = async () => {
      const response = await fetch('/api/server-types')
      const data = await response.json()
      
      // Filter deprecated types and sort by price
      const activeTypes = data.serverTypes
        .filter(t => !t.deprecated)
        .sort((a, b) => a.prices[0].price_monthly - b.prices[0].price_monthly)
      
      setServerTypes(activeTypes)
      setLoading(false)
    }
    fetchServerTypes()
  }, [])

  return { serverTypes, loading, error }
}

// Hook for fetching locations
export function useLocations() {
  // Similar implementation for locations
}
```

**Key Features:**
- Automatic filtering of deprecated server types
- Price-based sorting for better UX
- Loading and error states
- Type-safe TypeScript interfaces

#### 2. Backend API Endpoints (`index.ts`)

```typescript
// GET /api/server-types
app.get("/api/server-types", async (c) => {
  if (!hetznerClient) {
    return c.json({ success: true, serverTypes: [] });
  }
  
  const serverTypes = await hetznerClient.pricing.listServerTypes();
  return c.json({ success: true, serverTypes });
});

// GET /api/locations
app.get("/api/locations", async (c) => {
  if (!hetznerClient) {
    return c.json({ success: true, locations: [] });
  }
  
  const locations = await hetznerClient.pricing.listLocations();
  return c.json({ success: true, locations });
});
```

**Features:**
- Graceful fallback when Hetzner client is unavailable
- Direct passthrough of Hetzner API data
- Consistent error handling

#### 3. Component Updates

##### CostEstimate Component

**Before:**
```typescript
const SERVER_PRICES = {
  'cpx11': 3.32,
  'cpx21': 5.76,
  // ... hardcoded prices
}

function getServerPrice(serverType: string): number {
  return SERVER_PRICES[serverType] || 5.0
}
```

**After:**
```typescript
export function CostEstimate({ environments }: CostEstimateProps) {
  const { serverTypes, loading } = useServerTypes()
  
  if (loading) {
    return <div className="cost-estimate">Loading pricing...</div>
  }
  
  function getServerPrice(serverType: string): number {
    const type = serverTypes.find(t => t.name === serverType)
    return type?.prices[0].price_monthly / 100 || 5.0
  }
  
  // ... rest of component
}
```

##### SettingsPanel Component

**Before:**
```typescript
const SERVER_TYPES = [
  { name: 'cpx11', vcpus: 2, ram: '2 GB', price: '3.32€/month' },
  // ... hardcoded types
]

const REGIONS = [
  { name: 'nbg1', location: 'Nuremberg, Germany' },
  // ... hardcoded regions
]
```

**After:**
```typescript
export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { serverTypes: availableServerTypes, loading: serverTypesLoading } = useServerTypes()
  const { locations: availableLocations, loading: locationsLoading } = useLocations()
  
  // Dynamic dropdowns
  <select value={settings.defaultServerType}>
    {availableServerTypes.map(type => {
      const info = formatServerTypeInfo(type)
      return (
        <option key={type.name} value={type.name}>
          {type.name} - {info.vcpus} vCPUs, {info.ram} RAM (€{info.price}/mo)
        </option>
      )
    })}
  </select>
  
  <select value={settings.defaultRegion}>
    {availableLocations.map(location => {
      const flag = getCountryFlag(location.country)
      return (
        <option key={location.name} value={location.name}>
          {location.name} - {location.city}, {location.country} {flag}
        </option>
      )
    })}
  </select>
}
```

#### 4. Default Values Initialization

```typescript
// In App.tsx
const { serverTypes } = useServerTypes()
const { locations } = useLocations()

// Set default server type when API data loads
useEffect(() => {
  if (serverTypes.length > 0 && !state.selectedServerType) {
    state.setSelectedServerType(serverTypes[0].name)
  }
}, [serverTypes, state.selectedServerType, state.setSelectedServerType])

// Set default region when API data loads
useEffect(() => {
  if (locations.length > 0 && !state.selectedRegion) {
    state.setSelectedRegion(locations[0].name)
  }
}, [locations, state.selectedRegion, state.setSelectedRegion])
```

#### 5. AI Prompt Updates

**Before:**
```typescript
.constraints(
  'Respond with just the server type name',
  'Follow with one brief sentence explaining why',
  'Only suggest from: cpx11, cpx21, cpx31, cpx41, cpx51'
)
```

**After:**
```typescript
.constraints(
  'Respond with just the server type name',
  'Follow with one brief sentence explaining why',
  'Suggest any appropriate Hetzner server type based on the workload needs'
)
```

## Benefits

### 1. Maintainability
- Single source of truth for pricing and location data
- No code changes needed when Hetzner updates their offerings
- Easier to debug data-related issues

### 2. Accuracy
- Always reflects current Hetzner pricing
- Automatic inclusion of new server types and locations
- Real-time data synchronization

### 3. User Experience
- Access to latest server types immediately after Hetzner release
- Accurate cost estimates
- Better selection with up-to-date specifications

### 4. Developer Experience
- Type-safe data structures
- Consistent error handling
- Predictable loading states

### 5. Scalability
- Easy to add caching mechanisms
- Supports future data transformations
- Ready for internationalization (i18n)

## Technical Considerations

### Data Caching (Future Enhancement)

Current implementation fetches data on every component mount. Future enhancements could include:

```typescript
// Example: Adding caching with stale-while-revalidate
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function useServerTypes() {
  const [serverTypes, setServerTypes] = useState<HetznerServerType[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<number>(0)
  
  useEffect(() => {
    const now = Date.now()
    const isStale = now - lastUpdated > CACHE_DURATION
    
    if (!isStale && serverTypes.length > 0) {
      setLoading(false)
      return
    }
    
    fetchServerTypes()
      .then(data => {
        setServerTypes(data)
        setLastUpdated(now)
      })
  }, [])
  
  return { serverTypes, loading }
}
```

### Error Handling

Components gracefully handle:
- Network errors (fallback to empty state)
- API unavailability (returns empty arrays)
- Loading states (shows loading indicators)
- Missing data (uses sensible defaults)

### Performance

- Minimal API calls (shared via React hooks)
- Efficient re-renders through proper memoization
- No unnecessary data duplication

## Migration Guide

### For Developers

If you need to add a new component that requires server types or regions:

```typescript
import { useServerTypes, useLocations } from '../hooks/useHetznerData'

function MyComponent() {
  const { serverTypes, loading: typesLoading, error: typesError } = useServerTypes()
  const { locations, loading: locationsLoading, error: locationsError } = useLocations()
  
  if (typesLoading || locationsLoading) {
    return <LoadingState />
  }
  
  if (typesError || locationsError) {
    return <ErrorState error={typesError || locationsError} />
  }
  
  // Use serverTypes and locations
}
```

### Testing

```typescript
// Example test with mocked API
import { renderHook } from '@testing-library/react'

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({
      success: true,
      serverTypes: [
        { name: 'cpx11', prices: [{ price_monthly: 332 }], ... }
      ]
    })
  })
)

test('fetches server types', async () => {
  const { result, waitForNextUpdate } = renderHook(() => useServerTypes())
  
  expect(result.current.loading).toBe(true)
  
  await waitForNextUpdate()
  
  expect(result.current.loading).toBe(false)
  expect(result.current.serverTypes).toHaveLength(1)
  expect(result.current.serverTypes[0].name).toBe('cpx11')
})
```

## Testing Strategy

### Unit Tests

- **Hook tests**: Verify `useServerTypes` and `useLocations` behavior
- **Component tests**: Test components with mocked data
- **Utility functions**: Test `formatServerTypeInfo` and `getCountryFlag`

### Integration Tests

- **API endpoints**: Verify backend returns correct Hetzner API data
- **End-to-end**: Test full user flow from data fetch to selection

### Manual Testing Checklist

- [ ] Server types load correctly
- [ ] Locations load correctly
- [ ] Loading states display properly
- [ ] Error states handle failures gracefully
- [ ] Pricing is accurate
- [ ] New server types appear without code changes
- [ ] New locations appear without code changes
- [ ] Cost estimates update dynamically
- [ ] Settings panel shows correct options

## Related Files

### Frontend Components
- `app/browser-client/hooks/useHetznerData.ts` - Data fetching hooks
- `app/browser-client/components/shared/CostEstimate.tsx` - Cost calculations
- `app/browser-client/components/shared/SettingsPanel.tsx` - Settings UI
- `app/browser-client/components/environments/ServerTypeSelector.tsx` - Type selection
- `app/browser-client/components/environments/RegionSelector.tsx` - Region selection

### Backend
- `app/backend/shared/index.ts` - API endpoints

### State Management
- `app/browser-client/hooks/useAppState.ts` - Application state
- `app/browser-client/App.tsx` - Root component initialization

## Future Enhancements

1. **Caching Layer**: Implement client-side or server-side caching
2. **Optimistic Updates**: Show data immediately, update in background
3. **WebSocket Updates**: Real-time updates when pricing changes
4. **Data Filtering**: Allow users to filter by region, CPU, RAM, etc.
5. **Price History**: Track pricing trends over time
6. **Recommendations**: AI-powered server type suggestions based on usage patterns

## Troubleshooting

### Common Issues

#### Issue: Server types not loading
**Solution**: Check network connectivity and API endpoint availability

#### Issue: Stale data displayed
**Solution**: Implement cache invalidation or refresh mechanism

#### Issue: TypeError on price access
**Solution**: Ensure proper null checks when accessing nested properties

#### Issue: Slow initial load
**Solution**: Implement skeleton loading states or caching

## References

- [Hetzner API Documentation](https://docs.hetzner.cloud/)
- [Hetzner Pricing API](https://docs.hetzner.cloud/#server-types-get-pricing)
- [React Hooks Documentation](https://react.dev/reference/react)
- [Project README](../README.md)

## Changelog

### Version 1.0.0 (Current)
- Initial implementation of dynamic data loading
- Replaced hardcoded server types and regions
- Added loading and error states
- Updated AI prompts to remove hardcoded constraints
- Migrated CostEstimate, SettingsPanel, and related components
- Updated default value initialization
</arg_value>