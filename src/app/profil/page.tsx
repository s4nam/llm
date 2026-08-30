import { redirect } from "next/navigation";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import ProfileManager from "./profile-manager";
import MyReports from "./my-reports";
import NotificationSettings from "@/components/notification-settings";

export default async function ProfilPage() {
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const supabase = await createClient();
  if (!supabase) redirect("/masuk");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  const name =
    (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "";
  const email = user.email ?? "";
  const provider = user.app_metadata?.provider as string | undefined;
  const hasPassword = user.identities?.some((i) => i.provider === "email") ?? false;

  // Sertifikat
  const { data: certs } = await supabase
    .from("certificates")
    .select("id, level_code, code, issued_at")
    .eq("user_id", user.id)
    .order("issued_at", { ascending: false });

  // Laporan masalah yang pernah dikirim user ini
  const { data: reports } = await supabase
    .from("lesson_reports")
    .select(
      "id, module, note, question_indices, status, admin_reply, created_at, resolved_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Profil</h1>
        <p className="mt-1 text-slate-600">
          Kelola akun, unduh data, atau hapus akun Anda.
        </p>

        <ProfileManager
          userId={user.id}
          name={name}
          email={email}
          provider={provider}
          hasPassword={hasPassword}
        />

        <div className="mt-6">
          <NotificationSettings />
        </div>

        {/* Laporan masalah user */}
        <MyReports reports={reports ?? []} />

        {/* Sertifikat */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Sertifikat Anda
          </h2>
          {certs && certs.length > 0 ? (
            <ul className="mt-4 flex flex-col gap-3">
              {certs.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      Level {c.level_code} 🏅
                    </p>
                    <p className="text-sm text-slate-500">
                      Diterbitkan {new Date(c.issued_at).toLocaleDateString("id-ID")}
                    </p>
                  </div>
                  <a
                    href={`/cek-sertifikat/${c.code}`}
                    className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Lihat &amp; Verifikasi
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Belum ada sertifikat. Selesaikan semua pelajaran di satu level
              dengan nilai ≥60% untuk mendapatkannya.
            </p>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
