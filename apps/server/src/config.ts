export const SERVER_CONFIG = {
  port: Number(process.env.PORT ?? 4242),
  host: process.env.HOST ?? "0.0.0.0",
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  battleLogLimit: 80,
  botTickMs: Number(process.env.BOT_TICK_MS ?? 1200),
};
