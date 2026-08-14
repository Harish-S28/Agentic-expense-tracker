/**
 * Validation Utilities
 */

/**
 * Validate individual expense/income object
 * @param {Object} item 
 * @returns {string|null} error message or null if valid
 */
export function validateExpense(item) {
  if (!item) return 'Transaction data is required';
  if (!item.title || !String(item.title).trim()) return 'Title/Merchant is required';
  if (item.amount === undefined || item.amount === null || isNaN(Number(item.amount)) || Number(item.amount) <= 0) {
    return 'Please enter a valid positive amount';
  }
  if (!item.category || !String(item.category).trim()) return 'Category is required';
  if (!item.date) return 'Transaction date is required';
  return null;
}

/**
 * Validate category budget
 * @param {Object} budget 
 * @returns {string|null}
 */
export function validateBudget(budget) {
  if (!budget) return 'Budget data is required';
  if (!budget.category || !String(budget.category).trim()) return 'Category is required';
  if (budget.limit === undefined || isNaN(Number(budget.limit)) || Number(budget.limit) <= 0) {
    return 'Budget limit must be a positive number';
  }
  return null;
}

/**
 * Validate savings goal
 * @param {Object} goal 
 * @returns {string|null}
 */
export function validateGoal(goal) {
  if (!goal) return 'Goal data is required';
  if (!goal.title || !String(goal.title).trim()) return 'Goal name is required';
  if (goal.targetAmount === undefined || isNaN(Number(goal.targetAmount)) || Number(goal.targetAmount) <= 0) {
    return 'Target amount must be a positive number';
  }
  return null;
}

/**
 * Robust date parser supporting DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, MM/DD/YYYY, and timestamps
 * @param {string|number|Date} dateVal 
 * @returns {string} ISO Date format YYYY-MM-DD
 */
