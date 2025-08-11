/**
 * Data loading service for synchronizing minified patient data
 */

import { HttpClient } from '../client';
import { MinifiedMethods } from '../methods/minified';
import { LocalMinifiedPatient, SdkConfig } from '../types';
import { IndexedDBService } from './indexeddb';

export interface LoadProgress {
    progress: number;
    total: number;
    isComplete: boolean;
}

export interface LoadCallbacks {
    onProgress?: (progress: LoadProgress) => void;
    onComplete?: () => void;
    onError?: (error: string) => void;
}

/**
 * Service for loading minified patient data into IndexedDB
 */
export class DataLoaderService {
    private minifiedMethods: MinifiedMethods;
    private indexedDB: IndexedDBService;
    private isLoading = false;
    private abortController: AbortController | null = null;

    constructor(config: SdkConfig) {
        const client = new HttpClient(config);
        this.minifiedMethods = new MinifiedMethods(client);
        this.indexedDB = new IndexedDBService(config.workspaceId);
    }

    /**
     * Initialize the data loader service
     */
    async init(): Promise<void> {
        await this.indexedDB.init();
    }

    /**
     * Check if data loading is in progress
     */
    isLoadingData(): boolean {
        return this.isLoading;
    }

    /**
     * Check if local data exists
     */
    async hasLocalData(): Promise<boolean> {
        return await this.indexedDB.hasData();
    }

    /**
     * Load all minified patient data into IndexedDB
     */
    async loadAllData(callbacks?: LoadCallbacks): Promise<void> {
        if (this.isLoading) {
            throw new Error('Data loading is already in progress');
        }

        this.isLoading = true;
        this.abortController = new AbortController();

        try {
            await this.syncAllPages(callbacks);

            if (callbacks?.onComplete) {
                callbacks.onComplete();
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (callbacks?.onError) {
                callbacks.onError(errorMessage);
            }
            throw error;
        } finally {
            this.isLoading = false;
            this.abortController = null;
        }
    }

    /**
     * Stop data loading
     */
    stopLoading(): void {
        if (this.abortController) {
            this.abortController.abort();
        }
        this.isLoading = false;
    }

    /**
     * Clear all local data
     */
    async clearLocalData(): Promise<void> {
        await this.indexedDB.clearData();
    }

    /**
     * Get IndexedDB service for direct access
     */
    getIndexedDB(): IndexedDBService {
        return this.indexedDB;
    }

    /**
     * Close database connection
     */
    close(): void {
        this.indexedDB.close();
    }

    /**
     * Sync all pages of minified data
     */
    private async syncAllPages(callbacks?: LoadCallbacks): Promise<void> {
        let page = 1;
        let totalLoaded = 0;
        const limit = 1000;

        while (true) {
            if (this.abortController?.signal.aborted) {
                throw new Error('Data loading was aborted');
            }

            // Fetch page data
            const patients = await this.minifiedMethods.getPage(page, limit);

            if (patients.length === 0) {
                break; // No more data
            }

            // Convert to local format
            const localPatients: LocalMinifiedPatient[] = patients.map(p => ({
                oid: p.oid,
                u_ate: Date.now(),
                fln: p.fln,
                mobile: p.mobile,
                username: p.username
            }));

            // Store in IndexedDB
            await this.indexedDB.batchStore(localPatients);

            totalLoaded += patients.length;

            // Report progress
            if (callbacks?.onProgress) {
                callbacks.onProgress({
                    progress: totalLoaded,
                    total: totalLoaded, // We don't know total until complete
                    isComplete: false
                });
            }

            // Move to next page
            page++;

            // If we got less than limit, we're done
            if (patients.length < limit) {
                break;
            }
        }

        // Final progress update
        if (callbacks?.onProgress) {
            callbacks.onProgress({
                progress: totalLoaded,
                total: totalLoaded,
                isComplete: true
            });
        }
    }
}