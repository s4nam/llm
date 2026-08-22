/**
 * Tipe data untuk modul "Percakapan Situasional".
 * Jalur belajar ketiga: topik kehidupan nyata (Hotel, Restoran, dsb.).
 * Konten disimpan sebagai JSONB di tabel situational_sets.
 */

export type SituationalTopicId =
  | "hotel"
  | "restaurant"
  | "travel"
  | "shopping"
  | "health"
  | "interview"
  | "phone"
  | "bank"
  | "office"
  | "school"
  | "social"
  | "customer_service";

export interface SituationalTopic {
  id: SituationalTopicId;
  label: string;
  icon: string;
  description: string;
  /** Judul situasi default — otomatis terisi saat admin memilih topik. */
  suggestedTitle: string;
}

export const SITUATIONAL_TOPICS: SituationalTopic[] = [
  {
    id: "hotel",
    label: "Hotel",
    icon: "🏨",
    description: "Check-in, komplain kamar, check-out, dan pembayaran.",
    suggestedTitle: "Check-in di Hotel",
  },
  {
    id: "restaurant",
    label: "Restoran",
    icon: "🍽️",
    description: "Memesan makanan, alergi & pantangan, minta tagihan.",
    suggestedTitle: "Memesan Makanan di Restoran",
  },
  {
    id: "travel",
    label: "Bandara & Perjalanan",
    icon: "✈️",
    description: "Di bandara, naik transportasi, bertanya arah.",
    suggestedTitle: "Check-in di Bandara",
  },
  {
    id: "shopping",
    label: "Belanja",
    icon: "🛍️",
    description: "Tanya harga & ukuran, menukar atau retur barang.",
    suggestedTitle: "Membeli Pakaian di Toko",
  },
  {
    id: "health",
    label: "Kesehatan",
    icon: "🏥",
    description: "Ke dokter, di apotek, menjelaskan keluhan.",
    suggestedTitle: "Konsultasi ke Dokter",
  },
  {
    id: "interview",
    label: "Wawancara Kerja",
    icon: "💼",
    description: "Perkenalan diri, pengalaman kerja, tanya gaji, dan follow-up.",
    suggestedTitle: "Wawancara Kerja: Perkenalan Diri",
  },
  {
    id: "phone",
    label: "Telepon",
    icon: "📞",
    description: "Reservasi lewat telepon, customer service, menunggu, meninggalkan pesan.",
    suggestedTitle: "Reservasi Restoran via Telepon",
  },
  {
    id: "bank",
    label: "Perbankan & Keuangan",
    icon: "🏦",
    description: "Buka rekening, transaksi, tanya teller, ATM.",
    suggestedTitle: "Buka Rekening di Bank",
  },
  {
    id: "office",
    label: "Kantor & Rapat",
    icon: "🧑‍💼",
    description: "Meeting, presentasi, kerja tim, email kantor.",
    suggestedTitle: "Meeting Tim di Kantor",
  },
  {
    id: "school",
    label: "Sekolah & Kelas",
    icon: "🎒",
    description: "Bertanya ke guru, presentasi kelas, tugas kelompok.",
    suggestedTitle: "Bertanya di Kelas",
  },
  {
    id: "social",
    label: "Pesta & Perkenalan Sosial",
    icon: "🎉",
    description: "Small talk, undangan, bertemu orang baru.",
    suggestedTitle: "Berkenalan di Pesta",
  },
  {
    id: "customer_service",
    label: "Layanan Pelanggan",
    icon: "🛎️",
    description: "Menangani keluhan, membantu pelanggan, permintaan maaf.",
    suggestedTitle: "Menangani Keluhan Pelanggan",
  },
];

export interface SituationalDialogueLine {
  speaker: "ai" | "user";
  text: string;
}

export interface SituationalVocabItem {
  word: string;
  meaning: string;
}

export interface SituationalQuizItem {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface SituationalRoleplay {
  scenario: string;
  lines: SituationalDialogueLine[];
  keyPhrases: string[];
}

export interface SituationalSetContent {
  /** Dialog 2 pihak (AI dibacakan TTS, user membaca gilirannya). */
  dialogues: SituationalDialogueLine[];
  /** Kosakata situasi + artinya. */
  vocab: SituationalVocabItem[];
  /** Kuis pemahaman (5 soal). */
  quiz: SituationalQuizItem[];
  /** Role-play interaktif (opsional). */
  roleplay?: SituationalRoleplay;
}

export interface SituationalSet {
  id: string;
  topic: SituationalTopicId;
  title: string;
  slug: string;
  content: SituationalSetContent;
  is_free: boolean;
  status: "draft" | "published";
  published_at: string | null;
}

export function getTopic(id: string): SituationalTopic | undefined {
  return SITUATIONAL_TOPICS.find((t) => t.id === id);
}