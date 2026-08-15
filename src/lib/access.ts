import type { ProfileRow } from "@/lib/types";

export interface AccessStatus {
  isMember: boolean;
  trialActive: boolean;
  hasAccess: boolean;
}

/**
 * Hitung status akses dari data profil.
 * - Member aktif (belum lewat member_expires_at) → akses penuh.
 * - Trial aktif → akses penuh.
 * - Selain itu → tidak punya akses (kecuali pelajaran gratis).
 */
export function computeAccess(profile: Pick<ProfileRow, "is_member" | "member_expires_at" | "trial_expires_at"> | null): AccessStatus {
  const now = Date.now();
  const isMember =
    profile?.is_member === true &&
    profile.member_expires_at &&
    new Date(profile.member_expires_at).getTime() > now;

  const trialActive =
    profile?.trial_expires_at != null &&
    new Date(profile.trial_expires_at).getTime() > now;

  return {
    isMember: Boolean(isMember),
    trialActive,
    hasAccess: Boolean(isMember || trialActive),
  };
}
