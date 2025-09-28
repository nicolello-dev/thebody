import { eq } from "drizzle-orm";
import { db } from "../db";
import { baseItemsTable, dinosaursTable } from "../db/schema";

export async function getDinosaurById(id: number) {
  const rawDinosaur = await db
    .select()
    .from(dinosaursTable)
    .where(eq(dinosaursTable.id, id));

  const dinosaur: any = rawDinosaur[0];

  if (dinosaur.resource1 !== null) {
    dinosaur.resource1 = (
      await db
        .select()
        .from(baseItemsTable)
        .where(eq(baseItemsTable.id, dinosaur.resource1))
    )[0];
  }

  if (dinosaur.resource2 !== null) {
    dinosaur.resource2 = (
      await db
        .select()
        .from(baseItemsTable)
        .where(eq(baseItemsTable.id, dinosaur.resource2))
    )[0];
  }

  if (dinosaur.resource3 !== null) {
    dinosaur.resource3 = (
      await db
        .select()
        .from(baseItemsTable)
        .where(eq(baseItemsTable.id, dinosaur.resource3))
    )[0];
  }

  if (dinosaur.resource4 !== null) {
    dinosaur.resource4 = (
      await db
        .select()
        .from(baseItemsTable)
        .where(eq(baseItemsTable.id, dinosaur.resource4))
    )[0];
  }

  if (dinosaur.resource5 !== null) {
    dinosaur.resource5 = (
      await db
        .select()
        .from(baseItemsTable)
        .where(eq(baseItemsTable.id, dinosaur.resource5))
    )[0];
  }

  if (dinosaur.resource6 !== null) {
    dinosaur.resource6 = (
      await db
        .select()
        .from(baseItemsTable)
        .where(eq(baseItemsTable.id, dinosaur.resource6))
    )[0];
  }

  return dinosaur;
}