export function parseDateString(dateVal) {
  if (!dateVal) return new Date().toISOString().split('T')[0];
  const s = String(dateVal).trim();
  if (!s) return new Date().toISOString().split('T')[0];

  // Numeric timestamp
  if (/^\d{10,13}$/.test(s)) {
    const ts = parseInt(s, 10);
    const d = new Date(s.length === 10 ? ts * 1000 : ts);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmyMatch) {
    const part1 = parseInt(dmyMatch[1], 10);
    const part2 = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);

    let day = part1;
    let month = part2;
    if (part1 <= 12 && part2 > 12) {
      day = part2;
      month = part1;
    }
    const d = new Date(year, month - 1, day);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(year, month - 1, day);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  // Standard fallback
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Heuristic category guesser if category is missing or generic
 * @param {string} title 
 * @param {string} type 
 * @returns {string}
 */
export function guessCategory(title = '', type = 'expense') {
  if (type === 'income') return 'Income';
  const t = String(title).toLowerCase();

  if (/swiggy|zomato|mcdonald|burger|starbucks|kfc|pizza|domino|restaurant|cafe|dining|food|blinkit|instamart|zepto|eatclub|subway|biryani/i.test(t)) {
    return 'Food';
  }
  if (/uber|ola|metro|petrol|fuel|shell|hp|bpcl|rapido|taxi|train|irctc|flight|indigo|airindia|toll|parking|fastag/i.test(t)) {
    return 'Transport';
  }
  if (/amazon|flipkart|myntra|zara|h&m|shopping|retail|store|uniqlo|ajio|meesho|decathlon/i.test(t)) {
    return 'Shopping';
  }
  if (/grocery|groceries|supermarket|dmart|bigbasket|nature's basket|reliance smart/i.test(t)) {
    return 'Groceries';
  }
  if (/netflix|spotify|youtube|hotstar|prime|movie|cinema|steam|playstation|game|theatre|bookmyshow|disney/i.test(t)) {
    return 'Entertainment';
  }
  if (/electricity|water|gas|broadband|wifi|airtel|jio|vi|bill|utility|recharge|bescom|tneb|mahadiscom/i.test(t)) {
    return 'Utilities';
  }
  if (/hospital|clinic|pharmacy|medplus|apollo|doctor|health|1mg|practo|lab|diagnostic/i.test(t)) {
    return 'Healthcare';
  }
  if (/course|udemy|coursera|book|school|college|tuition|education|fees/i.test(t)) {
    return 'Education';
  }
  if (/salary|interest|dividend|refund|cashback|bonus|payout|transfer/i.test(t)) {
    return 'Income';
  }
  return 'Other';
}

/**
 * Validate parsed CSV rows against required columns and banking statement structures
 * @param {Array} rows 
 * @returns {{ valid: boolean, validRows: Array, errors: Array }}
 */
export function validateCsvRows(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      valid: false,
      validRows: [],
      errors: ['The uploaded CSV file is empty.']
    };
  }

  const validRows = [];
  const errors = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2; // +1 for 0-index, +1 for header line

    // Normalize keys across diverse CSV conventions
    const title = row.title || row.Title || row.merchant || row.Merchant || row.merchant_name || 
                  row.payee || row.Payee || row.narration || row.Narration || row.particulars || 
                  row.Particulars || row.description || row.Description || row.item || row.Item || 
                  row.item_name || row.details || row.memo || row.name || row.Name;

    let category = row.category || row.Category || row.category_name || row.tag || row.Tag || 
                   row.tags || row.classification || row.group || '';

    const rawAmount = row.amount || row.Amount || row.transaction_amount || row.txn_amount || 
                      row.value || row.Value || row.price || row.Price || row.total || row.Total || 
                      row.net_amount || row.cost;

    const rawDebit = row.debit || row.Debit || row.withdrawal || row.Withdrawal || row.dr || 
                     row.dr_amount || row.debit_amount;

    const rawCredit = row.credit || row.Credit || row.deposit || row.Deposit || row.cr || 
                      row.cr_amount || row.credit_amount;

    const date = row.date || row.Date || row.transaction_date || row.txn_date || row.trans_date || 
                 row.posting_date || row.value_date || row.time || row.Time || row.datetime;

    const rawType = row.type || row.Type || row.transaction_type || row.transactionType || 
                    row.txn_type || row.cr_dr || row.dr_cr || row.entry_type || '';

    const paymentMethod = row.payment_method || row.paymentMethod || row.payment_mode || 
                          row.mode || row.payment || row.Payment || row.account || row.channel || 'UPI';

    const notes = row.notes || row.Notes || row.description || row.Description || 
                  row.remarks || row.comment || row.memo || '';

    // Check empty rows
    if (!title && !category && !rawAmount && !rawDebit && !rawCredit && !date) {
      return;
    }

    if (!title) {
      errors.push(`Row ${rowNum}: Missing 'title' or 'merchant'`);
      return;
    }

    // Determine amount and type
    let numAmount = 0;
    let detectedType = '';

    const cleanDebit = rawDebit !== undefined && rawDebit !== null ? String(rawDebit).replace(/[^0-9.-]+/g, '') : '';
    const cleanCredit = rawCredit !== undefined && rawCredit !== null ? String(rawCredit).replace(/[^0-9.-]+/g, '') : '';
    const numDebit = parseFloat(cleanDebit);
    const numCredit = parseFloat(cleanCredit);

    if (!isNaN(numDebit) && numDebit > 0) {
      numAmount = numDebit;
      detectedType = 'expense';
    } else if (!isNaN(numCredit) && numCredit > 0) {
      numAmount = numCredit;
      detectedType = 'income';
    } else {
      const cleanAmount = String(rawAmount || '').replace(/[^0-9.-]+/g, '');
      const parsedAmt = parseFloat(cleanAmount);

      if (isNaN(parsedAmt) || parsedAmt === 0) {
        errors.push(`Row ${rowNum} ("${title}"): Invalid amount "${rawAmount}"`);
        return;
      }

      if (parsedAmt < 0) {
        numAmount = Math.abs(parsedAmt);
        detectedType = 'expense';
      } else {
        numAmount = parsedAmt;
      }
    }

    // Determine type from explicit column or detected direction
    let type = detectedType || 'expense';
    const lowerType = String(rawType).toLowerCase().trim();
    if (lowerType === 'income' || lowerType === 'credit' || lowerType === 'cr' || 
        lowerType === 'deposit' || lowerType === 'salary' || lowerType === 'inflow') {
      type = 'income';
    } else if (lowerType === 'expense' || lowerType === 'debit' || lowerType === 'dr' || 
               lowerType === 'withdrawal' || lowerType === 'outflow' || lowerType === 'payment') {
      type = 'expense';
    }

    // If category is empty or 'Other', use smart category guessing
    if (!category || category.trim().toLowerCase() === 'other' || category.trim().toLowerCase() === 'uncategorized') {
      category = guessCategory(title, type);
    } else {
      category = String(category).trim();
    }

    // Parse date
    const parsedDate = parseDateString(date);

    validRows.push({
      id: `csv-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 6)}`,
      title: String(title).trim(),
      merchant: String(title).trim(),
      category,
      amount: numAmount,
      type,
      date: parsedDate,
      paymentMethod: String(paymentMethod).trim(),
      notes: String(notes).trim()
    });
  });

  if (validRows.length === 0) {
    return {
      valid: false,
      validRows: [],
      errors: errors.length > 0 ? errors : ['No valid transaction records could be parsed. Please check the CSV columns (date, title, category, amount, type).']
    };
  }

  return {
    valid: true,
    validRows,
    errors
  };
}
