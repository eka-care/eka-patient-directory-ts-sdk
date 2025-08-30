/**
 * Patient CRUD operations
 */

import { HttpClient } from '../client';
import {
    ApiResponse,
    CreatePatientData,
    LocalMinifiedPatient,
    Patient,
    UpdatePatientData
} from '../types';

/**
 * Patient CRUD methods
 */
export class PatientMethods {
    private client: HttpClient;
    private readonly basePath = '/profiles/v1/patient';
    private indexedDBUpdateCallback: ((patient: LocalMinifiedPatient) => Promise<void>) | null = null;
    private indexedDBPartialUpdateCallback: ((oid: string, updates: Partial<LocalMinifiedPatient>) => Promise<void>) | null = null;

    constructor(client: HttpClient) {
        this.client = client;
    }

    /**
     * Set callback for updating IndexedDB after patient operations
     */
    setIndexedDBUpdateCallback(callback: (patient: LocalMinifiedPatient) => Promise<void>): void {
        this.indexedDBUpdateCallback = callback;
    }

    /**
     * Set callback for partial updating IndexedDB after patient operations
     */
    setIndexedDBPartialUpdateCallback(callback: (oid: string, updates: Partial<LocalMinifiedPatient>) => Promise<void>): void {
        this.indexedDBPartialUpdateCallback = callback;
    }

    /**
     * Create a new patient profile
     * 
     * @param data Patient creation data
     * @returns Created patient or just the OID if is_developer flag is set
     * 
     * @example
     * ```typescript
     * const patient = await sdk.patients.create({
     *   oid: 'unique-id',
     *   wid: 'workspace-id',
     *   gen: 'M',
     *   dob: '1990-01-01',
     *   fn: 'John',
     *   ln: 'Doe',
     *   mobile: '1234567890',
     *   email: 'john@example.com'
     * });
     * ```
     */
    async create(data: CreatePatientData): Promise<{ oid: string }> {
        const response = await this.client.post<{ oid: string }>(this.basePath, data);

        // Update IndexedDB if callback is available and we have patient data
        if (this.indexedDBUpdateCallback && typeof response.data === 'object' && 'oid' in response.data) {
            try {
                // Build full name from available fields
                const fullName = data.fln ||
                    [data.fn, data.mn, data.ln].filter(Boolean).join(' ') ||
                    'Unknown';

                const localPatient: LocalMinifiedPatient = {
                    oid: response.data.oid,
                    fln: fullName,
                    mobile: 'mobile' in data ? data.mobile : undefined,
                    username: 'username' in data ? data.username : undefined
                };

                // Add default fields to the local patient
                const selectedExtraMinifiedFields = this.client.getConfig().extraMinifiedPatientFields;
                if (selectedExtraMinifiedFields?.includes("u_ate")) {
                    localPatient.u_ate = Date.now();
                }
                if (selectedExtraMinifiedFields?.includes("dob")) {
                    localPatient.dob = data.dob;
                    if ("is_age" in data) {
                        localPatient.is_age = data.is_age;
                    }
                }
                if (selectedExtraMinifiedFields?.includes('gen')) {
                    localPatient.gen = data.gen;
                }
                if (selectedExtraMinifiedFields?.includes('abha')) {
                    if ('abha' in data) {
                        localPatient.abha = data.abha;
                    }
                }

                await this.indexedDBUpdateCallback(localPatient);
            } catch (error) {
                console.warn('Failed to update IndexedDB after patient creation:', error);
            }
        }

        return response.data;
    }

    /**
     * Get a patient by ID
     * 
     * @param id Patient OID
     * @returns Patient profile
     * 
     * @example
     * ```typescript
     * const patient = await sdk.patients.get('patient-oid');
     * ```
     */
    async get(id: string): Promise<Patient> {
        const response = await this.client.get<Patient>(`${this.basePath}/${id}`);
        return response.data;
    }

    /**
     * Update a patient profile
     * 
     * @param id Patient OID
     * @param data Update data
     * @returns API response with success message
     * 
     * @example
     * ```typescript
     * const updated = await sdk.patients.update('patient-oid', {
     *   fn: 'Jane',
     *   email: 'jane@example.com'
     * });
     * ```
     */
    async update(id: string, data: UpdatePatientData): Promise<ApiResponse> {
        const response = await this.client.patch<ApiResponse>(`${this.basePath}/${id}`, data);

        // Update IndexedDB if callback is available - use partial update
        if (this.indexedDBPartialUpdateCallback) {
            try {
                // Map UpdatePatientData fields to LocalMinifiedPatient fields
                const updates: Partial<LocalMinifiedPatient> = {};

                // Map overlapping fields
                if (data.mobile !== undefined) updates.mobile = data.mobile;
                if (data.username !== undefined) updates.username = data.username;

                // Handle full name construction from name parts
                if (data.fln !== undefined) {
                    updates.fln = data.fln;
                } else if (data.fn !== undefined || data.mn !== undefined || data.ln !== undefined) {
                    // Construct full name from parts if individual name fields are updated
                    const parts = [data.fn, data.mn, data.ln].filter(Boolean);
                    if (parts.length > 0) {
                        updates.fln = parts.join(' ');
                    }
                }

                const selectedExtraMinifiedFields = this.client.getConfig().extraMinifiedPatientFields;
                if (selectedExtraMinifiedFields?.includes("u_ate")) {
                    updates.u_ate = Date.now();
                }

                if (selectedExtraMinifiedFields?.includes("dob")) {
                    if (data.dob !== undefined) updates.dob = data.dob;
                    if (data.is_age !== undefined) updates.is_age = data.is_age;
                }

                if (selectedExtraMinifiedFields?.includes("gen")) {
                    if (data.gen !== undefined) updates.gen = data.gen;
                }

                if (selectedExtraMinifiedFields?.includes("abha")) {
                    if (data.abha !== undefined) updates.abha = data.abha;
                }

                // Only call the partial update if there are fields to update
                if (Object.keys(updates).length > 1) { // More than just u_ate
                    await this.indexedDBPartialUpdateCallback(id, updates);
                }
            } catch (error) {
                console.warn('Failed to update IndexedDB after patient update:', error);
            }
        }

        return response.data;
    }

    /**
     * Delete a patient profile
     * 
     * @param id Patient OID
     * @returns Success response
     * 
     * @example
     * ```typescript
     * await sdk.patients.delete('patient-oid');
     * ```
     */
    async delete(id: string): Promise<ApiResponse> {
        const response = await this.client.delete<ApiResponse>(`${this.basePath}/${id}`);
        return response.data;
    }

    /**
     * Get patients by username
     * 
     * @param username Username to search for
     * @returns Array of patients (typically one)
     * 
     * @example
     * ```typescript
     * const patients = await sdk.patients.getByUsername('john.doe');
     * ```
     */
    async getByUsername(username: string): Promise<Patient[]> {
        const response = await this.client.get<Patient[]>(`${this.basePath}/${username}/username`);
        return response.data;
    }
}