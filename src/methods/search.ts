/**
 * Patient search and lookup operations
 */

import { HttpClient } from '../client';
import { DataLoaderService } from '../services/data-loader';
import { IndexedDBService } from '../services/indexeddb';
import {
    LocalMinifiedPatient,
    Patient,
    SdkConfig,
    SearchParams
} from '../types';

/**
 * Search and lookup methods
 */
export class SearchMethods {
    private client: HttpClient;
    private readonly basePath = '/profiles/v1/patient';
    private indexedDB: IndexedDBService | null = null;
    private dataLoader: DataLoaderService | null = null;
    private config: SdkConfig | null = null;
    private isSyncComplete = false;

    constructor(client: HttpClient, config?: SdkConfig) {
        this.client = client;
        this.config = config || null;

        // Initialize local search components if enabled
        if (config && config.workspaceId) {
            this.indexedDB = new IndexedDBService(config.workspaceId);
            this.dataLoader = new DataLoaderService(config);
        }
    }

    /**
     * Bulk get patients by OID list
     * 
     * @param oidList Comma-separated list of patient OIDs
     * @returns Array of patients
     * 
     * @example
     * ```typescript
     * const patients = await sdk.search.bulkGet('oid1,oid2,oid3');
     * // or
     * const patients = await sdk.search.bulkGet(['oid1', 'oid2', 'oid3']);
     * ```
     */
    async bulkGet(oidList: string | string[]): Promise<Patient[]> {
        const oidListParam = Array.isArray(oidList) ? oidList.join(',') : oidList;

        const response = await this.client.get<Patient[]>(`${this.basePath}/bulk`, {
            oid_list: oidListParam
        });

        return response.data;
    }

    /**
     * Get patients by mobile number
     * 
     * @param mobile Mobile number to search for
     * @returns Array of patients with matching mobile number
     * 
     * @example
     * ```typescript
     * const patients = await sdk.search.getByMobile('1234567890');
     * ```
     */
    async getByMobile(mobile: string): Promise<Patient[]> {
        const response = await this.client.get<Patient[]>(`${this.basePath}/by-mobile`, {
            mob: mobile
        });

        return response.data;
    }


    /**
     * Search patients using various criteria
     * 
     * @param params Search parameters
     * @returns Array of matching patients
     * 
     * @example
     * ```typescript
     * // Search by prefix (local search if available)
     * const patients = await sdk.search.search({ prefix: 'jo', limit: 15 });
     * ```
     */
    async search(params: SearchParams, forceApiSearch = false): Promise<Patient[]> {
        // Validate parameters
        if (!params.prefix) {
            throw new Error('prefix is required for search');
        }

        // Check if we should use local search
        if (!forceApiSearch && this.indexedDB) {
            if (!this.isSyncComplete) {
                throw new Error('Data is still syncing. Please wait for sync to complete or use forceApiSearch=true');
            }

            try {
                const localResults = await this.indexedDB.searchByPrefix(params.prefix, params.limit || 50);
                return this.convertLocalToPatients(localResults);
            } catch (error) {
                console.warn('Local search failed, falling back to API:', error);
            }
        }

        // API search
        const queryParams: Record<string, string | number> = {
            prefix: params.prefix,
            limit: params.limit || 50
        };

        if (params.select) {
            queryParams.select = params.select;
        }

        const response = await this.client.get<Patient[]>(`${this.basePath}/search`, queryParams);
        return response.data;
    }

    /**
     * Search by general prefix
     * 
     * @param prefix Search prefix
     * @param limit Maximum number of results (default: 50, max: 50)
     * @param select Optional comma-separated list of fields to return
     * @returns Array of matching patients
     */

    // SEARCH PATIENT BY PREFIX
    async searchByPrefix(prefix: string, limit: number = 50, select?: string): Promise<Patient[]> {
        return this.search({ prefix, limit, select });
    }

    /**
     * Initialize local search functionality
     */
    async initializeLocalSearch(): Promise<void> {
        if (this.indexedDB) {
            await this.indexedDB.init();
        }
        if (this.dataLoader) {
            await this.dataLoader.init();
        }
    }

    /**
     * Set sync completion status
     */
    setSyncComplete(complete: boolean): void {
        this.isSyncComplete = complete;
    }

    /**
     * Check if sync is complete
     */
    isSyncCompleted(): boolean {
        return this.isSyncComplete;
    }

    /**
     * Check if local search data is available
     */
    async hasLocalSearchData(): Promise<boolean> {
        if (!this.indexedDB) {
            return false;
        }

        return await this.indexedDB.hasData();
    }

    /**
     * Clear all local search data
     */
    async clearLocalSearchData(): Promise<void> {
        if (this.dataLoader) {
            await this.dataLoader.clearLocalData();
        }
        this.isSyncComplete = false;
    }

    /**
     * Get data loader service for direct access
     */
    getDataLoader(): DataLoaderService | null {
        return this.dataLoader;
    }

    /**
     * Convert local minified patients to full Patient objects
     */
    private convertLocalToPatients(localPatients: LocalMinifiedPatient[]): Patient[] {
        return localPatients.map(local => ({
            oid: local.oid,
            wid: this.config?.workspaceId || '',
            ps: 'P' as const,
            u_ate: local.u_ate,
            fln: local.fln,
            mobile: local.mobile,
            username: local.username
        } as Patient));
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        if (this.indexedDB) {
            this.indexedDB.close();
        }
        if (this.dataLoader) {
            this.dataLoader.close();
        }
        this.isSyncComplete = false;
    }
}