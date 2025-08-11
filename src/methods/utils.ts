/**
 * Utility methods for patient profile management
 */

import { HttpClient } from '../client';
import { ApiResponse, RemoveFieldsData, Patient } from '../types';

/**
 * Utility methods for patient management
 */
export class UtilsMethods {
  private client: HttpClient;
  private readonly basePath = '/profiles/v1/patient';

  constructor(client: HttpClient) {
    this.client = client;
  }

  /**
   * Remove specific fields from a patient profile
   * 
   * @param id Patient OID
   * @param fields Array of field names to remove
   * @returns Success response
   * 
   * @example
   * ```typescript
   * await sdk.utils.removeFields('patient-oid', ['email', 'mobile']);
   * // or
   * await sdk.utils.removeFields('patient-oid', { fields: ['email', 'mobile'] });
   * ```
   */
  async removeFields(id: string, fields: string[] | RemoveFieldsData): Promise<ApiResponse> {
    let payload: RemoveFieldsData;
    
    if (Array.isArray(fields)) {
      payload = { fields };
    } else {
      payload = fields;
    }

    const response = await this.client.patch<ApiResponse>(`${this.basePath}/${id}/remove-fields`, payload);
    return response.data;
  }

  /**
   * Unarchive a patient profile
   * 
   * @param id Patient OID
   * @returns Updated patient profile or success response
   * 
   * @example
   * ```typescript
   * const result = await sdk.utils.unarchive('patient-oid');
   * ```
   */
  async unarchive(id: string): Promise<Patient | ApiResponse> {
    const response = await this.client.patch<Patient | ApiResponse>(`${this.basePath}/${id}/unarchive`, {});
    return response.data;
  }

  /**
   * Archive a patient profile (soft delete)
   * Note: This is typically done via the update method by setting arc: true
   * 
   * @param id Patient OID
   * @returns Updated patient profile
   * 
   * @example
   * ```typescript
   * const archivedPatient = await sdk.utils.archive('patient-oid');
   * ```
   */
  async archive(id: string): Promise<Patient> {
    const response = await this.client.patch<Patient>(`${this.basePath}/${id}`, {
      arc: true,
      u_ate: Math.floor(Date.now() / 1000)
    });
    return response.data;
  }

  /**
   * Validate patient data before creation/update
   * This method performs client-side validation to catch common errors early
   * 
   * @param data Patient data to validate
   * @param isUpdate Whether this is for an update operation (less strict validation)
   * @returns Validation result
   * 
   * @example
   * ```typescript
   * const validation = sdk.utils.validatePatientData({
   *   gen: 'M',
   *   dob: '1990-01-01',
   *   fn: 'John'
   * });
   * 
   * if (!validation.isValid) {
   *   console.log('Validation errors:', validation.errors);
   * }
   * ```
   */
  validatePatientData(data: any, isUpdate: boolean = false): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields for creation
    if (!isUpdate) {
      if (!data.oid) errors.push('oid is required');
      if (!data.wid) errors.push('wid is required');
      if (!data.gen) errors.push('gen is required');
      if (!data.dob) errors.push('dob is required');
      
      // At least one name field required
      if (!data.fn && !data.mn && !data.ln && !data.fln) {
        errors.push('At least one name field (fn, mn, ln, or fln) is required');
      }
    }

    // Validate gender
    if (data.gen && !['M', 'F', 'O'].includes(data.gen)) {
      errors.push('gen must be M, F, or O');
    }

    // Validate blood group
    if (data.bg && !['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(data.bg)) {
      errors.push('bg must be a valid blood group (A+, A-, B+, B-, AB+, AB-, O+, O-)');
    }

    // Validate date format
    if (data.dob) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(data.dob)) {
        errors.push('dob must be in YYYY-MM-DD format');
      } else {
        const date = new Date(data.dob);
        if (isNaN(date.getTime())) {
          errors.push('dob must be a valid date');
        }
      }
    }

    // Validate email format
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push('email must be a valid email address');
      }
    }

    // Validate mobile number (should be digits only for v2)
    if (data.mobile) {
      const mobileRegex = /^\d{6,15}$/;
      if (!mobileRegex.test(data.mobile)) {
        errors.push('mobile must be 6-15 digits without country code');
      }
    }

    // Validate country code
    if (data.ccd) {
      const ccdRegex = /^\+\d{1,4}$/;
      if (!ccdRegex.test(data.ccd)) {
        errors.push('ccd must be a valid country code starting with +');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format patient data for display
   * 
   * @param patient Patient data
   * @returns Formatted display data
   * 
   * @example
   * ```typescript
   * const formatted = sdk.utils.formatPatientDisplay(patient);
   * console.log(`Name: ${formatted.fullName}`);
   * console.log(`Contact: ${formatted.contact}`);
   * ```
   */
  formatPatientDisplay(patient: Patient): {
    fullName: string;
    contact: string;
    age?: number;
    displayId: string;
  } {
    // Build full name
    const nameParts = [patient.s, patient.fn, patient.mn, patient.ln].filter(Boolean);
    const fullName = patient.fln || nameParts.join(' ') || 'N/A';

    // Build contact info
    const contactParts = [];
    if (patient.mobile) {
      const mobile = patient.ccd ? `${patient.ccd}${patient.mobile}` : patient.mobile;
      contactParts.push(mobile);
    }
    if (patient.email) {
      contactParts.push(patient.email);
    }
    const contact = contactParts.join(' | ') || 'N/A';

    // Calculate age
    let age: number | undefined;
    if (patient.dob) {
      const birthDate = new Date(patient.dob);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }

    // Display ID (username or oid)
    const displayId = patient.username || patient.oid;

    return {
      fullName,
      contact,
      age,
      displayId
    };
  }
}