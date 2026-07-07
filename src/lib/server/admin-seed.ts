/**
 * One-time script to create the single Seenzo admin user in Supabase Auth.
 * Run manually — never imported by the app itself:
 *
 *   bun run seed:admin
 */
import { getSupabaseServer } from "@/lib/supabase";

import { requireEnv } from "./env";

async function seedAdmin(): Promise<void> {
  const email = requireEnv("ADMIN_EMAIL");
  const password = requireEnv("ADMIN_PASSWORD");

  const supabase = getSupabaseServer();
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    if (error.code === "email_exists" || error.code === "user_already_exists") {
      console.log("Already exists");
      return;
    }
    throw new Error(`Failed to create admin user: ${error.message}`);
  }

  console.log("Admin user created");
}

seedAdmin().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
