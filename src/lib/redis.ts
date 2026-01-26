import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function getRedisClient() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error("REDIS_URL environment variable is not set");
  }

  return new Redis(redisUrl);
}

export const redis = globalForRedis.redis ?? getRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
