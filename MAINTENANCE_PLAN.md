# Codebase Maintenance Plan

## Assessment Date: 2025-03-23
## Session ID: daemon-mn3o8e27

### Critical Issues (Immediate Action Required)

#### 1. Security Vulnerabilities 🔴
- **simple-git**: Critical RCE vulnerability (workspace dependency)
- **form-data**: Critical unsafe random function vulnerability  
- **tar**: High severity path traversal vulnerabilities
- **undici**: Multiple high severity vulnerabilities (DoS, WebSocket issues)
- **axios**: Multiple high severity SSRF/DoS vulnerabilities
- **@hono/node-server**: Authorization bypass vulnerability
- **qs**: DoS vulnerability via arrayLimit bypass
- **request**: SSRF vulnerability

**Action Plan**: 
1. Update vulnerable dependencies to patched versions
2. Run `bun update` for transitive dependencies
3. Verify fixes with `bun audit`

### High Priority Issues

#### 2. Code Quality Issues 🟡
- **Console.log statements**: 20+ instances of console.log/debug that should use proper logging
  - Files affected: api-client-impl.ts, enforcer.ts, middleware.ts, hooks/index.ts, etc.
- **TypeScript `any` type**: Multiple files using unsafe `any` type
  - Files affected: agent.ts, tools/index.ts, api-client-impl.ts, bounds/*, etc.
- **TypeScript strictness**: 
  - `noUnusedLocals`: false (should be true)
  - `noUnusedParameters`: false (should be true)

**Action Plan**:
1. Create centralized logging utility
2. Replace console.log statements with logger
3. Replace `any` types with proper types
4. Enable stricter TypeScript checks incrementally

#### 3. Deprecated Code 🟡
- Multiple deprecated functions and schemas identified
- Files: loop-serializer.ts, session-store.ts, mcp.zod.ts, api.zod.ts

**Action Plan**:
1. Audit deprecated code usage
2. Migrate to new APIs
3. Remove deprecated code if no longer used

### Medium Priority Issues

#### 4. Outdated Dependencies 🟠
Major version updates available:
- @anthropic-ai/sdk: 0.39.0 → 0.80.0
- ink: 5.2.1 → 6.8.0
- react: 18.3.1 → 19.2.4
- yargs: 17.7.2 → 18.0.0
- eventsource: 3.0.7 → 4.1.0

Minor/Patch updates:
- @swc/wasm: 1.15.18 → 1.15.21
- @tanstack/react-query: 5.90.21 → 5.95.2
- glob: 12.0.0 → 13.0.6
- hardhat: 3.1.11 → 3.2.0
- ora: 8.2.0 → 9.3.0
- viem: 2.46.3 → 2.47.6
- wagmi: 3.5.0 → 3.6.0
- ws: 8.19.0 → 8.20.0

**Action Plan**:
1. Test compatibility with major version bumps in isolated branch
2. Update patch/minor versions after security fixes
3. Review changelogs for breaking changes

### Low Priority Issues

#### 5. Git Status 🟢
- Modified submodule: assignments/tui-calculator
- Current branch: feat/defi-dashboard-enhancements

#### 6. TODOs 🟢
- TODO comment in ecosystem/tools/index.ts about image blocks
- Pattern matching TODOs in daemon/autonomous.ts

### Execution Order

1. **Phase 1**: Security Fixes (Critical)
   - Update vulnerable dependencies
   - Run security audit
   - Verify fixes

2. **Phase 2**: Code Quality (High Priority)
   - Create logging utility
   - Replace console.log statements
   - Fix TypeScript issues
   - Remove deprecated code

3. **Phase 3**: Dependency Updates (Medium Priority)
   - Update patch/minor versions
   - Test major version updates

4. **Phase 4**: Documentation & Cleanup (Low Priority)
   - Address TODOs
   - Update documentation
   - Clean up git status

### Notes
- Tests are currently passing (some skipped due to missing API keys)
- TypeScript build is successful
- 251 TypeScript source files in codebase
