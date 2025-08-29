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
    async create(data: CreatePatientData): Promise<Patient | { oid: string }> {
        const response = await this.client.post<Patient | { oid: string }>(this.basePath, data);

        // Update IndexedDB if callback is available and we have patient data
        if (this.indexedDBUpdateCallback && typeof response.data === 'object' && 'oid' in response.data) {
            try {
                const localPatient: LocalMinifiedPatient = {
                    oid: response.data.oid,
                    u_ate: 'u_ate' in response.data ? response.data.u_ate : Date.now(),
                    fln: 'fln' in response.data ? response.data.fln : data.fln,
                    mobile: 'mobile' in response.data ? response.data.mobile : data.mobile,
                    username: 'username' in response.data ? response.data.username : data.username
                };

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
     * @returns Updated patient profile
     * 
     * @example
     * ```typescript
     * const updated = await sdk.patients.update('patient-oid', {
     *   fn: 'Jane',
     *   email: 'jane@example.com'
     * });
     * ```
     */
    async update(id: string, data: UpdatePatientData): Promise<Patient> {
        const response = await this.client.patch<Patient>(`${this.basePath}/${id}`, data);

        // Update IndexedDB if callback is available
        if (this.indexedDBUpdateCallback && response.data) {
            try {
                const localPatient: LocalMinifiedPatient = {
                    oid: response.data.oid,
                    u_ate: 'u_ate' in response.data ? response.data.u_ate : Date.now(),
                    fln: 'fln' in response.data ? response.data.fln : '',
                    mobile: response.data.mobile,
                    username: response.data.username
                };

                await this.indexedDBUpdateCallback(localPatient);
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