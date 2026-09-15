import type { FreeLesson } from "./types";

/**
 * 3 pelajaran gratis (level A1) — sesuai keputusan:
 * 1 Vocabulary + 1 Grammar + 1 Reading (3 pelajaran pertama A1).
 * Konten ditulis langsung (bukan AI) agar stabil saat fase 1 & dapat diuji.
 *
 * Diupdate Fase Bilingual: setiap soal punya `optionsEN`/`optionsID`
 * dan `explanations` (penjelasan per opsi, distractor feedback).
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
        questionEN: "What does 'Good morning' mean?",
        options: ["Selamat siang", "Selamat pagi", "Selamat malam", "Selamat tinggal"],
        optionsEN: ["Good afternoon", "Good morning", "Good evening", "Goodbye"],
        answerIndex: 1,
        explanation: "'Good morning' berarti 'Selamat pagi'. Dipakai saat bertemu di pagi hari.",
        explanations: [
          "Ini berarti 'Good afternoon'. Digunakan saat siang hari, bukan pagi.",
          "✓ Benar! 'Good morning' berarti 'Selamat pagi'. Dipakai saat pagi hari.",
          "Ini berarti 'Good evening'. Digunakan saat sore/malam hari.",
          "Ini berarti 'Goodbye'. Digunakan saat berpisah, bukan saat menyapa.",
        ],
      },
      {
        question: "Bagaimana cara memperkenalkan diri?",
        questionEN: "How do you introduce yourself?",
        options: [
          "My name is Budi",
          "Goodbye",
          "See you later",
          "Nice day",
        ],
        optionsEN: ["My name is Budi", "Goodbye", "See you later", "Nice day"],
        answerIndex: 0,
        explanation: "'My name is Budi' berarti 'Nama saya Budi'. Ini cara memperkenalkan diri.",
        explanations: [
          "✓ Benar! 'My name is Budi' berarti 'Nama saya Budi'. Ini cara standar memperkenalkan diri.",
          "Ini berarti 'Selamat tinggal'. Bukan cara memperkenalkan diri.",
          "Ini berarti 'Sampai jumpa lagi'. Bukan perkenalan.",
          "Ini bukan frasa yang benar. Seharusnya 'Nice to meet you' untuk perkenalan.",
        ],
      },
      {
        question: "Apa arti 'Nice to meet you'?",
        questionEN: "What does 'Nice to meet you' mean?",
        options: [
          "Sampai jumpa",
          "Selamat datang",
          "Senang bertemu denganmu",
          "Apa kabar",
        ],
        optionsEN: ["Goodbye", "Welcome", "Nice to meet you", "What's up"],
        answerIndex: 2,
        explanation: "'Nice to meet you' berarti 'Senang bertemu denganmu'.",
        explanations: [
          "Ini berarti 'Selamat tinggal' atau 'Goodbye'. Bukan perkenalan.",
          "Ini berarti 'Selamat datang' atau 'Welcome'. Bukan 'Nice to meet you'.",
          "✓ Benar! 'Nice to meet you' berarti 'Senang bertemu denganmu'.",
          "Ini berarti 'Apa kabar' atau 'What's up'. Bukan perkenalan formal.",
        ],
      },
      {
        question: "Pertanyaan 'Where are you from?' artinya ...",
        questionEN: "What does the question 'Where are you from?' mean?",
        options: ["Kamu mau ke mana?", "Kamu dari mana?", "Siapa namamu?", "Jam berapa sekarang?"],
        optionsEN: ["Where are you going?", "Where are you from?", "What is your name?", "What time is it?"],
        answerIndex: 1,
        explanation: "'Where are you from?' berarti 'Kamu dari mana?'",
        explanations: [
          "Ini berarti 'Ke mana tujuanmu?' — menanyakan tujuan, bukan asal.",
          "✓ Benar! 'Where are you from?' berarti 'Kamu dari mana?' — menanyakan tempat asal.",
          "Ini berarti 'Siapa namamu?' — menanyakan nama, bukan tempat asal.",
          "Ini berarti 'Jam berapa sekarang?' — menanyakan waktu, bukan tempat asal.",
        ],
      },
      {
        question: "Sapaan apa yang tepat untuk bertemu di malam hari?",
        questionEN: "What greeting is appropriate for meeting in the evening?",
        options: ["Good morning", "Good afternoon", "Good evening", "Hello morning"],
        optionsEN: ["Good morning", "Good afternoon", "Good evening", "Hello morning"],
        answerIndex: 2,
        explanation: "'Good evening' dipakai saat bertemu di malam hari.",
        explanations: [
          "Ini dipakai di pagi hari, bukan malam.",
          "Ini dipakai di siang hari, bukan malam.",
          "✓ Benar! 'Good evening' dipakai saat bertemu di malam atau sore hari.",
          "Ini bukan sapaan yang benar. 'Hello morning' tidak umum dipakai.",
        ],
      },
    ],
    games: [
      {
        type: "listen_choose",
        items: [
          {
            text: "Good morning",
            options: ["Selamat pagi", "Selamat malam", "Selamat tinggal", "Apa kabar"],
            answerIndex: 0,
            explanation: "'Good morning' berarti 'Selamat pagi'.",
          },
          {
            text: "See you later",
            options: ["Sampai jumpa lagi", "Selamat pagi", "Terima kasih", "Siapa namamu"],
            answerIndex: 0,
            explanation: "'See you later' berarti 'Sampai jumpa lagi'.",
          },
          {
            text: "Nice to meet you",
            options: ["Selamat datang", "Sampai jumpa", "Senang bertemu denganmu", "Selamat tidur"],
            answerIndex: 2,
            explanation: "'Nice to meet you' berarti 'Senang bertemu denganmu'.",
          },
        ],
      },
      {
        type: "unscramble",
        items: [
          { sentence: "My name is Budi" },
          { sentence: "Good morning everyone" },
          { sentence: "I am from Indonesia" },
        ],
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
        questionEN: "Choose the correct word: 'I ___ a student.'",
        options: ["am", "is", "are", "be"],
        optionsEN: ["am", "is", "are", "be"],
        answerIndex: 0,
        explanation: "'am' selalu dipakai dengan 'I'.",
        explanations: [
          "✓ Benar! 'am' selalu dipakai dengan subjek 'I' (saya).",
          "Salah. 'is' dipakai dengan he, she, it (dia atau benda tunggal), bukan 'I'.",
          "Salah. 'are' dipakai dengan you, we, they (kamu, kita, mereka), bukan 'I'.",
          "Salah. 'be' adalah bentuk dasar kata kerja (infinitif), bukan bentuk yang digunakan di sini.",
        ],
      },
      {
        question: "Pilih kata yang benar: 'She ___ my sister.'",
        questionEN: "Choose the correct word: 'She ___ my sister.'",
        options: ["am", "is", "are", "be"],
        optionsEN: ["am", "is", "are", "be"],
        answerIndex: 1,
        explanation: "'is' dipakai dengan she/he/it.",
        explanations: [
          "Salah. 'am' dipakai dengan 'I' (saya), bukan 'she'.",
          "✓ Benar! 'is' dipakai dengan she, he, it (dia atau benda tunggal). Di sini subjeknya 'she'.",
          "Salah. 'are' dipakai dengan you, we, they. Bukan subjek tunggal 'she'.",
          "Salah. 'be' adalah bentuk dasar kata kerja. Bukan bentuk yang benar untuk subjek 'she'.",
        ],
      },
      {
        question: "Pilih kata yang benar: 'They ___ from Bandung.'",
        questionEN: "Choose the correct word: 'They ___ from Bandung.'",
        options: ["am", "is", "are", "be"],
        optionsEN: ["am", "is", "are", "be"],
        answerIndex: 2,
        explanation: "'are' dipakai dengan they (mereka).",
        explanations: [
          "Salah. 'am' dipakai dengan 'I' (saja). Bukan 'they'.",
          "Salah. 'is' dipakai dengan he, she, it (tunggal). 'They' adalah jamak.",
          "✓ Benar! 'are' dipakai dengan 'they' (mereka), subjek jamak.",
          "Salah. 'be' adalah bentuk dasar kata kerja. Bukan bentuk yang benar untuk subjek jamak.",
        ],
      },
      {
        question: "Pilih kata yang benar: 'It ___ a book.'",
        questionEN: "Choose the correct word: 'It ___ a book.'",
        options: ["am", "is", "are", "be"],
        optionsEN: ["am", "is", "are", "be"],
        answerIndex: 1,
        explanation: "'it' (benda tunggal) memakai 'is'.",
        explanations: [
          "Salah. 'am' dipakai dengan 'I' (saja). Bukan 'it'.",
          "✓ Benar! 'is' dipakai dengan 'it' (benda tunggal). Di sini subjeknya 'it'.",
          "Salah. 'are' dipakai dengan you, we, they (jamak). 'It' adalah tunggal.",
          "Salah. 'be' adalah bentuk dasar kata kerja. Bukan bentuk yang benar untuk 'it'.",
        ],
      },
      {
        question: "Pilih kata yang benar: 'We ___ ready.'",
        questionEN: "Choose the correct word: 'We ___ ready.'",
        options: ["am", "is", "are", "be"],
        optionsEN: ["am", "is", "are", "be"],
        answerIndex: 2,
        explanation: "'are' dipakai dengan we (kita).",
        explanations: [
          "Salah. 'am' dipakai dengan 'I' (saja). Bukan 'we'.",
          "Salah. 'is' dipakai dengan he, she, it (tunggal). 'We' adalah jamak.",
          "✓ Benar! 'are' dipakai dengan 'we' (kita), subjek jamak.",
          "Salah. 'be' adalah bentuk dasar kata kerja. Bukan bentuk yang benar untuk 'we'.",
        ],
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
        questionEN: "How old is Sari?",
        options: ["Ten years old", "Eleven years old", "Twelve years old", "Twenty years old"],
        optionsID: ["Sepuluh tahun", "Sebelas tahun", "Dua belas tahun", "Dua puluh tahun"],
        answerIndex: 2,
        explanation: "Teks menyebutkan 'I am twelve years old'.",
        explanations: [
          "Salah. Teks tidak menyebutkan sepuluh tahun untuk Sari.",
          "Salah. Teks tidak menyebutkan sebelas tahun untuk Sari.",
          "✓ Benar! Teks menyebutkan 'I am twelve years old' — Sari berusia dua belas tahun.",
          "Salah. Teks tidak menyebutkan dua puluh tahun untuk Sari.",
        ],
      },
      {
        question: "Apa pekerjaan ayah Sari?",
        questionEN: "What is Sari's father's job?",
        options: ["A teacher", "A doctor", "A driver", "A student"],
        optionsID: ["Seorang guru", "Seorang dokter", "Seorang sopir", "Seorang pelajar"],
        answerIndex: 1,
        explanation: "Teks menyebutkan 'My father is a doctor'.",
        explanations: [
          "Salah. Teks menyebutkan ibunya guru, bukan ayahnya.",
          "✓ Benar! Teks menyebutkan 'My father is a doctor' — ayah Sari seorang dokter.",
          "Salah. Teks tidak menyebutkan ayahnya sebagai sopir.",
          "Salah. Teks tidak menyebutkan ayahnya sebagai pelajar.",
        ],
      },
      {
        question: "Apa pekerjaan ibu Sari?",
        questionEN: "What is Sari's mother's job?",
        options: ["A doctor", "A nurse", "A teacher", "A chef"],
        optionsID: ["Seorang dokter", "Seorang perawat", "Seorang guru", "Seorang koki"],
        answerIndex: 2,
        explanation: "Teks menyebutkan 'My mother is a teacher'.",
        explanations: [
          "Salah. Teks menyebutkan ayahnya dokter, bukan ibunya.",
          "Salah. Teks tidak menyebutkan ibunya sebagai perawat.",
          "✓ Benar! Teks menyebutkan 'My mother is a teacher' — ibu Sari seorang guru.",
          "Salah. Teks tidak menyebutkan ibunya sebagai koki.",
        ],
      },
      {
        question: "Siapa Budi?",
        questionEN: "Who is Budi?",
        options: [
          "Sari's father",
          "Sari's brother",
          "Sari's mother",
          "Sari's friend",
        ],
        optionsID: ["Ayah Sari", "Saudara laki-laki Sari", "Ibu Sari", "Teman Sari"],
        answerIndex: 1,
        explanation: "Teks menyebutkan 'I have one brother. His name is Budi.'",
        explanations: [
          "Salah. Teks menyebutkan ayahnya Mr. Hadi, bukan Budi.",
          "✓ Benar! Teks menyebutkan 'I have one brother. His name is Budi.' — Budi adalah saudaranya.",
          "Salah. Teks menyebutkan ibunya Mrs. Sari, bukan Budi.",
          "Salah. Teks tidak menyebutkan Budi sebagai teman Sari.",
        ],
      },
      {
        question: "Berapa jumlah orang dalam keluarga Sari?",
        questionEN: "How many people are in Sari's family?",
        options: ["Three", "Four", "Five", "Six"],
        optionsID: ["Tiga orang", "Empat orang", "Lima orang", "Enam orang"],
        answerIndex: 1,
        explanation: "Ada ayah, ibu, Sari, dan Budi — total empat orang.",
        explanations: [
          "Salah. Keluarga Sari terdiri dari empat orang, bukan tiga.",
          "✓ Benar! Ada ayah (Mr. Hadi), ibu (Mrs. Sari), Sari, dan Budi — total empat orang.",
          "Salah. Keluarga Sari terdiri dari empat orang, bukan lima.",
          "Salah. Keluarga Sari terdiri dari empat orang, bukan enam.",
        ],
      },
    ],
  },
];

export const FREE_LESSON_IDS = FREE_LESSONS.map((l) => l.id);
