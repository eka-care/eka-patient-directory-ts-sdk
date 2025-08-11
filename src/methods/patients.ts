/**
 * Patient CRUD operations
 */

import { HttpClient } from '../client';
import { 
  CreatePatientData, 
  UpdatePatientData, 
  Patient, 
  ApiResponse 
} from '../types';

/**
 * Patient CRUD methods
 */
export class PatientMethods {
  private client: HttpClient;
  private readonly basePath = '/profiles/v1/patient';

  constructor(client: HttpClient) {
    this.client = client;
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