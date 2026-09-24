/**
 * Unified storage service supporting chrome.storage.local when in extension context
 * and localStorage when running in standalone mode.
 */

export interface StorageAdapter {
  get<T>(key: string, defaultValue: T): Promise<T>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

class BrowserStorage implements StorageAdapter {
  private isChromeStorageAvailable(): boolean {
    return (
      typeof chrome !== 'undefined' &&
      !!chrome.storage &&
      !!chrome.storage.local
    );
  }

  async get<T>(key: string, defaultValue: T): Promise<T> {
    if (this.isChromeStorageAvailable()) {
      return new Promise((resolve) => {
        try {
          chrome.storage.local.get([key], (result) => {
            if (chrome.runtime?.lastError || result[key] === undefined) {
              resolve(this.getFromLocalStorage(key, defaultValue));
            } else {
              resolve(result[key] as T);
            }
          });
        } catch {
          resolve(this.getFromLocalStorage(key, defaultValue));
        }
      });
    }
    return this.getFromLocalStorage(key, defaultValue);
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (this.isChromeStorageAvailable()) {
      return new Promise((resolve) => {
        try {
          chrome.storage.local.set({ [key]: value }, () => {
            this.setInLocalStorage(key, value);
            resolve();
          });
        } catch {
          this.setInLocalStorage(key, value);
          resolve();
        }
      });
    }
    this.setInLocalStorage(key, value);
  }

  async remove(key: string): Promise<void> {
    if (this.isChromeStorageAvailable()) {
      return new Promise((resolve) => {
        try {
          chrome.storage.local.remove([key], () => {
            localStorage.removeItem(key);
            resolve();
          });
        } catch {
          localStorage.removeItem(key);
          resolve();
        }
      });
    }
    localStorage.removeItem(key);
  }

  private getFromLocalStorage<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item) as T;
    } catch {
      return defaultValue;
    }
  }

  private setInLocalStorage<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Failed to write to localStorage:', e);
    }
  }
}

export const storage = new BrowserStorage();
