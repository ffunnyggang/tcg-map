import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function removePaths(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  paths: string[],
) {
  const unique = [...new Set(paths.filter(Boolean))];
  for (let i = 0; i < unique.length; i += 100) {
    const { error } = await admin.storage.from(bucket).remove(unique.slice(i, i + 100));
    if (error) throw error;
  }
}

async function listUserStoragePaths(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  userId: string,
  nested: boolean,
) {
  const paths: string[] = [];
  const { data: top, error: topError } = await admin.storage
    .from(bucket)
    .list(userId, { limit: 1000 });
  if (topError) throw topError;

  for (const item of top ?? []) {
    if (item.id) {
      paths.push(`${userId}/${item.name}`);
      continue;
    }
    if (!nested) continue;

    const folder = `${userId}/${item.name}`;
    const { data: children, error: childError } = await admin.storage
      .from(bucket)
      .list(folder, { limit: 1000 });
    if (childError) throw childError;

    for (const child of children ?? []) {
      if (child.id) paths.push(`${folder}/${child.name}`);
    }
  }
  return paths;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("Authorization");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "SERVER_CONFIGURATION_ERROR" }, 500);
  }
  if (!authorization) return json({ error: "AUTH_REQUIRED" }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) return json({ error: "AUTH_REQUIRED" }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const [profilePaths, communityPaths] = await Promise.all([
      listUserStoragePaths(admin, "profile-images", user.id, false),
      listUserStoragePaths(admin, "community-posts", user.id, true),
    ]);

    await removePaths(admin, "profile-images", profilePaths);
    await removePaths(admin, "community-posts", communityPaths);

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return json({ ok: true });
  } catch (error) {
    console.error("delete-account failed", error);
    return json(
      {
        error: "ACCOUNT_DELETE_FAILED",
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});
