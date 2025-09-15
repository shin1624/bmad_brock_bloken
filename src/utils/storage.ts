/**
 * Safe localStorage utilities with error handling and validation
 */

export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Safely saves data to localStorage with error handling
 */
export const safeSetItem = <T>(key: string, value: T): StorageResult<T> => {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return { success: true, data: value };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown storage error';
    console.error(`Failed to save to localStorage (${key}):`, errorMsg);
    
    // Handle quota exceeded error
    if (errorMsg.includes('QuotaExceededError') || errorMsg.includes('quota')) {
      return { 
        success: false, 
        error: 'Storage quota exceeded. Please clear some data and try again.' 
      };
    }
    
    return { success: false, error: `Storage error: ${errorMsg}` };
  }
};

/**
 * Safely retrieves data from localStorage with error handling
 */
export const safeGetItem = <T>(key: string, defaultValue?: T): StorageResult<T> => {
  try {
    const item = localStorage.getItem(key);
    
    if (item === null) {
      return { 
        success: true, 
        data: defaultValue 
      };
    }
    
    const parsed = JSON.parse(item) as T;
    return { success: true, data: parsed };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown storage error';
    console.error(`Failed to load from localStorage (${key}):`, errorMsg);
    
    // Return default value on parse error
    return { 
      success: false, 
      data: defaultValue,
      error: `Parse error: ${errorMsg}`
    };
  }
};

/**
 * Safely removes item from localStorage
 */
export const safeRemoveItem = (key: string): StorageResult<null> => {
  try {
    localStorage.removeItem(key);
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown storage error';
    console.error(`Failed to remove from localStorage (${key}):`, errorMsg);
    return { success: false, error: errorMsg };
  }
};

/**
 * Checks if localStorage is available and working
 */
export const isStorageAvailable = (): boolean => {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

/**
 * Gets available storage space (approximate)
 */
export const getStorageInfo = (): { available: boolean; usage?: number; quota?: number } => {
  if (!isStorageAvailable()) {
    return { available: false };
  }
  
  try {
    // Estimate usage by checking current localStorage size
    let totalSize = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length;
      }
    }
    
    return {
      available: true,
      usage: totalSize,
      quota: 5242880 // 5MB typical quota
    };
  } catch {
    return { available: true };
  }
};