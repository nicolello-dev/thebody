import Fastify from "fastify";
import * as fastifyWebsocket from "@fastify/websocket";

const fastify = Fastify({
  logger: true,
});

fastify.register(fastifyWebsocket);

fastify.get("/", function (request, reply) {
  reply.send({ hello: "world" });
});

fastify.get("/ws", { websocket: true }, (socket, req) => {
  socket.on("message", (message) => {
    socket.send("Hello, world!");
  });
});

fastify.listen({ port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
