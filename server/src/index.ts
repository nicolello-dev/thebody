import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyWebsocket from "@fastify/websocket";
import { WebsocketManager } from "./ws/handler";
import { db } from "./db";
import { playersTable, baseItemsTable } from "./db/schema";
import { eq } from "drizzle-orm";
import { getDinosaurById } from "./dao/dinosaur";

const fastify = Fastify({
  logger: true,
});

fastify.register(fastifyWebsocket);
fastify.register(cors, {
  origin: true,
});

const wsManager = new WebsocketManager();

fastify.register(async function (fastify) {
  fastify.get("/ws", { websocket: true }, (connection, req) => {
    const url = new URL(req.url, "http://localhost");
    const name = url.searchParams.get("name");
    if (!name) {
      throw new Error("No name");
    }
    wsManager.add(name, connection);
    connection.send(JSON.stringify("Hello!"));
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

    const user = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.name, username));

    if (user.length === 0) {
      fastify.log.debug("User doesn't exist, creating user " + username);
      await db.insert(playersTable).values({
        name: username,
      });
    }

    return (
      await db
        .select()
        .from(playersTable)
        .where(eq(playersTable.name, username))
    )[0];
  });
});

fastify.listen({ port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
