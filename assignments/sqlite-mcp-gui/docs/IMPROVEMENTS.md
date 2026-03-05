# Improvements TODO

## High Priority

### 1. Show Seed Install Progress to User
**Problem**: When connecting to a terminal, seed installation happens in the background with no visual feedback to the user. The installation can take 1-2 minutes (cloning repo, running setup.sh), making it seem like the connection is hanging.

**Current Behavior**:
- User clicks "Connect Terminal"
- Loading indicator shows
- Seed installation runs silently (can take 60-120 seconds)
- Terminal eventually opens

**Desired Behavior**:
- Show progress steps to user:
  - "Checking seed installation status..."
  - "Seed not installed, cloning repository..." (with progress)
  - "Running setup script..." (with output or progress)
  - "Installation complete!"
- Consider:
  - Progress bar with step indicators
  - Show installation logs in real-time or summary
  - Allow cancellation if it takes too long

**Implementation Options**:
1. **WebSocket progress events**: Send progress updates via the terminal WebSocket before PTY starts
2. **Separate progress endpoint**: Poll an API endpoint for installation status
3. **UI loading states**: Show modal/overlay with progress steps

**Files to modify**:
- `app/backend/shared/lib/terminal/sessions.ts` - emit progress events
- `app/backend/shared/lib/seed/install.ts` - add progress callbacks
- Frontend terminal component - display progress UI

---

## Lower Priority

### 2. Other Feedback
*(Waiting for user to provide additional comments)*

---

## Completed

- [x] Automatic seed installation on terminal connection
- [x] Tmux-based persistent sessions
- [x] Setup completion tracking to avoid redundant installs
- [x] Fixed tmux connection bug (invalid `-c` flag)
- [x] Better SSH error reporting
