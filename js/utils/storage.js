/**
 * Storage Utility
 * Temporary frontend persistence using localStorage.
 * 
 * NOTE FOR BACKEND INTEGRATION:
 * This will be replaced by backend API endpoints (e.g. PostgreSQL / REST / GraphQL).
 */

const STORAGE_KEYS = {
  APP_STATE: 'spendlog_app_state',
  USER_PREFS: 'spendlog_user_prefs'
};

export const storage = {
  /**
   * Save state to localStorage
   * @param {Object} state 
   */
  saveState(state) {
    try {
      // Temporary frontend persistence.
      // Backend/database will replace this later.
      localStorage.setItem(STORAGE_KEYS.APP_STATE, JSON.stringify(state));
    } catch (e) {
      console.warn('Storage: Failed to save state to localStorage', e);
    }
  },

  /**
   * Load state from localStorage
   * @returns {Object|null}
   */
  loadState() {
    try {
      // Temporary frontend persistence.
      // Backend/database will replace this later.
      const raw = localStorage.getItem(STORAGE_KEYS.APP_STATE);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Storage: Failed to read state from localStorage', e);
    }
    return null;
  },

  /**
   * Clear all persisted frontend state
   */
  clearState() {
    try {
      localStorage.removeItem(STORAGE_KEYS.APP_STATE);
      localStorage.removeItem('spendlog_has_authenticated');
    } catch (e) {
      console.warn('Storage: Failed to clear localStorage', e);
    }
  }
};
