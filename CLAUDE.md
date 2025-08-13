# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run build` - Compile TypeScript to JavaScript in dist/
- `npm run dev` - Watch mode compilation (tsc --watch)  
- `npm run type-check` - Type checking without emitting files (tsc --noEmit)
- `npm run test` - Run SDK tests using test-sdk.js

## Architecture Overview

This is a TypeScript SDK for the Trinity Patient Profile Management System with the following key architectural patterns:

### Core Structure
- **Main SDK Class**: `TrinityProfilesSDK` (src/index.ts) - singleton pattern with method groups
- **HTTP Client**: `HttpClient` (src/client.ts) - handles all API communication with Bearer token auth
- **Method Groups**: Organized by functionality in src/methods/
  - `PatientMethods` - CRUD operations for patients
  - `SearchMethods` - Search and lookup operations with local/remote fallback
  - `UtilsMethods` - Utility operations (validation, formatting, etc.)

### Local Search Architecture
- **Hybrid Search**: Falls back from local IndexedDB to remote API automatically
- **Background Sync**: Uses Web Workers (src/workers/sync-worker.ts) or direct sync
- **Data Storage**: IndexedDB with workspace isolation via `DataLoader` (src/services/data-loader.ts)
- **Search Logic**: Prefix matching with different strategies for numeric vs alphabetic queries

### Key Design Patterns
- **Method Chaining**: `sdk.patients.create()`, `sdk.search.bulkGet()`, etc.
- **Error Handling**: Custom error hierarchy in src/errors.ts with specific error types
- **Configuration**: Single config object passed to constructor, stored in HttpClient
- **Type Safety**: Comprehensive TypeScript interfaces in src/types.ts based on V2 API serializers

### API Integration
- Uses V2 business patient serializers with specific field mappings:
  - `wid` for workspace ID (not `bid`)
  - `bg` for blood group (not `bloodgroup`) 
  - Separate `mobile` + `ccd` fields (not E.164 format)
  - Epoch timestamps for `c_ate`, `u_ate`

### Testing
- Basic test runner in test-sdk.js (not a formal test framework)
- Manual testing approach - check this file for current test patterns

### Build Output
- TypeScript compiles to dist/ directory
- Includes declaration files (.d.ts) for TypeScript consumers
- Workers built to dist/workers/ for runtime loading