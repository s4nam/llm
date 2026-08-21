import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { computeAccess, type AccessStatus } from "@/lib/access";
import type { ProfileRow } from "@/lib/types";

export interface AccessResult {
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>;
  userId: string;
  profile: ProfileRow | null;
  access: AccessStatus;
  hasAccess: boolean;
}

/**
 * Helper akses server-side — satu titik kontrol untuk semua rute berbayar/TOEFL.
 * Mengembalikan hasil akses + client Supabase. Caller yang memutuskan respon
 * (403 dst.). Return `null` jika Supabase tidak dikonfigurasi atau belum login.
 */
export async function requireAccess(): Promise<AccessResult | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_member, member_expires_at, trial_expires_at")
    .eq("id", user.id)
    .maybeSingle();

  const typedProfile = profile as Pick<
    ProfileRow,
    "is_member" | "member_expires_at" | "trial_expires_at"
  > | null;

  const access = computeAccess(typedProfile);

  return {
    supabase,
    userId: user.id,
    profile: typedProfile as ProfileRow | null,
    access,
    hasAccess: access.hasAccess,
  };
}