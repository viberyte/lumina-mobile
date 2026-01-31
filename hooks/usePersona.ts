import { useState, useEffect, useMemo } from 'react';
import personaService, { UserPersona, PersonalizedContent } from '../services/personaService';

interface UsePersonaResult {
  // Core data
  persona: UserPersona | null;
  content: PersonalizedContent;
  personaKey: string;
  
  // State flags
  isLoading: boolean;
  hasOnboarded: boolean;
  ready: boolean; // !isLoading && hasOnboarded
  
  // Actions
  refresh: () => Promise<void>;
  clear: () => Promise<void>;
}

export function usePersona(): UsePersonaResult {
  const [persona, setPersona] = useState<UserPersona | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState(false);

  const loadPersona = async () => {
    setIsLoading(true);
    try {
      const loaded = await personaService.loadPersona();
      setPersona(loaded);
      setHasOnboarded(loaded !== null);
    } catch (error) {
      console.log('Error loading persona:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearPersona = async () => {
    await personaService.clearPersona();
    setPersona(null);
    setHasOnboarded(false);
  };

  useEffect(() => {
    loadPersona();
  }, []);

  // Memoized content - only recalculates when persona changes
  const content = useMemo(
    () => personaService.getPersonalizedContent(persona),
    [persona]
  );

  // Persona key for logging/analytics/debugging
  const personaKey = persona?.persona_id ?? 'default';

  // Ready = loaded and onboarded (DX helper)
  const ready = !isLoading && hasOnboarded;

  return {
    persona,
    content,
    personaKey,
    isLoading,
    hasOnboarded,
    ready,
    refresh: loadPersona,
    clear: clearPersona,
  };
}

export default usePersona;
