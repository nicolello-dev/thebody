import { int, sqliteTable, text, real } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("users", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  password: text().notNull(),
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
  tier1Value: int().default(0),
  tier1Cost: int().default(0),
  tier2Value: int().default(0),
  tier2Cost: int().default(0),
  tier3Value: int().default(0),
  tier3Cost: int().default(0),
  isGluten: int().default(0),
  isSugar: int().default(0),
  isRedMeat: int().default(0),
  isAlcohol: int().default(0),
  isDrug: int().default(0),
  dmgModifier: real().default(0),
  inventoryHeight: int().notNull(),
  inventoryWidth: int().notNull(),
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
