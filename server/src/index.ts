import Fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import { WebsocketManager } from "./ws/handler";
import { db } from "./db";
import { playersTable } from "./db/schema";
import { eq } from "drizzle-orm";

const fastify = Fastify({
  logger: true,
});

fastify.register(fastifyWebsocket);

fastify.get("/", function (request, reply) {
  reply.send({ hello: "world" });
});

const wsManager = new WebsocketManager();

fastify.get("/ws", { websocket: true }, (socket, req) => {
  if (typeof req.query !== "string") {
    throw new Error("Request query malformed");
  }
  const query = new URLSearchParams(req.query as string);

  if (!query.get("name")) {
    throw new Error("Name required!");
  }

  wsManager.add(query.get("name"), socket);
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
    await db.select().from(playersTable).where(eq(playersTable.name, username))
  )[0];
});

fastify.listen({ port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});

setInterval(() => {
  wsManager.sendToAll(Buffer.from("update"));
});
