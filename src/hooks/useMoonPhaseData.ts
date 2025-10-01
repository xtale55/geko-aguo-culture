import { useQuery } from '@tanstack/react-query';

interface MoonPhaseData {
  currentPhase: string;
  currentPhaseIcon: 'new' | 'waxing' | 'full' | 'waning';
  nextPhase: string;
  daysUntilNext: number;
  illumination: number;
}

// Fases da lua em ordem
const MOON_PHASES = [
  { name: 'Nova', icon: 'new' as const },
  { name: 'Crescente', icon: 'waxing' as const },
  { name: 'Cheia', icon: 'full' as const },
  { name: 'Minguante', icon: 'waning' as const },
];

// Calcula a fase da lua baseado na data
function calculateMoonPhase(date: Date): MoonPhaseData {
  // Referência: Luna nova em 6 de janeiro de 2000
  const knownNewMoon = new Date('2000-01-06T18:14:00Z');
  const lunarCycle = 29.53058867; // dias no ciclo lunar
  
  const timeDiff = date.getTime() - knownNewMoon.getTime();
  const daysSinceNewMoon = timeDiff / (1000 * 60 * 60 * 24);
  const phase = (daysSinceNewMoon % lunarCycle + lunarCycle) % lunarCycle;
  
  // Determina a fase atual
  let currentPhaseIndex: number;
  let currentPhaseName: string;
  let currentPhaseIcon: 'new' | 'waxing' | 'full' | 'waning';
  
  if (phase < 1.84566) {
    currentPhaseIndex = 0;
    currentPhaseName = 'Nova';
    currentPhaseIcon = 'new';
  } else if (phase < 7.38264) {
    currentPhaseIndex = 1;
    currentPhaseName = 'Crescente';
    currentPhaseIcon = 'waxing';
  } else if (phase < 14.76529) {
    currentPhaseIndex = 1;
    currentPhaseName = 'Crescente';
    currentPhaseIcon = 'waxing';
  } else if (phase < 16.61095) {
    currentPhaseIndex = 2;
    currentPhaseName = 'Cheia';
    currentPhaseIcon = 'full';
  } else if (phase < 22.14793) {
    currentPhaseIndex = 3;
    currentPhaseName = 'Minguante';
    currentPhaseIcon = 'waning';
  } else if (phase < 27.68491) {
    currentPhaseIndex = 3;
    currentPhaseName = 'Minguante';
    currentPhaseIcon = 'waning';
  } else {
    currentPhaseIndex = 0;
    currentPhaseName = 'Nova';
    currentPhaseIcon = 'new';
  }
  
  // Calcula a próxima fase
  const nextPhaseIndex = (currentPhaseIndex + 1) % 4;
  const nextPhaseName = MOON_PHASES[nextPhaseIndex].name;
  
  // Calcula dias até a próxima fase (aproximadamente 7.4 dias entre cada fase principal)
  const daysInPhase = phase % 7.38264;
  const daysUntilNext = Math.ceil(7.38264 - daysInPhase);
  
  // Calcula a iluminação (0-100%)
  const illumination = Math.round(50 * (1 - Math.cos((phase / lunarCycle) * 2 * Math.PI)));
  
  return {
    currentPhase: currentPhaseName,
    currentPhaseIcon,
    nextPhase: nextPhaseName,
    daysUntilNext,
    illumination,
  };
}

export function useMoonPhaseData() {
  return useQuery({
    queryKey: ['moonPhase'],
    queryFn: () => {
      const now = new Date();
      return calculateMoonPhase(now);
    },
    staleTime: 60 * 60 * 1000, // 1 hora
    gcTime: 2 * 60 * 60 * 1000, // 2 horas
  });
}
