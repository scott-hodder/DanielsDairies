/**
 * Activity State Storage
 * Manages persistent storage of user progress in module activities
 */

export interface ActivityState {
  moduleId: string;
  pageNumber: number;
  activityType: string;
  data: Record<string, any>;
  timestamp: number;
}

export class ActivityStateManager {
  private static STORAGE_KEY = 'daniels_diaries_activity_state';
  private static MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  /**
   * Save activity state for a specific page
   */
  static saveState(
    moduleId: string,
    pageNumber: number,
    activityType: string,
    data: Record<string, any>
  ): void {
    try {
      const states = this.getAllStates();
      const key = this.getStateKey(moduleId, pageNumber);
      
      states[key] = {
        moduleId,
        pageNumber,
        activityType,
        data,
        timestamp: Date.now()
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(states));
    } catch (error) {
      console.error('Failed to save activity state:', error);
    }
  }

  /**
   * Load activity state for a specific page
   */
  static loadState(
    moduleId: string,
    pageNumber: number
  ): ActivityState | null {
    try {
      const states = this.getAllStates();
      const key = this.getStateKey(moduleId, pageNumber);
      const state = states[key];

      if (!state) return null;

      // Check if state is expired
      if (Date.now() - state.timestamp > this.MAX_AGE_MS) {
        delete states[key];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(states));
        return null;
      }

      return state;
    } catch (error) {
      console.error('Failed to load activity state:', error);
      return null;
    }
  }

  /**
   * Clear state for a specific module
   */
  static clearModuleState(moduleId: string): void {
    try {
      const states = this.getAllStates();
      const filtered = Object.entries(states)
        .filter(([key]) => !key.startsWith(`${moduleId}_`))
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to clear module state:', error);
    }
  }

  /**
   * Clear all expired states
   */
  static cleanupExpiredStates(): void {
    try {
      const states = this.getAllStates();
      const now = Date.now();
      const filtered = Object.entries(states)
        .filter(([_, state]) => now - state.timestamp <= this.MAX_AGE_MS)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to cleanup expired states:', error);
    }
  }

  /**
   * Get completion percentage for a module
   */
  static getModuleProgress(moduleId: string, totalPages: number): number {
    try {
      const states = this.getAllStates();
      const moduleStates = Object.entries(states)
        .filter(([key]) => key.startsWith(`${moduleId}_`));
      
      return Math.round((moduleStates.length / totalPages) * 100);
    } catch (error) {
      console.error('Failed to get module progress:', error);
      return 0;
    }
  }

  /**
   * Get all stored states
   */
  private static getAllStates(): Record<string, ActivityState> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to parse stored states:', error);
      return {};
    }
  }

  /**
   * Generate a unique key for a module page
   */
  private static getStateKey(moduleId: string, pageNumber: number): string {
    return `${moduleId}_page_${pageNumber}`;
  }

  /**
   * Check if localStorage is available (handles private browsing)
   */
  static isStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Cleanup expired states on load
if (typeof window !== 'undefined' && ActivityStateManager.isStorageAvailable()) {
  ActivityStateManager.cleanupExpiredStates();
}