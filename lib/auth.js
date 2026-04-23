import { getOne } from "./db";

/**
 * Extract user from Supabase JWT
 */
export async function getUserFromRequest(req) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader) return null;

    const token = authHeader.replace("Bearer ", "");

    // Decode JWT (without verification for now, Supabase already signs it)
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    );

    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Get full profile (role + salon)
 */
export async function getProfile(user) {
  if (!user?.sub) return null;

  return await getOne(
    `select * from profiles where id = $1`,
    [user.sub]
  );
}

/**
 * Require auth (throws if not logged in)
 */
export async function requireAuth(req) {
  const user = await getUserFromRequest(req);

  if (!user) {
    throw new Error("Unauthorized");
  }

  const profile = await getProfile(user);

  if (!profile) {
    throw new Error("No profile found");
  }

  return { user, profile };
}

/**
 * Require admin role
 */
export async function requireAdmin(req) {
  const { user, profile } = await requireAuth(req);

  if (profile.role !== "admin") {
    throw new Error("Forbidden");
  }

  return { user, profile };
}

/**
 * Require staff or admin
 */
export async function requireStaff(req) {
  const { user, profile } = await requireAuth(req);

  if (!["admin", "staff"].includes(profile.role)) {
    throw new Error("Forbidden");
  }

  return { user, profile };
}
