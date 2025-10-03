// InventoryContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  PropsWithChildren,
} from 'react';

/** ------ Types (delete if you already export them from your app) ------ */
export type OtherKey =
  | 'cassa_a'
  | 'cassa_b'
  | 'cassa_demolecolatore'
  | 'zaino_g1'
  | 'zaino_g4';

export type ContainerKey = 'zaino' | 'grid5x5' | OtherKey;

export type ItemKind = 'alimento' | 'risorsa' | 'arma';
export type DamageType = 'contundente' | 'chimico' | 'termico' | 'perforante';

type BaseMeta = { description: string; kind: ItemKind; tier?: 1 | 2 | 3 };
type FoodMeta = BaseMeta & {
  kind: 'alimento';
  isGluten?: boolean;
  isSugar?: boolean;
  isMeat?: boolean;
  isVegetable?: boolean;
  isAlcohol?: boolean;
  isDrugs?: boolean;
  isFood?: boolean;
  isDrink?: boolean;
  effectPercent?: number;
};
type WeaponMeta = BaseMeta & {
  kind: 'arma';
  danno?: number;
  projectiles?: string;
  damageType?: DamageType;
};
type ResourceMeta = BaseMeta & { kind: 'risorsa' };

export type Item = {
  id: string;
  name: string;
  icon: string;
  image?: string;
  x: number;
  y: number;
  w: number;
  h: number;
} & (FoodMeta | WeaponMeta | ResourceMeta);

/** ------ Context shape ------ */
type InventoryContextValue = {
  // three buckets
  userInv: Item[];
  others: Record<OtherKey, Item[]>;
  grid5: Item[]; // client-only

  // setters if you need raw access
  setUserInv: React.Dispatch<React.SetStateAction<Item[]>>;
  setOthers: React.Dispatch<React.SetStateAction<Record<OtherKey, Item[]>>>;
  setGrid5: React.Dispatch<React.SetStateAction<Item[]>>;

  // helpers
  upsertItem: (key: ContainerKey, item: Item) => void;
  removeItem: (key: ContainerKey, itemId: string) => void;
  moveItem: (
    from: ContainerKey,
    to: ContainerKey,
    itemId: string,
    nextPos?: { x?: number; y?: number },
  ) => void;
  clearGrid5: () => void;
};

const Ctx = createContext<InventoryContextValue | null>(null);

export const useInventories = () => {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error('useInventories must be used within <InventoryProvider>');
  return ctx;
};

/** ------ Provider ------ */
type ProviderProps = PropsWithChildren<{
  initialUser: Item[];
  initialOthers: Record<OtherKey, Item[]>;
  /** grid5 is always empty by default; override only if you need to prefill on client */
  initialGrid5?: Item[];
}>;

export function InventoryProvider({
  initialUser,
  initialOthers,
  initialGrid5 = [],
  children,
}: ProviderProps) {
  const [userInv, setUserInv] = useState<Item[]>(initialUser);
  const [others, setOthers] = useState<Record<OtherKey, Item[]>>(initialOthers);
  const [grid5, setGrid5] = useState<Item[]>(initialGrid5);

  // internal helpers to read/write by key
  const listFor = useCallback(
    (key: ContainerKey): Item[] => {
      if (key === 'zaino') return userInv;
      if (key === 'grid5x5') return grid5;
      return others[key] ?? [];
    },
    [userInv, grid5, others],
  );

  const writeFor = useCallback((key: ContainerKey, next: Item[]) => {
    if (key === 'zaino') setUserInv(next);
    else if (key === 'grid5x5') setGrid5(next);
    else setOthers(prev => ({ ...prev, [key]: next }));
  }, []);

  const upsertItem = useCallback(
    (key: ContainerKey, item: Item) => {
      const list = listFor(key);
      const idx = list.findIndex(i => i.id === item.id);
      const next =
        idx === -1
          ? [...list, item]
          : [
              ...list.slice(0, idx),
              { ...list[idx], ...item },
              ...list.slice(idx + 1),
            ];
      writeFor(key, next);
    },
    [listFor, writeFor],
  );

  const removeItem = useCallback(
    (key: ContainerKey, itemId: string) => {
      const list = listFor(key);
      writeFor(
        key,
        list.filter(i => i.id !== itemId),
      );
    },
    [listFor, writeFor],
  );

  const moveItem = useCallback(
    (
      from: ContainerKey,
      to: ContainerKey,
      itemId: string,
      nextPos?: { x?: number; y?: number },
    ) => {
      if (from === to && !nextPos) return;

      const fromList = listFor(from);
      const toList = listFor(to);
      const item = fromList.find(i => i.id === itemId);
      if (!item) return;

      const updated: Item = {
        ...item,
        x: nextPos?.x ?? item.x,
        y: nextPos?.y ?? item.y,
      };

      writeFor(
        from,
        fromList.filter(i => i.id !== itemId),
      );
      writeFor(to, [...toList, updated]);
    },
    [listFor, writeFor],
  );

  const clearGrid5 = useCallback(() => setGrid5([]), []);

  const value = useMemo<InventoryContextValue>(
    () => ({
      userInv,
      others,
      grid5,
      setUserInv,
      setOthers,
      setGrid5,
      upsertItem,
      removeItem,
      moveItem,
      clearGrid5,
    }),
    [userInv, others, grid5, upsertItem, removeItem, moveItem, clearGrid5],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
