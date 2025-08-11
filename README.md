# Trinity Profiles SDK

A TypeScript SDK for the Trinity Patient Profile Management System. This SDK provides a type-safe, easy-to-use interface for managing patient profiles through the Trinity API.

## Features

- 🔐 **Bearer Token Authentication** - Secure JWT-based authentication
- 🎯 **Full TypeScript Support** - Complete type safety with IntelliSense
- 🚀 **Easy to Use** - Intuitive API design with comprehensive error handling
- 📦 **Modular Architecture** - Organized method groups for different operations
- 🔍 **Advanced Search** - Multiple search methods with flexible parameters
- ⚡ **V2 API Support** - Uses the latest V2 business patient serializers
- 🏃‍♀️ **Local Search** - Fast offline search with IndexedDB and Web Workers
- 🔄 **Background Sync** - Automatic data synchronization for optimal performance

## Installation

Since this SDK is distributed as source code, copy the `trinity-profiles-sdk` folder to your project and install dependencies:

```bash
cd trinity-profiles-sdk
npm install
```

## Quick Start

```typescript
import { TrinityProfilesSDK } from './trinity-profiles-sdk';

// Initialize the SDK
const sdk = new TrinityProfilesSDK({
  baseUrl: 'https://your-trinity-api.com',
  accessToken: 'your-jwt-token',
  workspaceId: 'your-workspace-id',
  enableLocalSearch: true, // optional, enables local search
  timeout: 30000 // optional, defaults to 30s
});

// Initialize local search (if enabled)
await sdk.initializeLocalSearch();

// Start background sync for faster searches
await sdk.startLocalSync({
  onProgress: (progress, total) => console.log(`Synced ${progress} records`),
  onComplete: () => console.log('Sync complete!'),
  onError: (error) => console.error('Sync failed:', error)
});

// Create a patient
const patient = await sdk.patients.create({
  oid: 'unique-patient-id',
  gen: 'M',
  dob: '1990-01-01',
  fn: 'John',
  ln: 'Doe',
  mobile: '1234567890',
  email: 'john@example.com'
});

// Get a patient
const patient = await sdk.patients.get('patient-oid');

// Search patients (uses local search if available, falls back to API)
const results = await sdk.search.search({ prefix: 'john', limit: 10 });
```

## API Reference

### SDK Initialization

```typescript
const sdk = new TrinityProfilesSDK({
  baseUrl: string;         // Trinity API base URL
  accessToken: string;     // JWT access token
  workspaceId: string;     // Workspace ID for local data storage
  enableLocalSearch?: boolean; // Enable local search (default: false)
  timeout?: number;        // Request timeout in ms (default: 30000)
});
```

### Patient Operations

#### Create Patient
```typescript
const patient = await sdk.patients.create({
  oid: string;        // Required: Unique identifier
  wid: string;        // Required: Workspace ID
  gen: 'M'|'F'|'O';   // Required: Gender
  dob: string;        // Required: Date of birth (YYYY-MM-DD)
  fn?: string;        // First name
  mn?: string;        // Middle name  
  ln?: string;        // Last name
  fln?: string;       // Full name
  mobile?: string;    // Mobile (digits only, no country code)
  ccd?: string;       // Country code (e.g., "+91")
  email?: string;     // Email address
  username?: string;  // Username
  bg?: BloodGroup;    // Blood group
  s?: string;         // Salutation
  abha?: string;      // ABHA address
  is_age?: boolean;   // DOB calculated from age
  extras?: object;    // Additional data
});
```

#### Get Patient
```typescript
const patient = await sdk.patients.get('patient-oid');
```

#### Update Patient
```typescript
const updated = await sdk.patients.update('patient-oid', {
  fn: 'Jane',
  email: 'jane@example.com'
  // ... other fields to update
});
```

#### Delete Patient
```typescript
await sdk.patients.delete('patient-oid');
```

