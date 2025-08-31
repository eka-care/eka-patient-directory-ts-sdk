/**
 * IndexedDB service for local patient data storage
 */

import { LocalMinifiedPatient } from '../types';

export class IndexedDBService {
  private dbName = 'TrinityProfilesDB';
  private version = 1;
  private db: IDBDatabase | null = null;
  private workspaceId: string;

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId;
  }

  /**
   * Initialize the IndexedDB connection
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      console.log('request in indexeddb -> ', request);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store for patients with workspace-specific naming
        const storeName = this.getStoreName();
        console.log('storeName in indexeddb 36 -> ', storeName);
        if (!db.objectStoreNames.contains(storeName)) {
          console.log('storeName in indexeddb 37 -> ', storeName);
          const store = db.createObjectStore(storeName, { keyPath: 'oid' });
          console.log('store in indexeddb 38 -> ', store);

          // Create indexes for search fields
          store.createIndex('fln', 'fln', { unique: false });
          store.createIndex('mobile', 'mobile', { unique: false });
          store.createIndex('username', 'username', { unique: false });
          store.createIndex('u_ate', 'u_ate', { unique: false });
        }
      };
    });
  }

  /**
   * Get workspace-specific store name
   */
  private getStoreName(): string {
    return `patients_${this.workspaceId}`;
  }

  /**
   * Store multiple patients in batch
   */
  async batchStore(patients: LocalMinifiedPatient[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const storeName = this.getStoreName();
    if (!this.db.objectStoreNames.contains(storeName)) {
      // Close current connection and reinitialize
      this.close();
      await this.init();

      // Check again after reinitialization
      if (!this.db?.objectStoreNames.contains(storeName)) {
        throw new Error(`Object store '${storeName}' still not found after reinitialization`);
      }
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.getStoreName()], 'readwrite');
        const store = transaction.objectStore(this.getStoreName());

        transaction.oncomplete = () => {
          console.log('Batch store transaction completed successfully');
          resolve();
        };
        transaction.onerror = () => {
          console.error('Batch store transaction error:', transaction.error);
          reject(transaction.error);
        };

        patients.forEach((patient) => {
          store.put(patient);
        });
      } catch (error) {
        console.error('Error creating transaction:', error);
        reject(error);
      }
    });
  }

  /**
   * Search patients by prefix with field-specific logic
   */
  async searchByPrefix(prefix: string, limit: number = 50): Promise<LocalMinifiedPatient[]> {
    if (!this.db) throw new Error('Database not initialized');

    const results: LocalMinifiedPatient[] = [];
    const isNumeric = /^\d+$/.test(prefix);
    const lowerPrefix = prefix.toLowerCase();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.getStoreName()], 'readonly');
      const store = transaction.objectStore(this.getStoreName());
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && results.length < limit) {
          const patient = cursor.value as LocalMinifiedPatient;
          let match = false;

          if (isNumeric) {
            // Search in mobile and username fields for numeric prefix
            if (
              patient.mobile?.startsWith(prefix) ||
              patient.username?.toLowerCase().startsWith(lowerPrefix)
            ) {
              match = true;
            }
          } else {
            // Search in fln and username fields for alphabetic prefix
            if (
              patient.fln?.toLowerCase().startsWith(lowerPrefix) ||
              patient.username?.toLowerCase().startsWith(lowerPrefix)
            ) {
              match = true;
            }
          }

          if (match) {
            results.push(patient);
          }

          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get patient by OID (primary key)
   */
  async getByOid(oid: string): Promise<LocalMinifiedPatient | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.getStoreName()], 'readonly');
      const store = transaction.objectStore(this.getStoreName());
      const request = store.get(oid);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update single patient by OID
   */
  async updatePatient(patient: LocalMinifiedPatient): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.getStoreName()], 'readwrite');
      const store = transaction.objectStore(this.getStoreName());
      const request = store.put(patient);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Partially update patient by OID - only updates specified fields
   */
  async partialUpdatePatient(oid: string, updates: Partial<LocalMinifiedPatient>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.getStoreName()], 'readwrite');
      const store = transaction.objectStore(this.getStoreName());

      // First get the existing patient record
      const getRequest = store.get(oid);

      getRequest.onsuccess = () => {
        const existingPatient = getRequest.result;
        if (!existingPatient) {
          reject(new Error(`Patient with OID ${oid} not found`));
          return;
        }

        // Merge existing data with updates
        const updatedPatient: LocalMinifiedPatient = {
          ...existingPatient,
          ...updates,
          oid, // Ensure OID is preserved
        };

        // Update the record
        const putRequest = store.put(updatedPatient);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Check if any data exists
   */
  async hasData(): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.getStoreName()], 'readonly');
      const store = transaction.objectStore(this.getStoreName());
      const request = store.count();

      request.onsuccess = () => resolve(request.result > 0);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all patients (for internal use)
   */
  async getAllPatients(): Promise<LocalMinifiedPatient[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.getStoreName()], 'readonly');
      const store = transaction.objectStore(this.getStoreName());
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get the latest update timestamp
   */
  async getLatestUpdateTime(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.getStoreName()], 'readonly');
      const store = transaction.objectStore(this.getStoreName());
      const index = store.index('u_ate');
      const request = index.openCursor(null, 'prev');

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          resolve(cursor.value.u_ate);
        } else {
          resolve(0);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all data for the current workspace
   */
  async clearData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.getStoreName()], 'readwrite');
      const store = transaction.objectStore(this.getStoreName());
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
