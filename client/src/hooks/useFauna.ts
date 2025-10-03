import { useEffect, useState } from 'react';
import { BACKEND_IP, BACKEND_PORT } from '../common';

export type BaseItem = {
  id: number;
  name: string;
  type: string;
  image: string;
  description: string;
  tier1Value: number;
  tier1Cost: number;
  tier2Value: number;
  tier2Cost: number;
  tier3Value: number;
  tier3Cost: number;
  isGluten: boolean;
  isSugar: boolean;
  isMeat: boolean;
  isVegetable: boolean;
  isAlcohol: boolean;
  isDrugs: boolean;
  isFood: boolean;
  isDrink: boolean;
  effectPercent: number;
  projectileType: string | null;
  damageType: string | null;
  dmgModifier: number;
  inventoryHeight: number;
  inventoryWidth: number;
};

export type Gene = {
  id: number;
  name: string;
  image: string;
  effect: string;
  extractProbability: number;
  combineProbability: number;
};

export type Fauna = {
  id: number;
  name: string;
  scientificName: string;
  order: string;
  family: string;
  genus: string;
  description: string;
  resource1: BaseItem | null;
  resource2: BaseItem | null;
  resource3: BaseItem | null;
  resource4: BaseItem | null;
  resource5: BaseItem | null;
  resource6: BaseItem | null;
  sociality: string;
  diet: string;
  habitat: string;
  enemies: string;
  length: number;
  height: number;
  weight: number;
  walkingSpeed: number;
  swimmingSpeed: number;
  flyingSpeed: number;
  contResistance: number;
  perfResistance: number;
  tempResistance: number;
  chimResistance: number;
  geneId: number | null;
  gene: Gene | null;
  geneSource?: string;
  tamingDifficulty: number;
  image: string;
  footprint: string;
  skinPattern: string;
  category: string;
};

const defaultFauna: Fauna = {
  id: 0,
  name: 'Tyrannosaurus-rex',
  scientificName: 'Lucertola Re',
  order: 'Saurischia',
  family: 'Tirannosauride',
  genus: 'Tyrannosaurus',
  description: 'Descrizione a caso per il tirannosauro',
  resource1: {
    id: 0,
    name: 'Carne rossa (cruda)',
    type: 'Carne',
    image: 'https://picsum.photos/200',
    description: 'Carne rossa non cotta. Che ti aspettavi?',
    tier1Value: 0,
    tier1Cost: 0,
    tier2Value: 0,
    tier2Cost: 0,
    tier3Value: 0,
    tier3Cost: 0,
    isGluten: false,
    isSugar: false,
    isMeat: true,
    isVegetable: false,
    isAlcohol: false,
    isDrugs: false,
    isFood: true,
    isDrink: false,
    effectPercent: 0,
    projectileType: null,
    damageType: null,
    dmgModifier: 0,
    inventoryHeight: 1,
    inventoryWidth: 1,
  },
  resource2: null,
  resource3: null,
  resource4: null,
  resource5: null,
  resource6: null,
  sociality: 'Solitaria',
  diet: 'Preda viva',
  habitat: 'Foreste / Pianure',
  enemies: 'Nessuno (inventato)',
  length: 12,
  height: 5,
  weight: 8,
  walkingSpeed: 20,
  swimmingSpeed: 0,
  flyingSpeed: 0,
  contResistance: 5,
  perfResistance: 2,
  tempResistance: 10,
  chimResistance: 7,
  geneId: null,
  gene: null,
  geneSource: 'Some gene source',
  tamingDifficulty: 10,
  image: '/tyrannosaurusrex.png',
  footprint: 'idk man',
  skinPattern: 'idk',
  category: 'Carnivoro',
};

export function useFauna() {
  const [fauna, setFauna] = useState<Fauna>(defaultFauna);
  const [faunaId, setFaunaId] = useState<number>(0);

  useEffect(() => {
    setFauna(defaultFauna);
    fetch(
      `http://${BACKEND_IP}:${BACKEND_PORT}/dinosaur?id=${faunaId.toString()}`,
    )
      .then(res => res.json())
      .then(data => setFauna(data));
  }, [faunaId]);

  return { fauna, faunaId, setFaunaId };
}
