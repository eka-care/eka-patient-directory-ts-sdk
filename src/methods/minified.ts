/**
 * Minified patient data operations
 */

import { HttpClient } from '../client';
import { MinifiedPatient } from '../types';

/**
 * Minified patient methods for data loading
 */
export class MinifiedMethods {
    private client: HttpClient;
    private readonly basePath = '/profiles/v1/patient';

    constructor(client: HttpClient) {
        this.client = client;
    }

    /**
     * Get minified patient profiles with pagination
     * 
     * @param params Optional query parameters for filtering and pagination
     * @returns Array of minified patient profiles
     * 
     * @example
     * ```typescript
     * const profiles = await minifiedMethods.getMinified();
     * // or with parameters
     * const profiles = await minifiedMethods.getMinified({ page: 1, limit: 50 });
     * ```
     */
    async getMinified(params?: Record<string, string | number | boolean>): Promise<MinifiedPatient[]> {
        const response = await this.client.get<MinifiedPatient[]>(`${this.basePath}/minified`, params);
        return response.data;
    }

    /**
     * Get minified profiles for a specific page
     * 
     * @param page Page number (1-based)
     * @param limit Number of records per page
     * @returns Array of minified patient profiles
     */
    async getPage(page: number, limit: number = 100): Promise<MinifiedPatient[]> {
        return this.getMinified({ page, limit });
    }
}