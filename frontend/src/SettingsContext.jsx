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
    government_low: { label: 'Government - Low Income', rate: 3000 },
    government_middle: { label: 'Government - Middle Income', rate: 4000 },
    private_normal: { label: 'Private / Normal', rate: 4000 },
    private_semi_luxury: { label: 'Private - Semi Luxury', rate: 5000 },
    private_luxury: { label: 'Private - Luxury', rate: 6000 },
    private_super_luxury: { label: 'Private - Super Luxury', rate: 7000 },
    commercial_normal: { label: 'Commercial - Normal', rate: 5000 },
    commercial_luxury: { label: 'Commercial - Luxury', rate: 6000 },
    commercial_super_luxury: { label: 'Commercial - Super Luxury', rate: 7000 },
    mixed_normal: { label: 'Mixed - Normal', rate: 6000 },
    mixed_luxury: { label: 'Mixed - Luxury', rate: 7000 },
  },
  sscl_rate: 0.025,
  vat_rate: 0.18
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