#### Get by Username
```typescript
const patients = await sdk.patients.getByUsername('john.doe');
```

### Search Operations

#### Bulk Get by OIDs
```typescript
const patients = await sdk.search.bulkGet('oid1,oid2,oid3');
// or
const patients = await sdk.search.bulkGet(['oid1', 'oid2', 'oid3']);
```

#### Get by Mobile
```typescript
const patients = await sdk.search.getByMobile('1234567890');
```

#### Get Minified Profiles
```typescript
const profiles = await sdk.search.getMinified();
```

#### Advanced Search
```typescript
// Search by mobile
const patients = await sdk.search.search({ 
  mobile: '123456', 
  limit: 10 
});

// Search by username
const patients = await sdk.search.searchByUsername('john', 5);

// Search by name
const patients = await sdk.search.searchByName('John Doe', 20);

// Search by prefix with selected fields
const patients = await sdk.search.searchByPrefix(
  'jo', 
  15, 
  'oid,fln,mobile'
);
```

### Utility Operations

#### Remove Fields
```typescript
await sdk.utils.removeFields('patient-oid', ['email', 'mobile']);
```

#### Archive/Unarchive
```typescript
// Archive (soft delete)
await sdk.utils.archive('patient-oid');

// Unarchive
await sdk.utils.unarchive('patient-oid');
```

#### Validate Data
```typescript
const validation = sdk.utils.validatePatientData({
  gen: 'M',
  dob: '1990-01-01',
  fn: 'John'
});

if (!validation.isValid) {
  console.log('Validation errors:', validation.errors);
}
```

#### Format Display
```typescript
const formatted = sdk.utils.formatPatientDisplay(patient);
console.log(`Name: ${formatted.fullName}`);
console.log(`Age: ${formatted.age}`);
console.log(`Contact: ${formatted.contact}`);
```

## Local Search

The SDK provides powerful local search capabilities using IndexedDB for data storage and Web Workers for background synchronization. This enables fast, offline-capable search functionality.

### Enabling Local Search

```typescript
const sdk = new TrinityProfilesSDK({
  baseUrl: 'https://your-api.com',
  accessToken: 'your-token',
  workspaceId: 'your-workspace-id', // Required for local search
  enableLocalSearch: true
});
```

### Initialization

```typescript
// Initialize local search functionality
await sdk.initializeLocalSearch();

// Check if local data exists
const hasData = await sdk.hasLocalSearchData();

if (!hasData) {
  // Start background sync
  await sdk.startLocalSync({
    onProgress: (progress, total) => {
      console.log(`Synced ${progress} records`);
    },
    onComplete: () => {
      console.log('Initial sync completed!');
    },
    onError: (error) => {
      console.error('Sync failed:', error);
    }
  });
}
```

### Search Behavior

The local search implements intelligent prefix matching:

**For Numeric Prefixes (digits only):**
- Searches in `mobile` and `username` fields
- Example: `"98"` matches mobile numbers starting with 98

**For Alphabetic Prefixes (contains letters):**
- Searches in `fln` (full name) and `username` fields  
- Example: `"john"` matches names starting with John

```typescript
// Numeric search - searches mobile and username
const mobileResults = await sdk.search.search({ prefix: '98', limit: 10 });

// Alphabetic search - searches full name and username  
const nameResults = await sdk.search.search({ prefix: 'john', limit: 10 });

// Mixed search - treated as alphabetic
const mixedResults = await sdk.search.search({ prefix: 'john123', limit: 10 });
```

### Background Synchronization

```typescript
// Start background sync
await sdk.startLocalSync({
  onProgress: (progress, total) => console.log(`Progress: ${progress}`),
  onComplete: () => console.log('Sync complete'),
  onError: (error) => console.error('Error:', error)
});

// Stop sync
sdk.stopLocalSync();

// Check sync status
const status = await sdk.getLocalSyncStatus();
console.log('Is running:', status.isRunning);
console.log('Last sync:', new Date(status.lastSync));
```

