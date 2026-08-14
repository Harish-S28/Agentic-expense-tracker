/**
 * CSV Service
 * Coordinates CSV file parsing, validation, error handling, state synchronization,
 * and sample generation.
 */

import { csvParser } from '../utils/csvParser.js';
import { appState } from '../state.js';

export const csvService = {
  /**
   * Import CSV from File object
   * @param {File} file 
   * @returns {Promise<{ success: boolean, count: number, errors: Array, fileName: string }>}
   */
  async importCsvFile(file) {
    if (!file) {
      return { success: false, count: 0, errors: ['No file provided.'], fileName: '' };
    }

    try {
      const result = await csvParser.parseFile(file);

      if (!result.valid || result.transactions.length === 0) {
        return {
          success: false,
          count: 0,
          errors: result.errors.length > 0 ? result.errors : ['Failed to parse valid transactions from CSV.'],
          fileName: file.name
        };
      }

      // Load parsed transactions into State
      appState.loadCsvDataset({
        transactions: result.transactions,
        fileName: file.name
      });

      return {
        success: true,
        count: result.transactions.length,
        errors: result.errors,
        fileName: file.name
      };
    } catch (err) {
      return {
        success: false,
        count: 0,
        errors: [`Error processing CSV: ${err.message}`],
        fileName: file.name
      };
    }
  },

  /**
   * Import CSV from raw text string
   * @param {string} csvText 
   * @param {string} fileName 
   * @returns {Promise<{ success: boolean, count: number, errors: Array }>}
   */
  async importCsvString(csvText, fileName = 'dataset.csv') {
    try {
      const result = await csvParser.parseString(csvText);

      if (!result.valid || result.transactions.length === 0) {
        return {
          success: false,
          count: 0,
          errors: result.errors.length > 0 ? result.errors : ['Failed to parse valid transactions.']
        };
      }

      appState.loadCsvDataset({
        transactions: result.transactions,
        fileName
      });

      return {
        success: true,
        count: result.transactions.length,
        errors: result.errors
      };
    } catch (err) {
      return {
        success: false,
        count: 0,
        errors: [`Error parsing string: ${err.message}`]
      };
    }
  },

  /**
   * Clear the active dataset from state and storage
   */
  clearDataset() {
    appState.clearDataset();
  },

  /**
   * Get active dataset meta info
   * @returns {Object}
   */
  getDatasetStatus() {
    const state = appState.getState();
    return {
      isLoaded: state.csvLoaded,
      fileName: state.csvFileName,
      importTime: state.csvImportTime,
      recordCount: state.expenses.length
    };
  },

  /**
   * Download a clean CSV sample template
   */
  downloadSampleTemplate() {
    const content = csvParser.generateSampleTemplate();
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'spendlog_sample_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
