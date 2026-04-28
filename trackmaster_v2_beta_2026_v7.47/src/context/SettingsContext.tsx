import { createContext, useContext, useState, ReactNode } from 'react';

interface FuelThresholds {
  low: number;
}

interface FleetThresholds {
  rpm: number;
  overspeed: number;
  engineTemp: { low: number; high: number };
  hydraulicTemp: { low: number; high: number };
  overIdling: { value: number; unit: 'min' | 'hr' };
  overStoppage: { value: number; unit: 'min' | 'hr' };
  service: { value: number; preAlert: number };
}

interface Settings {
  fuelThresholds: FuelThresholds;
  fleetThresholds: FleetThresholds;
}

interface SettingsContextType extends Settings {
  updateFuelThresholds: (newThresholds: Partial<FuelThresholds>) => void;
  updateFleetThresholds: (newThresholds: Partial<FleetThresholds>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const SETTINGS_STORAGE_KEY = 'trackmaster-settings';

const defaultSettings: Settings = {
  fuelThresholds: {
    low: 50,
  },
  fleetThresholds: {
    rpm: 3000,
    overspeed: 80,
    engineTemp: { low: 75, high: 95 },
    hydraulicTemp: { low: 50, high: 80 },
    overIdling: { value: 15, unit: 'min' as 'min' | 'hr' },
    overStoppage: { value: 30, unit: 'min' as 'min' | 'hr' },
    service: { value: 500, preAlert: 50 },
  }
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        // Handle migration from old 'idling' key to 'overIdling'
        if (parsed.fleetThresholds && parsed.fleetThresholds.idling && !parsed.fleetThresholds.overIdling) {
          parsed.fleetThresholds.overIdling = parsed.fleetThresholds.idling;
          delete parsed.fleetThresholds.idling;
        }
        // Deep merge to handle cases where new settings are added
        return {
          fuelThresholds: { ...defaultSettings.fuelThresholds, ...parsed.fuelThresholds },
          fleetThresholds: { ...defaultSettings.fleetThresholds, ...parsed.fleetThresholds },
        };
      }
    } catch (e) {
      console.error("Failed to read settings from localStorage", e);
    }
    return defaultSettings;
  });

  const updateFuelThresholds = (newThresholds: Partial<FuelThresholds>) => {
    setSettings(prev => {
      const updatedSettings = {
        ...prev,
        fuelThresholds: {
          ...prev.fuelThresholds,
          ...newThresholds,
        },
      };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings));
      } catch (e) {
        console.error("Failed to save settings to localStorage", e);
      }
      return updatedSettings;
    });
  };

  const updateFleetThresholds = (newThresholds: Partial<FleetThresholds>) => {
    setSettings(prev => {
      const updatedSettings = {
        ...prev,
        fleetThresholds: {
          ...prev.fleetThresholds,
          ...newThresholds,
        },
      };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings));
      } catch (e) {
        console.error("Failed to save settings to localStorage", e);
      }
      return updatedSettings;
    });
  };

  return (
    <SettingsContext.Provider value={{ ...settings, updateFuelThresholds, updateFleetThresholds }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};