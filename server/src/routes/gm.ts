import { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";

import { db } from "../db";
import {
  baseItemsTable,
  playersTable,
} from "../db/schema";
import { WebsocketManager } from "../ws/handler";

type PlayerRow = typeof playersTable.$inferSelect;
type BaseItemRow = typeof baseItemsTable.$inferSelect;

type InventoryItem = {
  id: string;
  name: string;
  icon: string;
  image?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind?: string;
  description?: string;
  tier?: number;
  isGluten?: boolean;
  isSugar?: boolean;
  isMeat?: boolean;
  isVegetable?: boolean;
  isAlcohol?: boolean;
  isDrugs?: boolean;
  isFood?: boolean;
  isDrink?: boolean;
  effectPercent?: number;
  projectiles?: string | null;
  damageType?: string | null;
  dmgModifier?: number;
};

const GRID_COLS = 10;
const GRID_ROWS = 7;

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

const parseInventory = (raw: string | null | undefined): InventoryItem[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as InventoryItem[];
  } catch (err) {
    console.warn("Failed to parse inventory", err);
  }
  return [];
};

const serializeInventory = (items: InventoryItem[]) => JSON.stringify(items ?? []);

function hasOverlap(
  items: InventoryItem[],
  x: number,
  y: number,
  w: number,
  h: number,
) {
  return items.some(item => {
    if (item.x === undefined || item.y === undefined) return false;
    const horizontal = x < item.x + item.w && x + w > item.x;
    const vertical = y < item.y + item.h && y + h > item.y;
    return horizontal && vertical;
  });
}

function findPlacement(items: InventoryItem[], w: number, h: number) {
  for (let yy = 0; yy <= GRID_ROWS - h; yy += 1) {
    for (let xx = 0; xx <= GRID_COLS - w; xx += 1) {
      if (!hasOverlap(items, xx, yy, w, h)) {
        return { x: xx, y: yy };
      }
    }
  }
  return null;
}

async function requireGm(name: string) {
  const result = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.name, name));

  if (!result.length || !result[0].isGm) {
    const error = new Error("Forbidden");
    (error as any).statusCode = 403;
    throw error;
  }

  return result[0];
}

async function getTargets(target: string | undefined) {
  if (!target) {
    const error = new Error("Missing target");
    (error as any).statusCode = 400;
    throw error;
  }

  if (target.toLowerCase() === "all") {
    return db.select().from(playersTable);
  }

  const players = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.name, target));
  if (!players.length) {
    const error = new Error("Player not found");
    (error as any).statusCode = 404;
    throw error;
  }
  return players;
}

async function updatePlayer(player: PlayerRow, values: Partial<PlayerRow>) {
  await db
    .update(playersTable)
    .set(values)
    .where(eq(playersTable.name, player.name));
}

