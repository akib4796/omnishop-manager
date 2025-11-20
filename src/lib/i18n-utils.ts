// Utility functions for i18n and Bangla support

export const toBengaliNumerals = (num: number | string): string => {
  const bengaliNumerals = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/\d/g, (digit) => bengaliNumerals[parseInt(digit)]);
};

export const formatCurrency = (amount: number, currency: string = 'BDT', language: string = 'en'): string => {
  if (language === 'bn') {
    return `৳ ${toBengaliNumerals(amount.toFixed(2))}`;
  }
  return `৳ ${amount.toFixed(2)}`;
};

export const formatDate = (date: Date | string, language: string = 'en'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const formatted = dateObj.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US');
  
  if (language === 'bn') {
    return toBengaliNumerals(formatted);
  }
  return formatted;
};
