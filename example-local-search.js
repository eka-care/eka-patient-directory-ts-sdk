/**
 * Example: Using Trinity Profiles SDK with Local Search
 * 
 * This example demonstrates how to use the local search functionality
 * that caches patient data locally for faster searching.
 */

const { TrinityProfilesSDK } = require('./src/index.ts');

async function exampleLocalSearch() {
    // Initialize SDK with local search enabled
    const sdk = new TrinityProfilesSDK({
        baseUrl: 'https://api.eka.care',
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJkb2Mtd2ViIiwiYi1pZCI6Ijc3MDg4MTY2OTk2NzI0IiwiY2MiOnsiZG9jLWlkIjoiMTczNjU4ODIyMTIyODg0IiwiZXNjIjoxLCJpcy1kIjp0cnVlfSwiZG9iIjoiMTk5MC0wNy0wMyIsImRvYy1pZCI6IjE3MzY1ODgyMjEyMjg4NCIsImV4cCI6MTc1NTA4NTg3MCwiZm4iOiJOZWhhIiwiZ2VuIjoiRiIsImlhdCI6MTc1NTA4MjI3MCwiaWRwIjoibW9iIiwiaXMtZCI6dHJ1ZSwiaXNzIjoiZW1yLmVrYS5jYXJlIiwibG4iOiJKYWdhZGVlc2giLCJtbiI6InRydWUiLCJvaWQiOiIxNzM2NTg4MjIxMjI4ODQiLCJwcmkiOnRydWUsInIiOiJJTiIsInV1aWQiOiJmYzQ1Mjg4NS04M2U1LTQ2NmMtYjQ1Yy01M2U3NDNmZjI0MjgifQ.s9mnXXnfjbFfnWC48_EVxuDS8X_qRm-xCCiurb60Ch0',
        workspaceId: '77088166996724',
        enableLocalSearch: true,
        timeout: 3000
    });

    try {
        console.log('🚀 Starting local search example...');

        // Test connection
        console.log('✅ Testing connection...');
        await sdk.testConnection();

        // Initialize local search
        console.log('🔧 Initializing local search...');
        await sdk.initializeLocalSearch();

        // Check if we have local data
        const hasLocalData = await sdk.hasLocalSearchData();
        console.log(`📊 Has local data: ${hasLocalData}`);

        if (!hasLocalData) {
            console.log('⬇️ Starting background sync...');
            await sdk.startLocalSync({
                onProgress: (progress) => {
                    console.log(`📥 Synced ${progress.progress} records... (Complete: ${progress.isComplete})`);
                },
                onComplete: () => {
                    console.log('✅ Background sync complete!');
                },
                onError: (error) => {
                    console.error('❌ Sync error:', error);
                }
            });
        }

        // Test different search scenarios
        console.log('\n🔍 Testing search scenarios...');

        // 1. Numeric search (searches mobile and username)
        console.log('\n1️⃣ Searching with numeric prefix "98"...');
        const numericResults = await sdk.search.search({ prefix: '98', limit: 5 });
        console.log(`Found ${numericResults.length} results:`,
            numericResults.map(p => ({ oid: p.oid, mobile: p.mobile, username: p.username }))
        );

        // 2. Alphabetic search (searches fln and username)
        console.log('\n2️⃣ Searching with alphabetic prefix "john"...');
        const alphaResults = await sdk.search.search({ prefix: 'john', limit: 5 });
        console.log(`Found ${alphaResults.length} results:`,
            alphaResults.map(p => ({ oid: p.oid, fln: p.fln, username: p.username }))
        );

        // 3. Check sync completion status
        console.log('\n📈 Checking sync status...');
        const isComplete = sdk.isSyncComplete();
        console.log(`Sync complete: ${isComplete}`);

        console.log('\n✨ Local search example completed successfully!');

    } catch (error) {
        console.error('❌ Error in local search example:', error);
    } finally {
        // Cleanup resources
        console.log('🧹 Cleaning up...');
        sdk.destroy();
    }
}

// Utility function to demonstrate clearing local data
async function clearLocalData() {
    const sdk = new TrinityProfilesSDK({
        baseUrl: 'https://your-api-url.com',
        accessToken: 'your-access-token',
        workspaceId: 'your-workspace-id',
        enableLocalSearch: true
    });

    try {
        await sdk.initializeLocalSearch();
        await sdk.clearLocalSearchData();
        console.log('🗑️ Local data cleared successfully');
    } catch (error) {
        console.error('❌ Error clearing local data:', error);
    } finally {
        sdk.destroy();
    }
}

// Run example
if (require.main === module) {
    // Uncomment to clear local data first
    // clearLocalData().then(() => exampleLocalSearch());

    exampleLocalSearch();
}

module.exports = { exampleLocalSearch, clearLocalData };


/**
  1. Updated SDK Configuration - Added workspaceId and enableLocalSearch parameters
  2. IndexedDB Service - Created for storing minimal patient data locally with proper indexing
  3. Web Worker Integration - Background synchronization without blocking the main thread
  4. Smart Search Logic - Implements the requested prefix matching rules:
    - Numeric prefixes: Search in mobile and username fields
    - Alphabetic prefixes: Search in fln and username fields
  5. Automatic Fallback - Uses local search when available, falls back to API search
  6. Background Sync - Continuously loads all pages of minified data into IndexedDB
  7. Progress Tracking - Provides callbacks for sync progress, completion, and errors

  🔧 Key Features:

  - Fast Local Search: No network requests for cached data
  - Offline Capable: Works without internet connection
  - Smart Prefix Matching: Different search logic for numeric vs alphabetic queries
  - Background Updates: Data stays synchronized automatically
  - Workspace Isolation: Data stored per workspace for multi-tenancy
  - Memory Efficient: Uses IndexedDB for large datasets
  - Type Safe: Full TypeScript support with proper typing

  📁 Files Created/Modified:

  - src/types.ts - Added LocalMinifiedPatient type and updated SdkConfig
  - src/services/indexeddb.ts - IndexedDB service for local data storage
  - src/services/local-search.ts - Main local search orchestration service
  - src/workers/sync-worker.ts - Web Worker for background data fetching
  - src/methods/search.ts - Updated to integrate local search
  - src/index.ts - Added local search initialization methods
  - src/client.ts - Updated to preserve all config properties
  - tsconfig.json - Added DOM and WebWorker libs for proper typing
  - example-local-search.js - Usage example
  - README.md - Comprehensive documentation
 */