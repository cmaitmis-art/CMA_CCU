// Common filter options and helpers shared across CMA management pages

export const MONTH_OPTIONS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export function getYearFilterOptions() {
  const currentYear = new Date().getFullYear();
  const YEAR_FILTER_START = 2000;
  const years = [];
  for (let y = currentYear; y >= YEAR_FILTER_START; y--) {
    years.push(y);
  }
  return years;
}
