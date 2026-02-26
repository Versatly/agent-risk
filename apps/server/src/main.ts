import { SERVER_CONFIG } from "./config.js";
import { createServerApp } from "./app.js";

const runtime = await createServerApp(SERVER_CONFIG.botTickMs);
const { app, io } = runtime;
const address = await app.listen({
  host: SERVER_CONFIG.host,
  port: SERVER_CONFIG.port,
});

app.log.info({ address }, "Risk server started");

process.on("SIGINT", async () => {
  await runtime.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await runtime.close();
  process.exit(0);
});
