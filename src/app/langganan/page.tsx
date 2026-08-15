import { redirect } from "next/navigation";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getClientKey, isMidtransConfigured } from "@/lib/midtrans";
import { computeAccess } from "@/lib/access";
import SubscriptionManager from "./subscription-manager";

export default async function LanggananPage() {
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const supabase = await createClient();
  if (!supabase) redirect("/masuk");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  const { data: pricingRaw } = await supabase.rpc("get_pricing");
  const pricing = Array.isArray(pricingRaw) ? pricingRaw[0] : pricingRaw;
  const monthly = pricing?.monthly_price ?? 49000;
  const yearly = pricing?.yearly_price ?? 490000;

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("is_member, member_expires_at, trial_used, trial_expires_at, trial_started_at")
    .eq("id", user.id)
    .single();
  const profile = profileRaw;

  const access = computeAccess(profile);
  const trialEndsAt = profile?.trial_expires_at ? new Date(profile.trial_expires_at) : null;
  const memberEndsAt = profile?.member_expires_at ? new Date(profile.member_expires_at) : null;

  // Kupon aktif
  const { data: coupons } = await supabase
    .from("coupons")
    .select("code, discount_type, discount_value")
    .eq("active", true);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-bold text-slate-900">Langganan</h1>
        <p className="mt-2 text-slate-600">
          Buka semua level, pelajaran, dan sertifikat dengan satu langganan.
          Tanpa kontrak — bayar saat ingin lanjut.
        </p>

        {/* Status saat ini */}
        {access.isMember && memberEndsAt ? (
          <div className="mt-6 rounded-2xl border-2 border-success bg-success/5 p-6">
            <h2 className="text-lg font-semibold text-success">
              ✓ Anda member aktif
            </h2>
            <p className="mt-1 text-slate-600">
              Langganan berlaku sampai{" "}
              <b>
                {memberEndsAt.toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </b>
              . Perpanjang sebelum tanggal tersebut agar tidak terputus.
            </p>
          </div>
        ) : access.trialActive && trialEndsAt ? (
          <div className="mt-6 rounded-2xl border-2 border-brand bg-brand-light/30 p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              ⏳ Anda sedang dalam masa trial
            </h2>
            <p className="mt-1 text-slate-600">
              Trial berakhir{" "}
              <b>
                {trialEndsAt.toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </b>
              . Lanjutkan berlangganan untuk akses tanpa putus.
            </p>
          </div>
        ) : profile?.trial_used ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Trial sudah berakhir
            </h2>
            <p className="mt-1 text-slate-600">
              Berlangganan sekarang untuk membuka kembali akses penuh.
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border-2 border-brand bg-brand-light/30 p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              🎁 Coba dulu: trial 3 hari
            </h2>
            <p className="mt-1 text-slate-600">
              Aktifkan trial 3 hari akses penuh — tanpa kartu. Hanya sekali
              per orang. Nilai trial mulai saat Anda mengkliknya.
            </p>
          </div>
        )}

        <SubscriptionManager
          monthly={monthly}
          yearly={yearly}
          midtransClientKey={getClientKey()}
          midtransReady={isMidtransConfigured()}
          isMember={access.isMember}
          trialAvailable={!profile?.trial_used}
          coupons={coupons ?? []}
        />
      </main>
      <Footer />
    </>
  );
}
