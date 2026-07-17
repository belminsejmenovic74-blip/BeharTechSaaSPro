import "server-only";

import { createClerkClient } from "@clerk/backend";

let cachedClient: ReturnType<typeof createClerkClient> | null = null;

export function getClerkAdmin() {
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!secretKey) return null;
  cachedClient ??= createClerkClient({ secretKey });
  return cachedClient;
}
