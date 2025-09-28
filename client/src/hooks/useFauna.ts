import { useEffect, useState } from 'react';
import { BACKEND_IP, BACKEND_PORT } from '../common';

export type Fauna = {
  id: number;
  name: string;
  scientificName: string;
  order: string;
  family: string;
  genus: string;
  description: string;
  resource1: number;
  resource2: number;
  resource3: number;
  resource4: number;
  resource5: number;
  resource6: number;
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
  geneId: number;
  geneSource?: string;
  tamingDifficulty: number;
  image: string;
  footprint: string;
  skinPattern: string;
  category: string;
};

export function useFauna(id: number): Fauna | null {
  const [fauna, setFauna] = useState<Fauna | null>(null);

  fetch(`http://${BACKEND_IP}:${BACKEND_PORT}/fauna?id=${id.toString()}`)
    .then(res => res.json())
    .then(data => setFauna(data));

  return fauna;
}
