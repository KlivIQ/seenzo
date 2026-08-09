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

// Email verification is gone, so a stuck request has no click-to-retry
// fallback — 24h (rather than the old 30d) lets a legitimate user rescan
// after fixing issues without waiting a month.
/** Allows one scan request per email address per 24 hours. */
export function getEmailRateLimiter(): Ratelimit {
  if (!emailLimiter) {
    emailLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.fixedWindow(1, "24 h"),
      prefix: "seenzo:ratelimit:email",
    });
  }
  return emailLimiter;
}

let ipLimiter: Ratelimit | undefined;

/** Allows up to 3 scan requests per IP address per day. */
export function getIpRateLimiter(): Ratelimit {
  if (!ipLimiter) {
    ipLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.fixedWindow(3, "1 d"),
      prefix: "seenzo:ratelimit:ip",
    });
  }
  return ipLimiter;
}