async function giveItemToPlayer(
  player: PlayerRow,
  item: BaseItemRow,
  amount: number,
) {
  const inventory = parseInventory(player.inventory);

  const placement = findPlacement(
    inventory,
    item.inventoryWidth ?? 1,
    item.inventoryHeight ?? 1,
  );

  if (!placement) {
    const error = new Error(`Inventario pieno per ${player.name}`);
    (error as any).statusCode = 409;
    throw error;
  }

  const now = Date.now();
  const entries: InventoryItem[] = [];
  for (let i = 0; i < amount; i += 1) {
    const nextPlacement =
      i === 0
        ? placement
        : findPlacement(
            [...inventory, ...entries],
            item.inventoryWidth ?? 1,
            item.inventoryHeight ?? 1,
          );

    if (!nextPlacement) break;

    entries.push({
      id: `${item.id}-${now}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      name: item.name,
      icon: item.image,
      image: item.image,
      x: nextPlacement.x,
      y: nextPlacement.y,
      w: item.inventoryWidth ?? 1,
      h: item.inventoryHeight ?? 1,
      kind: item.type ?? undefined,
      description: item.description,
      tier: 1,
      isGluten: !!item.isGluten,
      isSugar: !!item.isSugar,
      isMeat: !!item.isMeat,
      isVegetable: !!item.isVegetable,
      isAlcohol: !!item.isAlcohol,
      isDrugs: !!item.isDrugs,
      isFood: !!item.isFood,
      isDrink: !!item.isDrink,
      effectPercent: item.effectPercent ?? undefined,
      projectiles: item.projectileType ?? null,
      damageType: item.damageType ?? null,
      dmgModifier: item.dmgModifier ?? undefined,
    });
  }

  if (!entries.length) {
    const error = new Error(`Impossibile posizionare l'oggetto in ${player.name}`);
    (error as any).statusCode = 409;
    throw error;
  }

  const updated = [...inventory, ...entries];

  await db
    .update(playersTable)
    .set({ inventory: serializeInventory(updated) })
    .where(eq(playersTable.name, player.name));

  return entries.length;
}

type CommandResult = { message: string };

async function handleCommand(
  gm: PlayerRow,
  command: string,
): Promise<CommandResult> {
  const tokens = command.trim().split(/\s+/);
  if (!tokens.length || !tokens[0]) {
    throw Object.assign(new Error("Comando non valido"), { statusCode: 400 });
  }

  const verb = tokens[0].toLowerCase();

  const amountArg = tokens[2] ? Number(tokens[2]) : undefined;

  const ensureAmount = () => {
    if (Number.isNaN(amountArg!)) {
      throw Object.assign(new Error("Valore numerico non valido"), {
        statusCode: 400,
      });
    }
    return amountArg!;
  };

  const target = tokens[1];

  switch (verb) {
    case "_dmg": {
      const amt = ensureAmount();
      const targets = await getTargets(target);
      for (const player of targets) {
        await updatePlayer(player, {
          biofeedback: clamp((player.biofeedback ?? 0) - amt),
        });
      }
      return { message: `Inflitti ${amt} danni a ${target}` };
    }
    case "_heal": {
      const amt = ensureAmount();
      const targets = await getTargets(target);
      for (const player of targets) {
        await updatePlayer(player, {
          biofeedback: clamp((player.biofeedback ?? 0) + amt),
        });
      }
      return { message: `Cura di ${amt} punti eseguita per ${target}` };
    }
    case "_f": {
      const amt = ensureAmount();
      const targets = await getTargets(target);
      for (const player of targets) {
        await updatePlayer(player, {
          hunger: clamp((player.hunger ?? 0) + amt),
        });
      }
      return { message: `Fame modificata di ${amt} per ${target}` };
    }
    case "_s": {
      const amt = ensureAmount();
      const targets = await getTargets(target);
      for (const player of targets) {
        await updatePlayer(player, {
          thirst: clamp((player.thirst ?? 0) + amt),
        });
      }
      return { message: `Sete modificata di ${amt} per ${target}` };
    }
    case "_so": {
      const amt = ensureAmount();
      const targets = await getTargets(target);
      for (const player of targets) {
        await updatePlayer(player, {
          sleep: clamp((player.sleep ?? 0) + amt),
        });
      }
      return { message: `Sonno modificato di ${amt} per ${target}` };
    }
    case "_e": {
      const amt = ensureAmount();
      const targets = await getTargets(target);
      for (const player of targets) {
        await updatePlayer(player, {
          energy: clamp((player.energy ?? 0) + amt),
        });
      }
      return { message: `Energia modificata di ${amt} per ${target}` };
    }
    case "_quickstrangle": {
      const targets = await getTargets(target);
      for (const player of targets) {
        await updatePlayer(player, { oxygen: clamp(0) });
      }
      return { message: `Ossigeno azzerato rapidamente per ${target}` };
    }
    case "_slowstrangle": {
      const targets = await getTargets(target);
      for (const player of targets) {
        const newOxygen = clamp((player.oxygen ?? 0) - 50);
        await updatePlayer(player, { oxygen: newOxygen });
      }
      return { message: `Ossigeno ridotto lentamente per ${target}` };
    }
    case "ill": {
      const targets = await getTargets(target);
      for (const player of targets) {
        await updatePlayer(player, { isSick: 1 });
      }
      return { message: `${target} ammalato` };
    }
    case "fix": {
      const targets = await getTargets(target);
      for (const player of targets) {
        await updatePlayer(player, { isSick: 0 });
      }
      return { message: `${target} curato` };
    }
    case "give": {
      const amount = tokens[3] ? Number(tokens[3]) : 1;
      if (Number.isNaN(amount) || amount <= 0) {
        throw Object.assign(new Error("Quantità non valida"), {
          statusCode: 400,
        });
      }
      if (!target || !tokens[2]) {
        throw Object.assign(new Error("Sintassi give [player] [item]"), {
          statusCode: 400,
        });
      }
      const players = await getTargets(target);
      const itemName = tokens[2];
      const baseItems = await db
        .select()
        .from(baseItemsTable)
        .where(eq(baseItemsTable.name, itemName));

      if (!baseItems.length) {
        throw Object.assign(new Error(`Item ${itemName} non trovato`), {
          statusCode: 404,
        });
      }

      const granted = [] as Array<{ name: string; count: number }>;
      for (const player of players) {
        const count = await giveItemToPlayer(player, baseItems[0], amount || 1);
        granted.push({ name: player.name, count });
      }

      const message = granted
        .map(entry => `${entry.count}x ${itemName} a ${entry.name}`)
        .join(", ");
      return { message: message || "Nessun oggetto consegnato" };
    }
    case "sack": {
      const players = await getTargets(target);
      for (const player of players) {
        await updatePlayer(player, { inventory: serializeInventory([]) });
      }
      return { message: `Inventario svuotato per ${target}` };
    }
    case "_newday": {
      const players = await db.select().from(playersTable);
      for (const player of players) {
        if (player.isRobot) {
          await updatePlayer(player, {
            energy: clamp((player.energy ?? 0) - 25),
          });
        } else {
          const next: Partial<PlayerRow> = {
            hunger: clamp((player.hunger ?? 0) - 25),
            thirst: clamp((player.thirst ?? 0) - 25),
            sleep: clamp((player.sleep ?? 0) - 25),
          };
          if (!player.isSick) {
            next.biofeedback = 100;
          }
          await updatePlayer(player, next);
        }
      }
      return { message: "Nuovo giorno applicato" };
    }
    default:
      throw Object.assign(new Error(`Comando sconosciuto: ${verb}`), {
        statusCode: 400,
      });
  }
}

export function registerGameMasterRoutes(
  fastify: FastifyInstance,
  wsManager: WebsocketManager,
) {
  fastify.get("/gm/state", async (req, res) => {
    const name = (req.query as { name?: string }).name;
    if (!name) {
      res.code(400).send({ error: "Missing name" });
      return;
    }

    await requireGm(name);

    const players = await db.select().from(playersTable);

    const payload = players.map(player => ({
      name: player.name,
      hunger: player.hunger,
      thirst: player.thirst,
      sleep: player.sleep,
      oxygen: player.oxygen,
      energy: player.energy,
      biofeedback: player.biofeedback,
      temperature: player.temperature,
      isRobot: player.isRobot,
      isSick: player.isSick,
      inventory: parseInventory(player.inventory),
    }));

    res.send({ players: payload });
  });

  fastify.post("/gm/command", async (req, res) => {
    const body = req.body as { name?: string; command?: string };
    if (!body?.name || !body?.command) {
      res.code(400).send({ error: "Parametri mancanti" });
      return;
    }

    const gm = await requireGm(body.name);

    try {
      const result = await handleCommand(gm, body.command);
      wsManager.sendToAll(Buffer.from("update"));
      res.send({ ok: true, message: result.message });
    } catch (err) {
      const status = (err as any).statusCode ?? 500;
      res.code(status).send({ error: (err as Error).message });
    }
  });

  fastify.post("/gm/transfer", async (req, res) => {
    const body = req.body as { name?: string; from?: string; itemId?: string };
    if (!body?.name || !body?.from || !body?.itemId) {
      res.code(400).send({ error: "Parametri mancanti" });
      return;
    }

    const gm = await requireGm(body.name);

    const [fromPlayer] = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.name, body.from));
    if (!fromPlayer) {
      res.code(404).send({ error: "Giocatore sorgente non trovato" });
      return;
    }

    const [gmPlayer] = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.name, gm.name));

    const sourceInventory = parseInventory(fromPlayer.inventory);
    const itemIndex = sourceInventory.findIndex(item => item.id === body.itemId);
    if (itemIndex === -1) {
      res.code(404).send({ error: "Item non trovato" });
      return;
    }

    const item = sourceInventory[itemIndex];
    const updatedSource = [...sourceInventory];
    updatedSource.splice(itemIndex, 1);

    const gmInventory = parseInventory(gmPlayer.inventory);
    const placement = findPlacement(gmInventory, item.w ?? 1, item.h ?? 1);
    if (!placement) {
      res.code(409).send({ error: "Inventario GM pieno" });
      return;
    }

    const movedItem = { ...item, x: placement.x, y: placement.y };

    await db
      .update(playersTable)
      .set({ inventory: serializeInventory(updatedSource) })
      .where(eq(playersTable.name, fromPlayer.name));

    await db
      .update(playersTable)
      .set({
        inventory: serializeInventory([...gmInventory, movedItem]),
      })
      .where(eq(playersTable.name, gmPlayer.name));

    wsManager.sendToAll(Buffer.from("update"));

    res.send({ ok: true, message: `Item trasferito da ${fromPlayer.name}` });
  });
}
