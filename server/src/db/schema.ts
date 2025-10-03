import { int, sqliteTable, text, real } from "drizzle-orm/sqlite-core";

export const playersTable = sqliteTable("players", {
  name: text().primaryKey(),
  password: text().notNull().default("changeme"),
  hunger: int().notNull().default(100),
  thirst: int().notNull().default(100),
  oxygen: int().notNull().default(100),
  sleep: int().notNull().default(100),
  biofeedback: int().notNull().default(100),
  temperature: int().notNull().default(20),
  isRobot: int().notNull().default(0),
  isGm: int().notNull().default(0),
  isSick: int().notNull().default(0),
  energy: int().notNull().default(100),
  /**
   * JSON array of int[2], i.e. [[1, 1], [2, 3]]
   */
  unlockedAreas: text().notNull().default("[]"),
  inventory: text().notNull().default("[]"),
});

export const externalStorageTable = sqliteTable("externalStorage", {
  id: int().primaryKey({ autoIncrement: true }),
  label: text().notNull(),
  cols: int().notNull(),
  rows: int().notNull(),
  icon: text().notNull(),
  category: text().notNull(),
  inventory: text().notNull().default("[]"),
});

export const typesTable = sqliteTable("types", {
  name: text().primaryKey(),
  icon: text().notNull(),
});

export const baseItemsTable = sqliteTable("baseItems", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  type: text()
    .references(() => typesTable.name)
    .notNull(),
  image: text().notNull(), // link (relativo) all'immagine, es. /img/items/egg
  description: text().notNull(), // Può contenere HTML
  inventoryWidth: int().notNull(),
  inventoryHeight: int().notNull(),
  tier1Value: int().default(0),
  tier1Cost: int().default(0),
  tier2Value: int().default(0),
  tier2Cost: int().default(0),
  tier3Value: int().default(0),
  tier3Cost: int().default(0),
  isGluten: int().default(0),
  isSugar: int().default(0),
  isMeat: int().default(0),
  isVegetable: int().default(0),
  isAlcohol: int().default(0),
  isDrugs: int().default(0),
  isFood: int().default(0),
  isDrink: int().default(0),
  effectPercent: int().default(0),
  projectileType: text(),
  damageType: text(),
  dmgModifier: real().default(0),
});

export const itemsTable = sqliteTable("items", {
  id: int().primaryKey({ autoIncrement: true }),
  baseItemId: int().references(() => baseItemsTable.id),
  value: int().notNull(),
  dmgModifier: real().notNull(),
});

export const recipesTable = sqliteTable("recipes", {
  id: int().primaryKey({ autoIncrement: true }),
  resultId: int()
    .references(() => baseItemsTable.id)
    .notNull(),
  ingredient1Id: int().references(() => baseItemsTable.id),
  ingredient2Id: int().references(() => baseItemsTable.id),
  ingredient3Id: int().references(() => baseItemsTable.id),
  ingredient4Id: int().references(() => baseItemsTable.id),
  ingredient5Id: int().references(() => baseItemsTable.id),
  ingredient6Id: int().references(() => baseItemsTable.id),
});

const entity = {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  scientificName: text().notNull(),
  order: text().notNull(),
  family: text().notNull(),
  genus: text().notNull(),
  description: text().notNull(),
  resource1: int().references(() => baseItemsTable.id),
  resource2: int().references(() => baseItemsTable.id),
  resource3: int().references(() => baseItemsTable.id),
  resource4: int().references(() => baseItemsTable.id),
  resource5: int().references(() => baseItemsTable.id),
  resource6: int().references(() => baseItemsTable.id),
};

export const genesTable = sqliteTable("genes", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  // URL relativo, tipo /img/genes/t-rex.png
  image: text().notNull(),
  effect: text().notNull(),
  extractProbability: int().notNull(),
  combineProbability: int().notNull(),
});

export const dinosaursTable = sqliteTable("dinosaurs", {
  ...entity,
  sociality: text().notNull(),
  diet: text().notNull(),
  habitat: text().notNull(),
  enemies: text().notNull(),
  length: int().notNull(),
  height: int().notNull(),
  weight: int().notNull(),
  walkingSpeed: int().notNull(),
  swimmingSpeed: int().notNull(),
  flyingSpeed: int().notNull(),
  contResistance: int().notNull(),
  perfResistance: int().notNull(),
  tempResistance: int().notNull(),
  chimResistance: int().notNull(),
  geneId: int().references(() => genesTable.id),
  geneSource: text(),
  tamingDifficulty: int().notNull(),
  image: text().notNull(),
  footprint: text().notNull(),
  skinPattern: text().notNull(),
  category: text()
    .references(() => typesTable.name)
    .notNull(),
});

export const plantsTable = sqliteTable("plants", {
  ...entity,
  seedType: text().notNull(),
  waterNeeds: text().notNull(),
  climateNeeds: text().notNull(),
  oxygenNeeds: text().notNull(),
});
