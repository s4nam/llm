import type { FreeLesson } from "./types";

/**
 * 3 pelajaran gratis (level A1) — sesuai keputusan:
 * 1 Vocabulary + 1 Grammar + 1 Reading (3 pelajaran pertama A1).
 * Konten ditulis langsung (bukan AI) agar stabil saat fase 1 & dapat diuji.
 */
export const FREE_LESSONS: FreeLesson[] = [
  {
    id: "a1-vocab-greetings",
    level: "A1",
    category: "vocabulary",
    title: "Greetings & Introductions",
    intro:
      "Halo! Selamat datang di pelajaran pertama englishmudah.id. Hari ini kita belajar cara menyapa dan memperkenalkan diri dalam Bahasa Inggris. Ini materi paling dasar dan paling sering dipakai sehari-hari.",
    sections: [
      {
        heading: "Salam (Greetings)",
        body: "Berikut sapaan yang paling umum:\n\n• Hello — Halo\n• Hi — Hai\n• Good morning — Selamat pagi\n• Good afternoon — Selamat siang\n• Good evening — Selamat malam\n• Goodbye — Selamat tinggal\n• See you later — Sampai jumpa lagi",
      },
      {
        heading: "Perkenalan Diri (Introducing yourself)",
        body: "Untuk memperkenalkan diri, gunakan kalimat:\n\n• My name is ... — Nama saya ...\n• I am ... years old — Umur saya ... tahun\n• I am from ... — Saya berasal dari ...\n• Nice to meet you — Senang bertemu denganmu",
      },
      {
        heading: "Tanya Jawab Sederhana",
        body: "Pertanyaan yang sering muncul:\n\n• What is your name? — Siapa namamu?\n• Where are you from? — Kamu dari mana?\n\nJawabannya:\n• My name is Rina.\n• I am from Indonesia.",
      },
    ],
    quiz: [
      {
        question: "Apa arti 'Good morning'?",
        options: ["Selamat siang", "Selamat pagi", "Selamat malam", "Selamat tinggal"],
        answerIndex: 1,
        explanation: "'Good morning' berarti 'Selamat pagi'. Dipakai saat bertemu di pagi hari.",
      },
      {
        question: "Bagaimana cara memperkenalkan diri?",
        options: [
          "My name is Budi",
          "Goodbye",
          "See you later",
          "Nice day",
        ],
        answerIndex: 0,
        explanation: "'My name is Budi' berarti 'Nama saya Budi'. Ini cara memperkenalkan diri.",
      },
      {
        question: "Apa arti 'Nice to meet you'?",
        options: [
          "Sampai jumpa",
          "Selamat datang",
          "Senang bertemu denganmu",
          "Apa kabar",
        ],
        answerIndex: 2,
        explanation: "'Nice to meet you' berarti 'Senang bertemu denganmu'.",
      },
      {
        question: "Pertanyaan 'Where are you from?' artinya ...",
        options: ["Kamu mau ke mana?", "Kamu dari mana?", "Siapa namamu?", "Jam berapa sekarang?"],
        answerIndex: 1,
        explanation: "'Where are you from?' berarti 'Kamu dari mana?'",
      },
      {
        question: "Sapaan apa yang tepat untuk bertemu di malam hari?",
        options: ["Good morning", "Good afternoon", "Good evening", "Hello morning"],
        answerIndex: 2,
        explanation: "'Good evening' dipakai saat bertemu di malam hari.",
      },
    ],
  },
  {
    id: "a1-grammar-be",
    level: "A1",
    category: "grammar",
    title: "Be Verbs: Am, Is, Are",
    intro:
      "Sekarang kita belajar kata kerja 'be' dalam Bahasa Inggris: am, is, dan are. Kata kerja ini adalah fondasi untuk membangun kalimat sederhana.",
    sections: [
      {
        heading: "Kapan memakai Am, Is, Are?",
        body: "Am, is, are dipakai untuk menjelaskan keadaan, asal, atau siapa seseorang:\n\n• I am a student. — Saya adalah seorang pelajar.\n• She is happy. — Dia (perempuan) bahagia.\n• They are from Jakarta. — Mereka dari Jakarta.",
      },
      {
        heading: "Aturan dasarnya",
        body: "• 'am' dipakai dengan 'I' (saya)\n• 'is' dipakai dengan he, she, it (dia / benda tunggal)\n• 'are' dipakai dengan you, we, they (kamu, kita, mereka / benda jamak)",
      },
      {
        heading: "Contoh dalam kalimat",
        body: "• I am a teacher. (Saya seorang guru)\n• He is my friend. (Dia teman saya)\n• It is a cat. (Itu adalah kucing)\n• You are kind. (Kamu baik hati)\n• We are happy. (Kita bahagia)\n• They are students. (Mereka pelajar)",
      },
    ],
    quiz: [
      {
        question: "Pilih kata yang benar: 'I ___ a student.'",
        options: ["am", "is", "are", "be"],
        answerIndex: 0,
        explanation: "'am' selalu dipakai dengan 'I'.",
      },
      {
        question: "Pilih kata yang benar: 'She ___ my sister.'",
        options: ["am", "is", "are", "be"],
        answerIndex: 1,
        explanation: "'is' dipakai dengan she/he/it.",
      },
      {
        question: "Pilih kata yang benar: 'They ___ from Bandung.'",
        options: ["am", "is", "are", "be"],
        answerIndex: 2,
        explanation: "'are' dipakai dengan they (mereka).",
      },
      {
        question: "Pilih kata yang benar: 'It ___ a book.'",
        options: ["am", "is", "are", "be"],
        answerIndex: 1,
        explanation: "'it' (benda tunggal) memakai 'is'.",
      },
      {
        question: "Pilih kata yang benar: 'We ___ ready.'",
        options: ["am", "is", "are", "be"],
        answerIndex: 2,
        explanation: "'are' dipakai dengan we (kita).",
      },
    ],
  },
  {
    id: "a1-reading-my-family",
    level: "A1",
    category: "reading",
    title: "Reading: My Family",
    intro:
      "Mari berlatih membaca! Baca teks pendek tentang keluarga, lalu jawab soalnya. Jangan khawatir jika belum lancar — pelan-pelan saja.",
    sections: [
      {
        heading: "Baca teks berikut",
        body: "My name is Sari. I am a student. I am twelve years old. I live in Yogyakarta.\n\nThere are four people in my family. My father is a doctor. His name is Mr. Hadi. My mother is a teacher. Her name is Mrs. Sari — yes, we have the same name!\n\nI have one brother. His name is Budi. He is ten years old. We love our family very much.",
      },
      {
        heading: "Kosakata penting (kosa kata)",
        body: "• father — ayah\n• mother — ibu\n• brother — saudara laki-laki\n• doctor — dokter\n• teacher — guru\n• family — keluarga",
      },
      {
        heading: "Latihan memahami",
        body: "Teks di atas menceritakan keluarga Sari: ayahnya dokter, ibunya guru, dan satu adik laki-laki bernama Budi. Perhatikan detail usia dan pekerjaan mereka saat menjawab soal.",
      },
    ],
    quiz: [
      {
        question: "Berapa umur Sari?",
        options: ["Ten years old", "Eleven years old", "Twelve years old", "Twenty years old"],
        answerIndex: 2,
        explanation: "Teks menyebutkan 'I am twelve years old'.",
      },
      {
        question: "Apa pekerjaan ayah Sari?",
        options: ["A teacher", "A doctor", "A driver", "A student"],
        answerIndex: 1,
        explanation: "Teks menyebutkan 'My father is a doctor'.",
      },
      {
        question: "Apa pekerjaan ibu Sari?",
        options: ["A doctor", "A nurse", "A teacher", "A chef"],
        answerIndex: 2,
        explanation: "Teks menyebutkan 'My mother is a teacher'.",
      },
      {
        question: "Siapa Budi?",
        options: [
          "Sari's father",
          "Sari's brother",
          "Sari's mother",
          "Sari's friend",
        ],
        answerIndex: 1,
        explanation: "Teks menyebutkan 'I have one brother. His name is Budi.'",
      },
      {
        question: "Berapa jumlah orang dalam keluarga Sari?",
        options: ["Three", "Four", "Five", "Six"],
        answerIndex: 1,
        explanation: "Ada ayah, ibu, Sari, dan Budi — total empat orang.",
      },
    ],
  },
];

export const FREE_LESSON_IDS = FREE_LESSONS.map((l) => l.id);
