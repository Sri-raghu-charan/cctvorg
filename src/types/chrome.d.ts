/**
 * Ambient type definitions for WebExtension / Chrome APIs
 */

declare namespace chrome {
  export namespace storage {
    export interface StorageArea {
      get(keys: string | string[] | Record<string, any> | null, callback: (items: Record<string, any>) => void): void;
      set(items: Record<string, any>, callback?: () => void): void;
      remove(keys: string | string[], callback?: () => void): void;
      clear(callback?: () => void): void;
    }
    export const local: StorageArea;
    export const sync: StorageArea;
  }

  export namespace runtime {
    export interface LastError {
      message?: string;
    }
    export const lastError: LastError | undefined;
    export interface MessageSender {
      id?: string;
      url?: string;
      tab?: any;
    }
    export const onInstalled: {
      addListener(callback: (details: { reason: string }) => void): void;
    };
    export const onMessage: {
      addListener(callback: (message: any, sender: MessageSender, sendResponse: (response?: any) => void) => boolean | void): void;
    };
    export function sendMessage(message: any, responseCallback?: (response: any) => void): void;
  }

  export namespace action {
    export const onClicked: {
      addListener(callback: (tab: { id?: number; url?: string }) => void): void;
    };
  }

  export namespace tabs {
    export function create(createProperties: { url?: string; active?: boolean }, callback?: (tab: any) => void): void;
    export function sendMessage(tabId: number, message: any, responseCallback?: (response: any) => void): Promise<any>;
    export function query(queryInfo: { active?: boolean; currentWindow?: boolean; [key: string]: any }, callback?: (result: any[]) => void): Promise<any[]>;
    export function reload(tabId?: number): Promise<void>;
  }

  export namespace scripting {
    export function executeScript(injection: { target: { tabId: number; allFrames?: boolean }; files?: string[]; func?: (...args: any[]) => any }): Promise<any[]>;
    export function insertCSS(injection: { target: { tabId: number; allFrames?: boolean }; files?: string[]; css?: string }): Promise<void>;
  }
}
