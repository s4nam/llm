"use client";

import { useEffect, useState } from "react";
import { PROVIDER_MODELS, type ProviderId } from "@/lib/ai/cost";

type SettingsState = {
  configured: Record<string, boolean>;
  defaultProvider: ProviderId;
  defaultModel: string;
  budgetAlarmIdr: number;
} | null;

const PROVIDERS: { id: ProviderId; label: string; placeholder: string }[] = [
  { id: "openai", label: "OpenAI", placeholder: "sk-..." },
  { id: "gemini", label: "Google Gemini", placeholder: "AIza..." },
  { id: "claude", label: "Claude (Anthropic)", placeholder: "sk-ant-..." },
];

export default function AiSettingsForm() {
  const [settings, setSettings] = useState<SettingsState>(null);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [provider, setProvider] = useState<ProviderId>("openai");
  const [model, setModel] = useState<string>("");
  const [budget, setBudget] = useState(0);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/ai-settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setMessage({ type: "err", text: data.error });
          return;
        }
        setSettings(data);
        setProvider(data.defaultProvider);
        setModel(data.defaultModel);
        setBudget(data.budgetAlarmIdr ?? 0);
      })
      .catch(() =>
        setMessage({ type: "err", text: "Gagal memuat pengaturan." }),
      );
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/admin/ai-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys, defaultProvider: provider, defaultModel: model, budgetAlarmIdr: budget }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage({ type: "err", text: data.error ?? "Gagal menyimpan." });
    } else {
      setKeys({});
      setMessage({ type: "ok", text: "Pengaturan berhasil disimpan." });
      // refresh status configured
      const r = await fetch("/api/admin/ai-settings");
      const d = await r.json();
      if (!d.error) setSettings(d);
    }
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    setMessage(null);
    const res = await fetch("/api/admin/ai-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, model }),
    });
    const data = await res.json();
    setTesting(false);
    if (res.ok) {
      setTestResult(`Berhasil! Balasan model: "${data.reply}"`);
    } else {
      setTestResult(`Gagal: ${data.error}`);
    }
  }

  const models = PROVIDER_MODELS[provider] ?? [];

  return (
    <div className="mt-8 flex flex-col gap-6">
      {/* API keys */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">API Key Provider AI</h2>
        <p className="mt-1 text-sm text-slate-500">
          Masukkan kunci baru (key lama yang sudah tersimpan tidak berubah jika
          dikosongkan). Kunci disimpan terenkripsi.
        </p>
        <div className="mt-4 flex flex-col gap-4">
          {PROVIDERS.map((p) => (
            <div key={p.id}>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                {p.label}
                {settings?.configured?.[p.id] ? (
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                    ✓ Terisi
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    Kosong
                  </span>
                )}
              </label>
              <input
                type="password"
                value={keys[p.id] ?? ""}
                onChange={(e) => setKeys((k) => ({ ...k, [p.id]: e.target.value }))}
                placeholder={settings?.configured?.[p.id] ? "•••••••• (biarkan kosong jika tidak diganti)" : p.placeholder}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Provider & model default */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Provider &amp; Model Default
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Digunakan saat generate materi. Jika provider ini gagal, sistem
          otomatis fallback ke provider lain.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Provider Default
            </label>
            <select
              value={provider}
              onChange={(e) => {
                const p = e.target.value as ProviderId;
                setProvider(p);
                setModel(PROVIDER_MODELS[p][0]?.id ?? "");
              }}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-brand"
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Model Default
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-brand"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={testConnection}
          disabled={testing}
          className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {testing ? "Menguji..." : "Test Koneksi"}
        </button>
        {testResult && (
          <p className="mt-2 text-sm text-slate-600">{testResult}</p>
        )}
      </section>

      {/* Budget alarm */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Alarm Budget</h2>
        <p className="mt-1 text-sm text-slate-500">
          Anda mendapat peringatan di dashboard ketika estimasi biaya token
          hari ini melebihi angka ini. Isi 0 untuk menonaktifkan.
        </p>
        <input
          type="number"
          min={0}
          step={1000}
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          className="mt-3 w-full max-w-xs rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-brand"
          placeholder="Contoh: 50000"
        />
      </section>

      {message && (
        <p
          className={`rounded-xl p-4 text-sm ${
            message.type === "ok"
              ? "bg-success/10 text-success"
              : "bg-danger/10 text-danger"
          }`}
        >
          {message.text}
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
      >
        {saving ? "Menyimpan..." : "Simpan Pengaturan"}
      </button>
    </div>
  );
}
