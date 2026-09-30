import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/config";
import { createServerSupabase } from "@/lib/supabase/server";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST() {
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabase();
    await supabase?.auth.signOut();
  }
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
