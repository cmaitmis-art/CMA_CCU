import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

const defaultSettings = {
  vatPercentage: 18,
  ssclPercentage: 2.5,
  registrationRates: {
    '1-10': 3000,
    '11-50': 4000,
    '51-100': 5000,
    '101-200': 6000,
    '201+': 7000
  },
  renewalRatesOld: {
    '1-10': 3000,
    '11-50': 4000,
    '51-100': 5000,
    '101-200': 6000,
    '201+': 7000
  },
  renewalRatesNew: {
    '1-10': 3000,
    '11-50': 4000,
    '51-100': 5000,
    '101-200': 6000,
    '201+': 7000
  },
  mc_category_rates: {
    government_low: { label: 'Government - Low Income', rate: 100 },
    government_middle: { label: 'Government - Middle Income', rate: 200 },
    private_normal: { label: 'Private / Normal', rate: 250 },
    private_semi_luxury: { label: 'Private - Semi Luxury', rate: 350 },
    private_luxury: { label: 'Private - Luxury', rate: 500 },
    nhda: { label: 'NHDA', rate: 500 }, // Flat Rs.500/yr (monthly Rs.41.67)
    private_super_luxury: { label: 'Private - Super Luxury', rate: 7000 },
    commercial_normal: { label: 'Commercial - Normal', rate: 5000 },
    commercial_luxury: { label: 'Commercial - Luxury', rate: 6000 },
    commercial_super_luxury: { label: 'Commercial - Super Luxury', rate: 7000 },
    mixed_normal: { label: 'Mixed - Normal', rate: 6000 },
    mixed_luxury: { label: 'Mixed - Luxury', rate: 7000 },
  },
  mc_rates_pre2023: [
    { maxUnits: null, minUnits: 101, fee: 20000 },
    { maxUnits: 100, minUnits: 76, fee: 10000 },
    { maxUnits: 75, minUnits: 51, fee: 7500 },
    { maxUnits: 50, minUnits: 41, fee: 5000 },
    { maxUnits: 40, minUnits: 31, fee: 3500 },
    { maxUnits: 30, minUnits: 21, fee: 2500 },
    { maxUnits: 20, minUnits: 11, fee: 1500 },
    { maxUnits: 10, minUnits: 1, fee: 1000 },
    { maxUnits: 0, minUnits: 0, fee: 500 },
  ],
  nhda_mcom_rate: 250, // NHDA M.Com flat annual fee Rs.250/yr (monthly Rs.20.83)
  sscl_rate: 0.025,
  vat_rate: 0.18,
  // M.Com Renewal Fee Brackets (2023 Onwards) - flat fee per M.Com based on number of units
  mcom_rates_2023: [
    { minUnits: 101, maxUnits: null, fee: 20000 },
    { minUnits: 76,  maxUnits: 100,  fee: 10000 },
    { minUnits: 51,  maxUnits: 75,   fee: 7500  },
    { minUnits: 41,  maxUnits: 50,   fee: 5000  },
    { minUnits: 31,  maxUnits: 40,   fee: 3500  },
    { minUnits: 21,  maxUnits: 30,   fee: 2500  },
    { minUnits: 11,  maxUnits: 20,   fee: 1500  },
    { minUnits: 1,   maxUnits: 10,   fee: 1000  },
    { minUnits: 0,   maxUnits: 0,    fee: 500   },
  ],
  // M.Com Renewal Fee Brackets (Before 2023)
  mcom_rates_pre2023: [
    { minUnits: 101, maxUnits: null, fee: 20000 },
    { minUnits: 76,  maxUnits: 100,  fee: 10000 },
    { minUnits: 51,  maxUnits: 75,   fee: 7500  },
    { minUnits: 41,  maxUnits: 50,   fee: 5000  },
    { minUnits: 31,  maxUnits: 40,   fee: 3500  },
    { minUnits: 21,  maxUnits: 30,   fee: 2500  },
    { minUnits: 11,  maxUnits: 20,   fee: 1500  },
    { minUnits: 1,   maxUnits: 10,   fee: 1000  },
    { minUnits: 0,   maxUnits: 0,    fee: 500   },
  ],
  // M.Com Gov/NHDA flat annual fee before 2023
  mcom_gov_nhda_pre2023_rate: 250,
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
      const res = await fetch(`${API_BASE}/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error('Failed to fetch settings, using defaults', err);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        setSettings(prev => ({ ...prev, ...newSettings }));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update settings', err);
      return false;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
