import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const handlePrintReceipt = (orderId: string | number) => {
  if (!orderId) return;
  if (typeof window !== 'undefined') {
    const printUrl = `/print/receipt/${orderId}`;
    window.open(printUrl, '_blank');
  }
}

// Format a Date to local YYYY-MM-DD (avoids UTC offset issues from toISOString)
// Format a Date to local YYYY-MM-DD (avoids UTC offset issues from toISOString)
const formatLocalDate = (d: Date) => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// Format currency (EGP)
const formatCurrency = (amount: number, locale: string = 'en') => {
  if (locale !== 'ar') {
    return `EGP ${Number(amount).toFixed(2)}`
  }
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 2
  }).format(amount)
}

export { handlePrintReceipt, formatLocalDate, formatCurrency };

export const exportToCSV = (data: any[], filename: string) => {
  if (!data || !data.length) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header];
      // Handle strings that might contain commas or newlines
      if (typeof value === 'string') {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}