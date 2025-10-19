/**
 * Formats a number as currency with commas and two decimal places
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency symbol (default: '$')
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = "$") => {
  if (typeof amount !== "number" || isNaN(amount)) {
    return `${currency}0.00`;
  }

  return `${currency}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Formats a number with commas (no currency symbol)
 * @param {number} amount - The amount to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted number string
 */
export const formatNumber = (amount, decimals = 2) => {
  if (typeof amount !== "number" || isNaN(amount)) {
    return "0.00";
  }

  return amount.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};
