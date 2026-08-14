/**
 * CSV Parser Utility
 * Reads CSV files and raw strings, strips BOM, handles delimiter auto-detection,
 * and passes the result to data validation.
 */

import Papa from 'papaparse';
import { validateCsvRows } from './validation.js';

export const csvParser = {
  /**
   * Parse a File object into validated transaction objects
   * @param {File} file 
   * @returns {Promise<{ valid: boolean, transactions: Array, errors: Array, meta: Object }>}
   */
  async parseFile(file) {
    return new Promise((resolve) => {
      if (!file) {
        return resolve({
          valid: false,
          transactions: [],
          errors: ['No file selected. Please choose a valid .csv file.'],
          meta: {}
        });
      }

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        transformHeader: (header) => header.trim().toLowerCase().replace(/[\s_-]+/g, '_'),
        complete: (results) => {
          const { valid, validRows, errors } = validateCsvRows(results.data);
          resolve({
            valid,
            transactions: validRows,
            errors: [...errors, ...(results.errors || []).map(e => e.message)],
            meta: {
              fileName: file.name,
              fileSize: file.size,
              rowCount: validRows.length,
              fields: results.meta.fields
            }
          });
        },
        error: (err) => {
          resolve({
            valid: false,
            transactions: [],
            errors: [`CSV Parsing failed: ${err.message}`],
            meta: {}
          });
        }
      });
    });
  },

  /**
   * Parse raw CSV string
   * @param {string} csvString 
   * @returns {{ valid: boolean, transactions: Array, errors: Array }}
   */
  parseString(csvString) {
    const results = Papa.parse(csvString.trim(), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/[\s_-]+/g, '_')
    });

    const { valid, validRows, errors } = validateCsvRows(results.data);
    return {
      valid,
      transactions: validRows,
      errors
    };
  },

  /**
   * Generate a sample template CSV content for user testing or download
   * @returns {string}
   */
  generateSampleTemplate() {
    return `date,title,category,amount,type,payment_method,description
2026-03-01,Monthly Salary,Income,65000,income,Net Banking,Primary paycheck
2026-03-02,Whole Foods Groceries,Groceries,3450,expense,Credit Card,Weekly essentials
2026-03-03,Swiggy Gourmet,Food,680,expense,UPI,Dinner order
2026-03-05,Uber Ride,Transport,420,expense,UPI,Commute to office
2026-03-07,Electricity Bill,Utilities,1850,expense,Auto Debit,Monthly utility payment
2026-03-10,Amazon Order,Shopping,4200,expense,Credit Card,Office accessories
2026-03-12,Netflix Subscription,Entertainment,649,expense,Credit Card,Monthly plan
2026-03-15,Starbucks Coffee,Food,390,expense,UPI,Coffee meeting
2026-03-18,Pharmacy & Meds,Healthcare,850,expense,Debit Card,Vitamins and prescription
2026-03-20,Freelance Consulting,Income,15000,income,Net Banking,Client project bonus`;
  }
};
