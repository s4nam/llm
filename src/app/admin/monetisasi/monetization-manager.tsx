"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Pricing {
  monthly_price: number;
  yearly_price: number;
  trial_hours: number;
  trial_grace_hours: number;
}

interface Member {
  id: string;
  email: string;
  full_name: string;
  is_member: boolean;
  member_expires_at: string | null;
  trial_used: boolean;
  trial_expires_at: string | null;
  created_at: string;
}

interface Coupon {
  code: string;
  discount_type: "percent" | "nominal";
  discount_value: number;
  max_uses: number;
  active: boolean;
  expires_at: string | null;
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-brand";

export default function MonetizationManager({
  pricing,
  members,
  coupons: initialCoupons,
}: {
  pricing: Pricing;
  members: Member[];
  coupons: Coupon[];
}) {
  const router = useRouter();
  const [monthly, setMonthly] = useState(pricing?.monthly_price ?? 49000);
  const [yearly, setYearly] = useState(pricing?.yearly_price ?? 490000);
  const [trialHours, setTrialHours] = useState(pricing?.trial_hours ?? 168);
  const [graceHours] = useState(pricing?.trial_grace_hours ?? 0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [memberMsg, setMemberMsg] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);
  const [couponForm, setCouponForm] = useState({
    code: "",
    type: "percent" as "percent" | "nominal",
    value: 10,
    maxUses: 1,
    expiresAt: "",
  });

  async function savePricing() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/monetization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-pricing",
          monthly,
          yearly,
          trialHours,
          graceHours,
        }),
      });
      const data = await res.json();
      setMsg(data.error ? `Gagal: ${data.error}` : "Harga disimpan.");
    } catch {
      setMsg("Gagal: tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  }

  async function addCoupon() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/monetization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-coupon",
          code: couponForm.code,
          type: couponForm.type,
          value: couponForm.value,
          maxUses: couponForm.maxUses,
          expiresAt: couponForm.expiresAt || null,
        }),
      });
      const data = await res.json();
      setSaving(false);
      if (data.error) {
        setMsg(`Gagal: ${data.error}`);
      } else {
        setMsg("Kupon dibuat.");
        setCouponForm({ code: "", type: "percent", value: 10, maxUses: 1, expiresAt: "" });
        const r = await fetch("/api/admin/monetization?action=list-coupons");
        const d = await r.json();
        if (d.coupons) setCoupons(d.coupons);
      }
    } catch {
      setSaving(false);
      setMsg("Gagal: tidak dapat terhubung ke server.");
    }
  }

  async function toggleCoupon(code: string, active: boolean) {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/monetization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-coupon", code, active }),
      });
      const data = await res.json();
      setSaving(false);
      if (data.error) {
        setMsg(`Gagal: ${data.error}`);
        return;
      }
      setMsg(active ? "Kupon diaktifkan." : "Kupon dinonaktifkan.");
      const r = await fetch("/api/admin/monetization?action=list-coupons");
      const d = await r.json();
      if (d.coupons) setCoupons(d.coupons);
    } catch {
      setSaving(false);
      setMsg("Gagal: tidak dapat terhubung ke server.");
    }
  }

  /** Kirim aksi admin member; beri pesan dekat tabel & segarkan daftar. */
  async function runMemberAction(
    body: Record<string, unknown>,
    successMsg: string,
  ): Promise<boolean> {
    setSaving(true);
    setMemberMsg(null);
    try {
      const res = await fetch("/api/admin/monetization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setMemberMsg(data.error ? `Gagal: ${data.error}` : `Gagal (kode ${res.status}).`);
        return false;
      }
      setMemberMsg(successMsg);
      // Segarkan ulang data member dari server (badge status langsung ter-update)
      router.refresh();
      return true;
    } catch {
      setMemberMsg("Gagal: tidak dapat terhubung ke server.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function setMember(m: Member, days: number) {
    const label = m.full_name || m.email || "user ini";
    if (!window.confirm(`Jadikan ${label} member selama ${days} hari?`)) return;
    void runMemberAction(
      { action: "set-member", userId: m.id, days, note: "Manual admin" },
      "Status member diperbarui.",
    );
  }

  function resetTrial(m: Member) {
    const label = m.full_name || m.email || "user ini";
    if (!window.confirm(`Beri ${label} kesempatan trial lagi?`)) return;
    void runMemberAction(
      { action: "reset-trial", userId: m.id },
      "Trial direset.",
    );
  }

  function deactivateMember(m: Member) {
    const label = m.full_name || m.email || "user ini";
    if (!window.confirm(`Nonaktifkan ${label} sebagai member?`)) return;
    void runMemberAction(
      { action: "deactivate-member", userId: m.id },
      "Member dinonaktifkan.",
    );
  }

  return (
    <div className="mt-8 flex flex-col gap-8">
      {msg && (
        <p
          className={`rounded-xl p-4 text-sm ${
            msg.startsWith("Gagal") ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
          }`}
        >
          {msg}
        </p>
      )}

      {/* Harga */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Paket &amp; Harga</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Bulanan (Rp)
            </label>
            <input type="number" value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Tahunan (Rp)
            </label>
            <input type="number" value={yearly} onChange={(e) => setYearly(Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Durasi trial (jam)
            </label>
            <input type="number" value={trialHours} onChange={(e) => setTrialHours(Number(e.target.value))} className={inputCls} />
            <p className="mt-1 text-xs text-slate-400">
              Disarankan 168 jam (7 hari). Berlaku langsung untuk aktivasi trial
              baru.
            </p>
          </div>
        </div>
        <button
          onClick={savePricing}
          disabled={saving}
          className="mt-4 rounded-xl bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan Harga"}
        </button>
      </section>

      {/* Kupon */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Kupon Diskon</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <input
            placeholder="KODE"
            value={couponForm.code}
            onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
            className={inputCls}
          />
          <select
            value={couponForm.type}
            onChange={(e) => setCouponForm({ ...couponForm, type: e.target.value as "percent" | "nominal" })}
            className={inputCls}
          >
            <option value="percent">Persen (%)</option>
            <option value="nominal">Nominal (Rp)</option>
          </select>
          <input
            type="number"
            placeholder="Nilai"
            value={couponForm.value}
            onChange={(e) => setCouponForm({ ...couponForm, value: Number(e.target.value) })}
            className={inputCls}
          />
          <input
            type="number"
            placeholder="Maks. pakai (total)"
            value={couponForm.maxUses}
            onChange={(e) => setCouponForm({ ...couponForm, maxUses: Number(e.target.value) })}
            className={inputCls}
          />
          <input
            type="date"
            title="Kedaluwarsa (opsional)"
            value={couponForm.expiresAt}
            onChange={(e) => setCouponForm({ ...couponForm, expiresAt: e.target.value })}
            className={inputCls}
          />
          <button
            onClick={addCoupon}
            disabled={saving || !couponForm.code}
            className="rounded-xl bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            Buat
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {coupons.map((c) => (
            <div
              key={c.code}
              className={`rounded-2xl border px-3 py-2 ${c.active ? "border-slate-200" : "border-slate-200 bg-slate-50"}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.active ? "bg-brand-light text-brand" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {c.code}
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  {c.discount_type === "percent" ? `${c.discount_value}%` : `Rp ${c.discount_value.toLocaleString("id-ID")}`}
                </span>
                {!c.active && <span className="text-xs text-slate-400">nonaktif</span>}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Maks. {c.max_uses} pakai
                {c.expires_at
                  ? ` · s/d ${new Date(c.expires_at).toLocaleDateString("id-ID")}`
                  : " · tanpa batas waktu"}
              </p>
              <button
                onClick={() => toggleCoupon(c.code, !c.active)}
                disabled={saving}
                className="mt-2 rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                {c.active ? "Nonaktifkan" : "Aktifkan"}
              </button>
            </div>
          ))}
          {coupons.length === 0 && <p className="text-sm text-slate-400">Belum ada kupon.</p>}
        </div>
      </section>

      {/* Member */}
      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Kelola Member</h2>
          <p className="text-sm text-slate-500">
            Set status manual untuk kompensasi, koreksi, atau reset trial. Setiap
            aksi butuh konfirmasi.
          </p>
        </div>
        {memberMsg && (
          <p
            className={`mx-6 mt-4 rounded-xl p-3 text-sm ${
              memberMsg.startsWith("Gagal") ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
            }`}
          >
            {memberMsg}
          </p>
        )}
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Pengguna</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                  Belum ada pengguna.
                </td>
              </tr>
            )}
            {members.map((m) => (
              <tr key={m.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{m.full_name || "-"}</p>
                  <p className="text-xs text-slate-400">{m.email}</p>
                </td>
                <td className="px-4 py-3">
                  {m.is_member ? (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                      Member {m.member_expires_at ? `s/d ${new Date(m.member_expires_at).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })}` : ""}
                    </span>
                  ) : m.trial_used ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                      Trial dipakai
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      Free
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setMember(m, 30)}
                      disabled={saving}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
                    >
                      +30 hari
                    </button>
                    <button
                      onClick={() => setMember(m, 365)}
                      disabled={saving}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
                    >
                      +1 tahun
                    </button>
                    {m.is_member && (
                      <button
                        onClick={() => deactivateMember(m)}
                        disabled={saving}
                        className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
                      >
                        Nonaktifkan
                      </button>
                    )}
                    <button
                      onClick={() => resetTrial(m)}
                      disabled={saving}
                      className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                    >
                      Reset trial
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
