/**
 * Trinity Profiles SDK
 * 
 * A TypeScript SDK for interacting with the Trinity Patient Profile Management System.
 * This SDK provides a type-safe, easy-to-use interface for managing patient profiles
 * through the Trinity API.
 * 
 * @example
 * ```typescript
 * import { TrinityProfilesSDK } from './trinity-profiles-sdk';
 * 
 * const sdk = new TrinityProfilesSDK({
 *   baseUrl: 'https://api.trinity.example.com',
 *   accessToken: 'your-access-token'
 * });
 * 
 * // Create a patient
 * const patient = await sdk.patients.create({
 *   oid: 'unique-patient-id',
 *   gen: 'M',
 *   dob: '1990-01-01',
 *   fn: 'John',
 *   ln: 'Doe'
 * });
 * ```
 */

import { HttpClient } from './client';
import { PatientMethods } from './methods/patients';
import { SearchMethods } from './methods/search';
import { UtilsMethods } from './methods/utils';
import { CreatePatientData, Patient, SdkConfig } from './types';

/**
 * Main SDK class
 */
export class TrinityProfilesSDK {
    private client: HttpClient;
    private static instance: TrinityProfilesSDK | null = null;

    /** Patient CRUD operations */
    public patients: PatientMethods;

    /** Search and lookup operations */
    public search: SearchMethods;

    /** Utility operations */
    public utils: UtilsMethods;

    /**
     * Initialize the Trinity Profiles SDK
     * 
     * @param config SDK configuration
     * 
     * @example
     * ```typescript
     * const sdk = new TrinityProfilesSDK({
     *   baseUrl: 'https://api.trinity.example.com',
     *   accessToken: 'your-jwt-token',
     *   workspaceId: 'your-workspace-id',
     *   enableLocalSearch: true, // optional, enables local search functionality
     *   timeout: 30000 // optional, defaults to 30s
     * });
     * ```
     */
    constructor(config: SdkConfig) {
        // Validate configuration
        if (!config.baseUrl) {
            throw new Error('baseUrl is required');
        }

        if (!config.workspaceId) {
            throw new Error('workspaceId is required');
        }

        // Initialize HTTP client
        this.client = new HttpClient(config);

        // Initialize method groups
        this.patients = new PatientMethods(this.client);
        this.search = new SearchMethods(this.client, config);
        this.utils = new UtilsMethods(this.client);

        // Set up IndexedDB update callback for patients
        if (config.workspaceId) {
            this.patients.setIndexedDBUpdateCallback(async (patient) => {
                const indexedDB = this.search.getDataLoader()?.getIndexedDB();
                if (indexedDB) {
                    await indexedDB.updatePatient(patient);
                }
            });
        }
    }

    /**
     * Static method to get the singleton instance with optional initialization
     * 
     * @param config Optional SDK configuration for initialization
     * @returns Singleton instance of TrinityProfilesSDK
     * 
     * @example
     * ```typescript
     * // Get instance without initialization
     * const sdk = TrinityProfilesSDK.getInstance();
     * 
     * // Get instance with initialization
     * const sdk = TrinityProfilesSDK.getInstance({
     *   baseUrl: 'https://api.trinity.example.com',
     *   accessToken: 'your-jwt-token',
     *   workspaceId: 'your-workspace-id'
     * });
     * ```
     */
    public static getInstance(config?: SdkConfig): TrinityProfilesSDK {
        if (!TrinityProfilesSDK.instance) {
            if (!config) {
                throw new Error('Configuration is required for first initialization. Please provide SdkConfig.');
            }
            TrinityProfilesSDK.instance = new TrinityProfilesSDK(config);
        }
        return TrinityProfilesSDK.instance;
    }

    /**
     * Reset the singleton instance (useful for testing or re-initialization)
     * 
     * @example
     * ```typescript
     * TrinityProfilesSDK.resetInstance();
     * ```
     */
    public static resetInstance(): void {
        if (TrinityProfilesSDK.instance) {
            TrinityProfilesSDK.instance.destroy();
            TrinityProfilesSDK.instance = null;
        }
    }

