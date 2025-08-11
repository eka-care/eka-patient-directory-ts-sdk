/**
 * TypeScript types for Trinity Patient Profile Management SDK
 * Based on V2 business patient serializers
 */

/**
 * Gender enumeration
 */
export type Gender = "M" | "F" | "O";

/**
 * Persona enumeration (always "P" for patients)
 */
export type Persona = "P";

/**
 * Blood group enumeration
 */
export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

/**
 * Patient profile creation data (matches CreateBusinessPatientSz V2)
 */
export interface CreatePatientData {
    /** Gender: M, F, or O */
    gen: Gender;
    /** Date of birth (ISO date string: YYYY-MM-DD) */
    dob: string;
    /** First name */
    fn?: string;
    /** Middle name */
    mn?: string;
    /** Last name */
    ln?: string;
    /** Full name */
    fln?: string;

    /** Country code */
    ccd?: string;
    /** Mobile number without country code */
    mobile?: string;
    /** Valid email address */
    email?: string;
    /** Username */
    username?: string;

    /** Salutation */
    s?: string;
    /** Blood group */
    bg?: BloodGroup;
    /** ABHA address */
    abha?: string;
    /** Flag to indicate if dob was calculated from age */
    is_age?: boolean;
}

/**
 * Patient profile update data (matches UpdateBusinessPatientSz V2)
 */
export interface UpdatePatientData {
    /** Country code */
    ccd?: string;
    /** Mobile number without country code */
    mobile?: string;
    /** Valid email address */
    email?: string;
    /** Username */
    username?: string;

    /** Gender: M, F, or O */
    gen?: Gender;
    /** Date of birth (ISO date string: YYYY-MM-DD) */
    dob?: string;
    /** Flag to indicate if dob was calculated from age */
    is_age?: boolean;
    /** First name */
    fn?: string;
    /** Middle name */
    mn?: string;
    /** Last name */
    ln?: string;
    /** Full name */
    fln?: string;

    /** Salutation */
    s?: string;
    /** Blood group */
    bg?: BloodGroup;
    /** ABHA address */
    abha?: string;
}

/**
 * Complete patient profile (response format)
 */
export interface Patient {
    /** Unique identifier */
    oid: string;
    /** Workspace ID */
    wid: string;
    /** Persona */
    ps: Persona;
    /** Creation timestamp (epoch) */
    c_ate: number;
    /** Update timestamp (epoch) */
    u_ate: number;
    /** Audience of the creator */
    c_aud?: string;

    /** Gender */
    gen: Gender;
    /** Date of birth */
    dob: string;
    /** First name */
    fn?: string;
    /** Middle name */
    mn?: string;
    /** Last name */
    ln?: string;
    /** Full name */
    fln?: string;

    /** Country code */
    ccd?: string;
    /** Mobile number */
    mobile?: string;
    /** Email address */
    email?: string;
    /** Username */
    username?: string;

    /** Salutation */
    s?: string;
    /** Blood group */
    bg?: BloodGroup;
    /** ABHA address */
    abha?: string;
    /** Flag indicating if DOB was calculated from age */
    is_age?: boolean;
    /** Is profile archived */
    arc?: boolean;

    /** Additional arbitrary data */
    extras?: Record<string, any>;
    /** Old OID */
    old_oid?: string;
}

/**
 * Minified patient profile (for list operations)
 */
export interface MinifiedPatient {
    /** Unique identifier */
    oid: string;
    /** Full name */
    fln?: string;
    /** Mobile number */
    mobile?: string;
    /** Email address */
    email?: string;
    /** Username */
    username?: string;
    /** Gender */
    gen: Gender;
    /** Date of birth */
    dob: string;
    /** Is profile archived */
    arc?: boolean;
}

/**
 * Search parameters for patient search
 */
export interface SearchParams {
    /** Search by prefix */
    prefix?: string;
    /** Select specific fields */
    select?: string;
    /** Limit results */
    limit?: number;
}

/**
 * Bulk get parameters
 */
export interface BulkGetParams {
    /** Comma-separated list of OIDs */
    oid_list: string;
}

/**
 * Mobile lookup parameters
 */
export interface MobileLookupParams {
    /** Mobile number to search */
    mob: string;
}

/**
 * Remove fields parameters
 */
export interface RemoveFieldsData {
    /** Array of field names to remove */
    fields: string[];
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
    /** Response data */
    data?: T;
    /** Error message if request failed */
    error?: string;
    /** Error details */
    message?: string;
}

/**
 * Paginated response format
 */
export interface PaginatedResponse<T> {
    /** Array of results */
    results: T[];
    /** Total count */
    count?: number;
    /** Next page URL */
    next?: string;
    /** Previous page URL */
    previous?: string;
}

/**
 * Local search minified patient data
 */
export interface LocalMinifiedPatient {
    /** Unique identifier */
    oid: string;
    /** Update timestamp (epoch) */
    u_ate: number;
    /** Full name */
    fln?: string;
    /** Mobile number */
    mobile?: string;
    /** Username */
    username?: string;
}

/**
 * SDK Configuration options
 */
export interface SdkConfig {
    /** Base URL for the API */
    baseUrl: string;
    /** Access token for authentication */
    accessToken: string;
    /** Workspace ID for local data storage */
    workspaceId: string;
    /** Request timeout in milliseconds */
    timeout?: number;
    /** Enable local search functionality */
    enableLocalSearch?: boolean;
}