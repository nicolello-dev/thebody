import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyWebsocket from "@fastify/websocket";
import { WebsocketManager } from "./ws/handler";
import { db } from "./db";
import {
  playersTable,
  baseItemsTable,
  externalStorageTable,
} from "./db/schema";
import { eq } from "drizzle-orm";
import { getDinosaurById } from "./dao/dinosaur";
import { getInventoriesForUser } from "./routes/inventories";
import { registerGameMasterRoutes } from "./routes/gm";

const fastify = Fastify({
  logger: true,
});

fastify.register(fastifyWebsocket);
fastify.register(cors, {
  origin: true,
  methods: ["GET", "PUT", "POST", "DELETE", "PATCH", "OPTIONS"],
});

const wsManager = new WebsocketManager();

fastify.register(async function (fastify) {
  registerGameMasterRoutes(fastify, wsManager);

  fastify.get("/ws", { websocket: true }, (connection, req) => {
    const url = new URL(req.url, "http://localhost");
    const name = url.searchParams.get("name");
    if (!name) {
      throw new Error("No name");
    }
    wsManager.add(name, connection);
    connection.send(JSON.stringify("Hello!"));
  });

  fastify.get("/auth", async (req, res) => {
    const { name, password } = req.query as { name: string; password: string };
    console.log("Auth request for user: ", name);
    if (!name || !password) {
      res.code(400).send();
      return;
    }

    const users = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.name, name));

    if (users.length === 0 || users[0].password !== password) {
      res.code(401).send();
      return;
    }

    res.code(200).send({ isGm: !!users[0].isGm });
    return;
  });

  fastify.get("/inventories", async (req, res) => {
    const username = req.query["name"];

    console.log("Username: ", username);

    if (!username) {
      res.code(400).send();
      return;
    }

    const inventories = await getInventoriesForUser(username as string);

    res.send(JSON.stringify(inventories));
  });

  fastify.options("/inventories", async (req, res) => {
    res.code(200).send();
  });
  fastify.patch("/inventories", async (req, res) => {
    const { name } = req.query as { name: string };
    const inventories = req.body as Record<string, any[]>;

    console.log("Updating inventories for user: ", name, inventories);

    if (!name || !inventories) {
      res.code(400).send();
      return;
    }

    const users = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.name, name));

    if (users.length === 0) {
      res.code(404).send();
      return;
    }

    await db
      .update(playersTable)
      .set({ inventory: JSON.stringify(inventories["user"] || []) })
      .where(eq(playersTable.name, name));

    delete inventories["user"];

    for (const storageName of Object.keys(inventories)) {
      await db
        .update(externalStorageTable)
        .set({ inventory: JSON.stringify(inventories[storageName] || []) })
        .where(eq(externalStorageTable.label, storageName));
    }

    wsManager.sendToAll(Buffer.from("update"));
  });

  fastify.get("/dinosaur", async (req, res) => {
    const { id } = req.query as { id: string };
    console.log("Requested dinosaur with id: ", id);
    return await getDinosaurById(Number(id));
  });

  fastify.get("/baseitem", async (req, res) => {
    const { id } = req.query as { id: string };
    console.log("Requested base item with id: ", id);
    const baseItem = await db
      .select()
      .from(baseItemsTable)
      .where(eq(baseItemsTable.id, Number(id)));

    return baseItem[0];
  });

  fastify.get("/user", async (req, res) => {
    const username = req.query["name"];

    console.log("Username: ", username);

    if (!username) {
      res.code(400).send();
      return;
    }

    let users = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.name, username));

    if (users.length === 0) {
      fastify.log.debug("User doesn't exist, creating user " + username);
      await db.insert(playersTable).values({
        name: username,
        password: "changeme",
      });

      users = await db
        .select()
        .from(playersTable)
        .where(eq(playersTable.name, username));
    }

    const user = users[0];

    return {
      ...user,
      unlockedAreas: JSON.parse(user.unlockedAreas || "[]"),
    };
  });
});

fastify.listen({ port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});

setTimeout(() => {
  wsManager.sendToAll(Buffer.from("update"));
});