### Data Management

```typescript
// Clear all local data
await sdk.clearLocalSearchData();

// Cleanup resources (call when done)
sdk.destroy();
```

### Fallback Behavior

Local search automatically falls back to API search when:
- Local search is disabled
- No local data is available
- Local search encounters an error

```typescript
// This will use local search if available, otherwise API
const results = await sdk.search.search({ prefix: 'john', limit: 10 });
```

### Performance Benefits

- **Instant Results**: No network requests for cached data
- **Offline Capable**: Works without internet connection
- **Background Updates**: Data stays synchronized automatically
- **Smart Indexing**: Optimized indexes for fast prefix matching
- **Memory Efficient**: Uses IndexedDB for large datasets

### Data Storage

Local search stores minimal patient data:
- `oid` - Patient ID
- `u_ate` - Update timestamp  
- `fln` - Full name
- `mobile` - Mobile number
- `username` - Username

Data is stored per workspace, ensuring isolation between different workspaces.

## Data Types

### Gender
```typescript
type Gender = "M" | "F" | "O";
```

### Blood Group
```typescript
type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
```

### Patient Interface
```typescript
interface Patient {
  oid: string;
  wid: string;
  ps: "P";
  c_ate: number;    // Creation timestamp (epoch)
  u_ate: number;    // Update timestamp (epoch)
  gen: Gender;
  dob: string;      // YYYY-MM-DD format
  fn?: string;
  mn?: string;
  ln?: string;
  fln?: string;
  ccd?: string;     // Country code
  mobile?: string;  // Without country code
  email?: string;
  username?: string;
  bg?: BloodGroup;
  s?: string;       // Salutation
  abha?: string;
  is_age?: boolean;
  arc?: boolean;    // Is archived
  extras?: Record<string, any>;
}
```

## Error Handling

The SDK provides specific error types for different scenarios:

```typescript
import { 
  ValidationError, 
  AuthenticationError, 
  NotFoundError,
  TrinitySDKError 
} from './trinity-profiles-sdk';

try {
  const patient = await sdk.patients.get('invalid-id');
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Validation failed:', error.validationErrors);
  } else if (error instanceof AuthenticationError) {
    console.log('Authentication failed - check your token');
  } else if (error instanceof NotFoundError) {
    console.log('Patient not found');
  } else if (error instanceof TrinitySDKError) {
    console.log('API error:', error.message, error.statusCode);
  }
}
```

## Token Management

```typescript
// Update token (e.g., after refresh)
sdk.updateAccessToken('new-jwt-token');

// Test connection
try {
  await sdk.testConnection();
  console.log('SDK connected successfully');
} catch (error) {
  console.error('Connection failed:', error.message);
}
```

## Important Notes

### V2 API Format
This SDK uses V2 business patient serializers with these key differences:
- **Workspace ID**: Use `wid` (not `bid`)
- **Blood Group**: Use `bg` (not `bloodgroup`)
- **Mobile Format**: Separate `mobile` + `ccd` fields (not E.164)
- **Timestamps**: Epoch integers (`c_ate`, `u_ate`)

### Authentication
- Uses `Authorization: Bearer <token>` headers
- Token is stored in memory (not persisted)
- API gateway handles JWT payload extraction

### Required Fields
For patient creation, these fields are required:
- `oid` - Unique identifier
- `wid` - Workspace ID  
- `gen` - Gender (M/F/O)
- `dob` - Date of birth (YYYY-MM-DD)
- At least one name field (`fn`, `mn`, `ln`, or `fln`)

## Development

This SDK is provided as TypeScript source code for easy customization and integration. No build step is required - copy the folder to your project and use directly.

### Type Checking
```bash
npm run type-check
```

### Development Mode
```bash
npm run dev
```

## Support

For issues and questions, please refer to the Trinity API documentation or contact the development team.