    /**
     * Update the access token (for token refresh scenarios)
     * 
     * @param newToken New access token
     * 
     * @example
     * ```typescript
     * // After token refresh
     * sdk.updateAccessToken(newAccessToken);
     * ```
     */
    updateAccessToken(newToken: string): void {
        if (!newToken) {
            throw new Error('Access token cannot be empty');
        }

        // Get current config to preserve settings
        const currentConfig = this.client.getConfig();
        const newConfig = {
            baseUrl: currentConfig.baseUrl,
            accessToken: newToken,
            workspaceId: currentConfig.workspaceId || '',
            timeout: currentConfig.timeout,
        };

        // Create new client with updated token
        this.client = new HttpClient(newConfig);

        // Reinitialize method groups with new client
        this.patients = new PatientMethods(this.client);
        this.search = new SearchMethods(this.client, newConfig);
        this.utils = new UtilsMethods(this.client);

        // Re-establish IndexedDB update callback for patients
        if (newConfig.workspaceId) {
            this.patients.setIndexedDBUpdateCallback(async (patient) => {
                const indexedDB = this.search.getDataLoader()?.getIndexedDB();
                if (indexedDB) {
                    await indexedDB.updatePatient(patient);
                }
            });
        }
    }

    /**
     * Test the SDK connection
     * 
     * @returns Promise that resolves if connection is successful
     * 
     * @example
     * ```typescript
     * try {
     *   await sdk.testConnection();
     *   console.log('SDK is connected successfully');
     * } catch (error) {
     *   console.error('Connection failed:', error.message);
     * }
     * ```
     */
    async testConnection(): Promise<void> {
        try {
            // Try a simple search request to test connectivity
            await this.search.bulkGet([]);
        } catch (error) {
            throw new Error(`SDK connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Initialize local search functionality
     * 
     * @example
     * ```typescript
     * await sdk.initializeLocalSearch();
     * ```
     */

    // TO LOAD DATA
    async initializeLocalSearch(): Promise<void> {

        await this.search.initializeLocalSearch();



        // Start sync if enabled and Worker is supported

        if (this.isLocalSearchEnabled()) {
            await this.startSyncWithoutWorker();
        }

        // TODO
        // if (this.shouldUseWorker()) {
        //     console.log("worker")
        //     await this.startSyncWithWorker();
        // } else if (this.isLocalSearchEnabled()) {
        //     console.log("without worker")
        //     await this.startSyncWithoutWorker();
        // }

    }


    // TO SEARCH
    async searchPatientByPrefix(prefix: string, limit: number = 50, select?: string): Promise<Patient[]> {
        return await this.search.searchByPrefix(prefix, limit, select);
    }

    // TO CREATE PATIENT
    async createPatient(patient: CreatePatientData): Promise<Patient | { oid: string }> {
        return await this.patients.create(patient);
    }

    // TO UPDATE PATIENT

    /**
     * Start background data synchronization
     * 
     * @param callbacks Optional callbacks for sync progress
     * 
     * @example
     * ```typescript
     * await sdk.startLocalSync({
     *   onProgress: (progress) => console.log(`Synced ${progress.progress} records`),
     *   onComplete: () => console.log('Sync complete'),
     *   onError: (error) => console.error('Sync error:', error)
     * });
     * ```
     */
    async startLocalSync(callbacks?: {
        onProgress?: (progress: { progress: number; total: number; isComplete: boolean }) => void;
        onComplete?: () => void;
        onError?: (error: string) => void;
    }): Promise<void> {
        if (this.shouldUseWorker()) {
            await this.startSyncWithWorker(callbacks);
        } else if (this.isLocalSearchEnabled()) {
            await this.startSyncWithoutWorker(callbacks);
        }
    }

    /**
     * Check if local search data is available
     * 
     * @returns Promise that resolves to true if local data exists
     * 
     * @example
     * ```typescript
     * const hasData = await sdk.hasLocalSearchData();
     * if (!hasData) {
     *   await sdk.startLocalSync();
     * }
     * ```
     */
    async hasLocalSearchData(): Promise<boolean> {
        return await this.search.hasLocalSearchData();
    }

    /**
     * Check if sync is complete
     * 
     * @returns True if sync is complete
     */
    isSyncComplete(): boolean {
        return this.search.isSyncCompleted();
    }

    /**
     * Clear all local search data
     * 
     * @example
     * ```typescript
     * await sdk.clearLocalSearchData();
     * ```
     */
    async clearLocalSearchData(): Promise<void> {
        await this.search.clearLocalSearchData();
    }

    /**
     * Cleanup all resources including local search
     * Call this when done with the SDK to prevent memory leaks
     * 
     * @example
     * ```typescript
     * sdk.destroy();
     * ```
     */
    destroy(): void {
        this.search.destroy();
        if (this.syncWorker) {
            this.syncWorker.terminate();
            this.syncWorker = null;
        }
    }

    /**
     * Check if local search is enabled
     */
    private isLocalSearchEnabled(): boolean {
        const config = this.client.getConfig();
        return Boolean(config.workspaceId);
    }

    /**
     * Check if we should use Web Worker
     */
    private shouldUseWorker(): boolean {
        return this.isLocalSearchEnabled() && typeof Worker !== 'undefined';
    }

    /**
     * Start sync with Web Worker
     */
    private async startSyncWithWorker(callbacks?: {
        onProgress?: (progress: { progress: number; total: number; isComplete: boolean }) => void;
        onComplete?: () => void;
        onError?: (error: string) => void;
    }): Promise<void> {
        if (this.syncWorker) {
            this.syncWorker.terminate();
        }

        try {
            // Create worker from the built file
            this.syncWorker = new Worker('./dist/workers/sync-worker.js');

            this.syncWorker.onmessage = (event) => {
                const { type, payload } = event.data;

                switch (type) {
                    case 'progress':
                        if (callbacks?.onProgress && payload?.progress) {
                            callbacks.onProgress(payload.progress);
                        }
                        break;
                    case 'complete':
                        this.search.setSyncComplete(true);
                        if (callbacks?.onComplete) {
                            callbacks.onComplete();
                        }
                        break;
                    case 'error':
                        if (callbacks?.onError && payload?.error) {
                            callbacks.onError(payload.error);
                        }
                        break;
                }
            };

            this.syncWorker.onerror = (error) => {
                if (callbacks?.onError) {
                    callbacks.onError(`Worker error: ${error.message}`);
                }
            };

            // Start sync
            this.syncWorker.postMessage({
                type: 'start',
                payload: { config: this.client.getConfig() }
            });

        } catch (error) {
            console.warn('Failed to start Web Worker, falling back to direct sync:', error);
            await this.startSyncWithoutWorker(callbacks);
        }
    }

    /**
     * Start sync without Web Worker (direct)
     */
    private async startSyncWithoutWorker(callbacks?: {
        onProgress?: (progress: { progress: number; total: number; isComplete: boolean }) => void;
        onComplete?: () => void;
        onError?: (error: string) => void;
    }): Promise<void> {
        const dataLoader = this.search.getDataLoader();
        if (!dataLoader) {
            throw new Error('Local search not enabled');
        }

        try {
            await dataLoader.loadAllData({
                onProgress: callbacks?.onProgress,
                onComplete: () => {
                    this.search.setSyncComplete(true);
                    if (callbacks?.onComplete) {
                        callbacks.onComplete();
                    }
                },
                onError: callbacks?.onError
            });
        } catch (error) {
            if (callbacks?.onError) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                callbacks.onError(errorMessage);
            }
            throw error;
        }
    }

    // Add worker property
    private syncWorker: Worker | null = null;
}

// Export all types and errors for external use
export * from './errors';
export * from './types';

// Default export
export const getTrinitySDKInstance = (config: SdkConfig) => TrinityProfilesSDK.getInstance(config);
