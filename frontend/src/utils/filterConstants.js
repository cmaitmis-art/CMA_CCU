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

export const ZONE_OPTIONS = [
  'Athurugiriya',
  'Battaramulla',
  'Borelasgamuwa',
  'Colombo',
  'Colombo 01',
  'Colombo 02',
  'Colombo 03',
  'Colombo 04',
  'Colombo 05',
  'Colombo 06',
  'Colombo 07',
  'Colombo 08',
  'Colombo 09',
  'Colombo 10',
  'Colombo 11',
  'Colombo 12',
  'Colombo 13',
  'Colombo 14',
  'Colombo 15',
  'Dehiwala',
  'Ethul Kotte',
  'Galle',
  'Gampaha',
  'Gonapola',
  'Hanwella',
  'Hokandara',
  'Homagama',
  'Ja - Ela',
  'Jaffna',
  'Kadawatha',
  'Kalagedihena',
  'Kalubowila',
  'Kelaniya',
  'Kolonnawa',
  'Kottawa',
  'Kotte',
  'Kundasale',
  'Kurunegala',
  'Maharagama',
  'Malabe',
  'Mattegoda',
  'Mirihana',
  'Moratuwa',
  'Mount Lavinia',
  'Mt. Lavinia',
  'Mulleriyawa',
  'Naiwala',
  'Nawala',
  'Negambo',
  'Nugegoda',
  'Nuwara- Eliya',
  'Panadura',
  'Pelawatte',
  'Ragama',
  'Rajagiriya',
  'Rathmalana',
  'Sedawatte',
  'Thalawathugoda',
  'Thalpe',
  'Thihariya',
  'Trincomalle',
  'Waikkala',
  'Wattala',
  'Wellampitiya',
  'Yakkala'
];
