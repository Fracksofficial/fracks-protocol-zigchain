'use client';

import { createContext, useContext, useState, useRef } from 'react';
import { ProfessionalTourGuide } from '@/lib/tour-guide-professional';
import { professionalTourSteps } from '@/lib/tour-steps-professional';
import { TourGuideUI } from '@/components/tour/tour-guide-ui-professional';

interface TourContextType {
  manager: ProfessionalTourGuide;
  startTour: () => void;
  isActive: boolean;
}

const TourContext = createContext<TourContextType | null>(null);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const managerRef = useRef<ProfessionalTourGuide | null>(null);
  const [isActive, setIsActive] = useState(false);

  // Initialize professional tour manager
  if (!managerRef.current) {
    managerRef.current = new ProfessionalTourGuide(professionalTourSteps);
    managerRef.current.subscribe((state) => {
      setIsActive(state.isActive);
    });
  }

  const manager = managerRef.current;

  const startTour = () => {
    manager.start();
  };

  return (
    <TourContext.Provider value={{ manager, startTour, isActive }}>
      {children}
      <TourGuideUI manager={manager} />
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within TourProvider');
  }
  return context;
}
