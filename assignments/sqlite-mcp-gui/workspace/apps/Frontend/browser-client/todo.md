# Frontend TODO

Backend API is fully implemented at `app/backend/shared/index.ts`. Below is what needs frontend integration.

## ✅ DONE - Environment Management

All implemented in `useEnvironmentsApi.ts`:

- ✅ GET `/api/environments` - List environments (`loadEnvironments`)
- ✅ POST `/api/environments` - Create environment (`handleCreateEnvironment`)
- ✅ DELETE `/api/environments/:id` - Delete environment (`handleDeleteEnvironment`)
- ✅ POST `/api/environments/:id/start` - Start server (`handleStartEnvironment`)
- ✅ POST `/api/environments/:id/stop` - Stop server (`handleStopEnvironment`)
- ✅ GET `/api/environments/:id/resources` - Resource usage (`loadResources`)
- ✅ POST `/api/ssh` - Open SSH in Terminal (`handleConnectEnvironment`)
- ✅ POST `/api/screenshot` - Take screenshot (`handleScreenshot`)

---

## 🔲 TODO - SSH & File Operations

### POST `/api/ssh/test` - Test SSH connection
- [ ] Connection test before opening terminal
- [ ] Visual feedback (success/error)

### POST `/api/ssh/fingerprint` - Get SSH fingerprint
- [ ] Display fingerprint for verification
- [ ] Security prompt before connecting

### POST `/api/scp/upload` - Upload file via SCP
- [ ] FileBrowser upload functionality
- [ ] FormData multipart upload
- [ ] Progress indication
- [ ] Success/error feedback

### POST `/api/scp/download` - Download file via SCP
- [ ] FileBrowser download functionality
- [ ] Recursive directory download option

### POST `/api/files/list` - List remote files
- [ ] FileBrowser component (verify exists)
- [ ] Navigate directories
- [ ] Show file sizes, permissions, timestamps

### POST `/api/files/preview` - Preview file content
- [ ] Text file preview
- [ ] Syntax highlighting for code
- [ ] Image preview
- [ ] Size limits for large files

---

## 🔲 TODO - macOS Automation (local only)

### GET `/api/macos/window/focused` - Get focused window with screenshot
- [ ] Returns app name, window title, screenshot (base64)
- [ ] macOS only (AppleScript + screencapture)
- [ ] Niche use case (window tracking/automation)

---

## 🔲 TODO - AI Features (GLM-4.7)

### GET `/api/ai/capabilities` - Check AI availability
- [ ] Show AI status in UI
- [ ] Disable AI features if unavailable

### POST `/api/ai/generate` - Simple text generation
- [ ] Generic AI text generation
- [ ] Temperature, maxTokens controls

### POST `/api/ai/chat` - Chat completion
- [ ] Multi-turn conversation
- [ ] Message history
- [ ] Streaming responses

### POST `/api/ai/suggest/name` - AI server naming
- [ ] Generate server names from project/description
- [ ] Integration with create environment form

### POST `/api/ai/suggest/server-type` - Server type recommendation
- [ ] Input workload description
- [ ] Recommend optimal server type
- [ ] Cost considerations

### POST `/api/ai/analyze/resources` - Resource analysis
- [ ] Analyze CPU/memory/disk usage
- [ ] Recommendations for optimization
- [ ] Alert thresholds

### POST `/api/ai/troubleshoot/ssh` - SSH troubleshooting
- [ ] Input error message
- [ ] Get AI troubleshooting tips
- [ ] Common SSH issue patterns

### POST `/api/ai/suggest/actions` - Action suggestions
- [ ] Based on server status and age
- [ ] Suggest restart, resize, cleanup

### POST `/api/ai/status/message` - Witty status messages
- [ ] Fun status messages based on server state
- [ ] Personality/engagement

### POST `/api/ai/analyze/historical` - Historical metrics analysis
- [ ] Analyze trends over N hours
- [ ] Compare current vs historical averages
- [ ] Trend detection (increasing, decreasing, stable)

---

## 🔲 TODO - Metrics & Monitoring

### GET `/api/environments/:id/metrics` - Metrics history
- [ ] Query params: `?hours=24&limit=100`
- [ ] Time-series chart
- [ ] Multiple metrics (CPU, memory, disk)

### GET `/api/environments/:id/metrics/summary` - Metrics summary
- [ ] Stats: avg, min, max, trend
- [ ] Query param: `?hours=24`
- [ ] Summary cards/dashboards

### POST `/api/metrics` - Manual metric insertion
- [ ] Testing endpoint only - not for production UI

---

## 🔲 TODO - Configuration

### GET `/api/server-types` - List available server types
- [ ] ServerTypeSelector component (verify exists)
- [ ] Show pricing, specs
- [ ] Filter by region availability

### GET `/api/locations` - List available locations
- [ ] RegionSelector component (verify exists)
- [ ] Show datacenter names
- [ ] Latency indicators

### GET `/api/health` - Health check
- [ ] Backend status indicator
- [ ] Platform info display
- [ ] AI availability status

---

## Components Status (verify existing)

- [x] `App.tsx` - Main app
- [x] `EnvironmentList.tsx` - Server list
- [x] `EnvironmentDetails.tsx` - Server detail view
- [x] `CreateEnvironmentForm.tsx` - Create form
- [x] `RegionSelector.tsx` - Region picker
- [x] `ServerTypeSelector.tsx` - Server type picker
- [x] `ResourceMonitor.tsx` - Resource display
- [x] `ResourceChart.tsx` - Resource chart
- [x] `AIAssistant.tsx` - AI features panel
- [x] `FileBrowser.tsx` - File operations
- [x] `TerminalSheet.tsx` - Terminal integration
- [x] `ActivityLog.tsx` - Action history
- [x] ConfirmDialog, NotificationToast, Loading, etc.

## Hooks Status (verify existing)

- [x] `useEnvironmentsApi.ts` - Environment API calls
- [x] `useHetznerData.ts` - Polling for server data
- [x] `useHetznerAction.ts` - Server actions (start/stop/delete)
- [x] `useFileBrowser.ts` - File operations
- [x] `useAppState.ts` - Global state
- [x] `useKeyboardShortcuts.ts` - Hotkeys
- [x] `useActivities.ts` - Activity tracking
