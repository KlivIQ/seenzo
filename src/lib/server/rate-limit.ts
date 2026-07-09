import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { requireEnv } from "./env";

let redis: Redis | undefined;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: requireEnv("UPSTASH_REDIS_REST_URL"),
      token: requireEnv("UPSTASH_REDIS_REST_TOKEN"),
    });
  }
  return redis;
}

let emailLimiter: Ratelimit | undefined;

/** Allows one scan request per email address per 30 days. */
export function getEmailRateLimiter(): Ratelimit {
  if (!emailLimiter) {
    emailLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.fixedWindow(1, "30 d"),
      prefix: "seenzo:ratelimit:email",
    });
  }
  return emailLimiter;
}

let ipLimiter: Ratelimit | undefined;

// Raised from 3 to 10 for launch-week testing — drop back to 3 after soft launch.
/** Allows up to 10 scan requests per IP address per day. */
export function getIpRateLimiter(): Ratelimit {
  if (!ipLimiter) {
    ipLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.fixedWindow(10, "1 d"),
      prefix: "seenzo:ratelimit:ip",
    });
  }
  return ipLimiter;
}
