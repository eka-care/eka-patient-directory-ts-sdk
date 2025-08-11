/**
 * Web Worker for background data synchronization
 */

import { DataLoaderService, LoadProgress } from '../services/data-loader';
import { SdkConfig } from '../types';

interface SyncWorkerMessage {
    type: 'start' | 'stop' | 'status';
    payload?: {
        config: SdkConfig;
    };
}

interface SyncWorkerResponse {
    type: 'progress' | 'complete' | 'error' | 'status';
    payload?: {
        progress?: LoadProgress;
        error?: string;
        isRunning?: boolean;
        lastSync?: number;
    };
}

class SyncWorker {
    private dataLoader: DataLoaderService | null = null;
    private isRunning = false;
    private lastSyncTime = 0;

    constructor() {
        self.addEventListener('message', this.handleMessage.bind(this));
    }

    private handleMessage(event: MessageEvent<SyncWorkerMessage>) {
        const { type, payload } = event.data;

        switch (type) {
            case 'start':
                if (payload) {
                    this.startSync(payload.config);
                }
                break;
            case 'stop':
                this.stopSync();
                break;
            case 'status':
                this.sendStatus();
                break;
        }
    }

    private async startSync(config: SdkConfig) {
        if (this.isRunning) {
            this.postMessage({ type: 'error', payload: { error: 'Sync already running' } });
            return;
        }

        this.isRunning = true;

        try {
            // Initialize data loader
            this.dataLoader = new DataLoaderService(config);
            await this.dataLoader.init();

            // Start loading data
            await this.dataLoader.loadAllData({
                onProgress: (progress: LoadProgress) => {
                    this.postMessage({
                        type: 'progress',
                        payload: { progress }
                    });
                },
                onComplete: () => {
                    this.lastSyncTime = Date.now();
                    this.postMessage({ 
                        type: 'complete', 
                        payload: { lastSync: this.lastSyncTime } 
                    });
                },
                onError: (error: string) => {
                    this.postMessage({ 
                        type: 'error', 
                        payload: { error } 
                    });
                }
            });

        } catch (error) {
            this.postMessage({ 
                type: 'error', 
                payload: { error: error instanceof Error ? error.message : 'Unknown error' } 
            });
        } finally {
            this.isRunning = false;
            if (this.dataLoader) {
                this.dataLoader.close();
                this.dataLoader = null;
            }
        }
    }

    private stopSync() {
        if (this.dataLoader) {
            this.dataLoader.stopLoading();
        }
        this.isRunning = false;
    }

    private sendStatus() {
        this.postMessage({
            type: 'status',
            payload: {
                isRunning: this.isRunning,
                lastSync: this.lastSyncTime
            }
        });
    }

    private postMessage(message: SyncWorkerResponse) {
        self.postMessage(message);
    }
}

// Initialize worker
new SyncWorker();