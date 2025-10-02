import { db } from "../db";
import { externalStorageTable, playersTable } from "../db/schema";
import { eq } from "drizzle-orm";

export async function getInventoriesForUser(username: string) {
  const users = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.name, username));

  if (users.length === 0) {
    throw new Error("User not found");
  }

  const externalStorages = await db.select().from(externalStorageTable);

  const inventories = {
    user: JSON.parse(users[0].inventory || "[]"),
    others: [],
  };

  externalStorages.forEach((storage) => {
    inventories.others.push({
      ...storage,
      inventory: JSON.parse(storage.inventory || "[]"),
    });
  });

  return inventories;
}
