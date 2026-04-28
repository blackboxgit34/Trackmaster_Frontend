import { createContext, useContext, useState, ReactNode } from 'react';
import { poiData as initialPoiData, type Poi } from '@/data/poiData';

interface PoiContextType {
  pois: Poi[];
  addPoi: (newPoi: Poi) => void;
  updatePois: (updatedPois: Poi[]) => void;
}

const PoiContext = createContext<PoiContextType | undefined>(undefined);

export const PoiProvider = ({ children }: { children: ReactNode }) => {
  const [pois, setPois] = useState<Poi[]>(initialPoiData);

  const addPoi = (newPoi: Poi) => {
    setPois(prevPois => [...prevPois, newPoi]);
  };

  const updatePois = (updatedPois: Poi[]) => {
    setPois(updatedPois);
  };

  return (
    <PoiContext.Provider value={{ pois, addPoi, updatePois }}>
      {children}
    </PoiContext.Provider>
  );
};

export const usePois = () => {
  const context = useContext(PoiContext);
  if (context === undefined) {
    throw new Error('usePois must be used within a PoiProvider');
  }
  return context;
};