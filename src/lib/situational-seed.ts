import type { SituationalSetContent, SituationalTopicId } from "@/lib/types-situational";

/**
 * Konten cadangan (seed) untuk modul "Percakapan Situasional".
 * Dipakai bila tabel situational_sets masih kosong — agar modul langsung
 * berfungsi sebelum admin generate via AI. Semua konten ORISINAL.
 */

export interface SituationalSeedSet {
  topic: SituationalTopicId;
  title: string;
  slug: string;
  content: SituationalSetContent;
  isFree?: boolean;
}

export const SITUATIONAL_SEED: SituationalSeedSet[] = [
  {
    topic: "hotel",
    title: "Check-in di Hotel",
    slug: "hotel-check-in",
    isFree: true,
    content: {
      dialogues: [
        { speaker: "ai", text: "Good evening. Welcome to our hotel. How can I help you?" },
        { speaker: "user", text: "Good evening. I have a reservation under the name Budi." },
        { speaker: "ai", text: "Let me check. Yes, I found it. A single room for three nights." },
        { speaker: "user", text: "That's correct. Could I have a room on a higher floor, please?" },
      ],
      vocab: [
        { word: "reservation", meaning: "reservasi / pemesanan" },
        { word: "check-in", meaning: "daftar masuk (tiba di hotel)" },
        { word: "single room", meaning: "kamar untuk satu orang" },
        { word: "floor", meaning: "lantai" },
        { word: "welcome", meaning: "selamat datang" },
      ],
      quiz: [
        {
          question: "Where does this conversation happen?",
          options: ["At a restaurant", "At a hotel reception", "At an airport", "At a shop"],
          answerIndex: 1,
          explanation: "Percakapan terjadi di resepsionis hotel (check-in).",
        },
        {
          question: "What is the guest's name?",
          options: ["Budi", "Sari", "Andi", "Dewi"],
          answerIndex: 0,
          explanation: "Tamu menyebut 'a reservation under the name Budi'.",
        },
        {
          question: "How many nights will the guest stay?",
          options: ["One night", "Two nights", "Three nights", "Four nights"],
          answerIndex: 2,
          explanation: "Resepsionis menyebut 'a single room for three nights'.",
        },
        {
          question: "What does the guest request?",
          options: ["A bigger room", "A room on a higher floor", "A cheaper room", "A room with breakfast"],
          answerIndex: 1,
          explanation: "Tamu meminta 'a room on a higher floor'.",
        },
      ],
      roleplay: {
        scenario: "Anda baru tiba di hotel dan ingin check-in.",
        lines: [
          { speaker: "ai", text: "Hi! Do you have a reservation with us?" },
          { speaker: "user", text: "Yes, my name is Sari. I booked a double room." },
          { speaker: "ai", text: "Perfect. Here is your key card. Your room is on the fifth floor." },
        ],
        keyPhrases: ["I have a reservation", "under the name", "Could I have", "How can I help you"],
      },
    },
  },
  {
    topic: "restaurant",
    title: "Memesan Makanan",
    slug: "restaurant-ordering-food",
    isFree: true,
    content: {
      dialogues: [
        { speaker: "ai", text: "Welcome! Here is the menu. What would you like to order?" },
        { speaker: "user", text: "I'd like the grilled chicken with rice, please." },
        { speaker: "ai", text: "Great choice. Would you like anything to drink?" },
        { speaker: "user", text: "Yes, a glass of orange juice, please." },
      ],
      vocab: [
        { word: "menu", meaning: "daftar makanan" },
        { word: "order", meaning: "memesan" },
        { word: "grilled", meaning: "dipanggang" },
        { word: "to drink", meaning: "untuk diminum" },
        { word: "juice", meaning: "jus" },
      ],
      quiz: [
        {
          question: "What does the customer order to eat?",
          options: ["Fried rice", "Grilled chicken with rice", "Beef soup", "Salad"],
          answerIndex: 1,
          explanation: "Tamu memesan 'grilled chicken with rice'.",
        },
        {
          question: "What does the customer order to drink?",
          options: ["Water", "Orange juice", "Tea", "Coffee"],
          answerIndex: 1,
          explanation: "Tamu memesan 'a glass of orange juice'.",
        },
        {
          question: "What word means 'memesan'?",
          options: ["menu", "order", "grilled", "juice"],
          answerIndex: 1,
          explanation: "'order' berarti 'memesan'.",
        },
        {
          question: "Who asks what the customer wants to drink?",
          options: ["The cook", "The waiter", "The manager", "The customer"],
          answerIndex: 1,
          explanation: "Pelayan (waiter) bertanya 'Would you like anything to drink?'",
        },
      ],
      roleplay: {
        scenario: "Anda di restoran dan ingin memesan makanan.",
        lines: [
          { speaker: "ai", text: "Good morning! What can I get for you today?" },
          { speaker: "user", text: "I'd like a bowl of vegetable soup, please." },
          { speaker: "ai", text: "Sure. Would you like some bread with that?" },
        ],
        keyPhrases: ["I'd like", "What would you like", "anything to drink", "Here is the menu"],
      },
    },
  },
  {
    topic: "travel",
    title: "Di Bandara",
    slug: "travel-at-airport",
    isFree: true,
    content: {
      dialogues: [
        { speaker: "ai", text: "Good morning. May I see your passport and ticket, please?" },
        { speaker: "user", text: "Here you are. Is the flight to Jakarta on time?" },
        { speaker: "ai", text: "Yes, it is. Would you like a window seat?" },
        { speaker: "user", text: "That would be great, thank you." },
      ],
      vocab: [
        { word: "passport", meaning: "paspor" },
        { word: "flight", meaning: "penerbangan" },
        { word: "on time", meaning: "tepat waktu" },
        { word: "window seat", meaning: "kursi dekat jendela" },
        { word: "boarding pass", meaning: "tiket masuk pesawat" },
      ],
      quiz: [
        {
          question: "Where does this conversation take place?",
          options: ["At a hotel", "At a check-in counter in an airport", "At a restaurant", "At a pharmacy"],
          answerIndex: 1,
          explanation: "Percakapan di konter check-in bandara.",
        },
        {
          question: "What does the passenger show?",
          options: ["A ticket only", "A passport and ticket", "A credit card", "A photo"],
          answerIndex: 1,
          explanation: "Petugas meminta 'your passport and ticket'.",
        },
        {
          question: "What seat does the passenger request?",
          options: ["An aisle seat", "A window seat", "A middle seat", "A back seat"],
          answerIndex: 1,
          explanation: "Tamu meminta 'a window seat'.",
        },
        {
          question: "Is the flight to Jakarta on time?",
          options: ["No, it is late", "Yes, it is on time", "It is cancelled", "Unknown"],
          answerIndex: 1,
          explanation: "Petugas menjawab 'Yes, it is' (tepat waktu).",
        },
      ],
      roleplay: {
        scenario: "Anda sedang check-in di bandara.",
        lines: [
          { speaker: "ai", text: "Hello. Where are you flying today?" },
          { speaker: "user", text: "I'm flying to Bali, please." },
          { speaker: "ai", text: "Okay. Here is your boarding pass. Gate number 12." },
        ],
        keyPhrases: ["I'm flying to", "Here is your boarding pass", "gate number", "May I see your passport"],
      },
    },
  },
  {
    topic: "shopping",
    title: "Tanya Harga & Ukuran",
    slug: "shopping-price-size",
    isFree: true,
    content: {
      dialogues: [
        { speaker: "ai", text: "Hi! Are you looking for anything special?" },
        { speaker: "user", text: "Yes, how much is this blue t-shirt?" },
        { speaker: "ai", text: "It's one hundred fifty thousand rupiah. What size do you need?" },
        { speaker: "user", text: "A medium, please. Can I try it on?" },
      ],
      vocab: [
        { word: "size", meaning: "ukuran" },
        { word: "how much", meaning: "berapa harga" },
        { word: "try on", meaning: "mencoba (pakaian)" },
        { word: "medium", meaning: "ukuran sedang" },
        { word: "t-shirt", meaning: "kaos" },
      ],
      quiz: [
        {
          question: "What is the price of the t-shirt?",
          options: ["Fifty thousand", "One hundred fifty thousand", "Two hundred thousand", "Fifteen thousand"],
          answerIndex: 1,
          explanation: "Penjual menyebut 'one hundred fifty thousand rupiah'.",
        },
        {
          question: "What size does the customer need?",
          options: ["Small", "Medium", "Large", "Extra large"],
          answerIndex: 1,
          explanation: "Tamu meminta 'a medium'.",
        },
        {
          question: "What does the customer want to do?",
          options: ["Buy immediately", "Try it on", "Order online", "Return it"],
          answerIndex: 1,
          explanation: "Tamu bertanya 'Can I try it on?'",
        },
        {
          question: "Which phrase means 'berapa harga'?",
          options: ["What size", "How much", "Can I", "I need"],
          answerIndex: 1,
          explanation: "'How much' dipakai untuk bertanya harga.",
        },
      ],
      roleplay: {
        scenario: "Anda di toko baju dan ingin menanyakan harga.",
        lines: [
          { speaker: "ai", text: "Hello! Can I help you find something?" },
          { speaker: "user", text: "Yes, how much are these black shoes?" },
          { speaker: "ai", text: "They are two hundred thousand rupiah." },
        ],
        keyPhrases: ["how much is", "what size", "Can I try it on", "I'd like to buy"],
      },
    },
  },
  {
    topic: "health",
    title: "Ke Dokter",
    slug: "health-visiting-doctor",
    isFree: true,
    content: {
      dialogues: [
        { speaker: "ai", text: "Good morning. What brings you in today?" },
        { speaker: "user", text: "I have a headache and I feel very tired." },
        { speaker: "ai", text: "I see. How long have you felt this way?" },
        { speaker: "user", text: "Since yesterday, after working late." },
      ],
      vocab: [
        { word: "headache", meaning: "sakit kepala" },
        { word: "tired", meaning: "lelah" },
        { word: "symptom", meaning: "gejala" },
        { word: "medicine", meaning: "obat" },
        { word: "feel", meaning: "merasa" },
      ],
      quiz: [
        {
          question: "What is the patient's problem?",
          options: ["A stomach ache", "A headache and tiredness", "A broken leg", "A fever only"],
          answerIndex: 1,
          explanation: "Pasien mengeluh 'a headache and I feel very tired'.",
        },
        {
          question: "Since when has the patient felt this way?",
          options: ["Since this morning", "Since yesterday", "Since last week", "Since an hour ago"],
          answerIndex: 1,
          explanation: "Pasien menjawab 'Since yesterday'.",
        },
        {
          question: "Where does this conversation happen?",
          options: ["At a shop", "At a doctor's clinic", "At an airport", "At a hotel"],
          answerIndex: 1,
          explanation: "Percakapan terjadi di klinik dokter.",
        },
        {
          question: "What is the meaning of 'medicine'?",
          options: ["sakit", "dokter", "obat", "rumah sakit"],
          answerIndex: 2,
          explanation: "'medicine' berarti 'obat'.",
        },
      ],
      roleplay: {
        scenario: "Anda sedang menjelaskan keluhan kepada dokter.",
        lines: [
          { speaker: "ai", text: "Hello. What seems to be the problem?" },
          { speaker: "user", text: "I have a sore throat and a slight fever." },
          { speaker: "ai", text: "Let me check. Please open your mouth." },
        ],
        keyPhrases: ["I have a headache", "I feel tired", "Since yesterday", "What seems to be the problem"],
      },
    },
  },
  {
    topic: "interview",
    title: "Wawancara Kerja: Perkenalan Diri",
    slug: "interview-introduce-yourself",
    isFree: true,
    content: {
      dialogues: [
        { speaker: "ai", text: "Good morning. Thank you for coming. Could you introduce yourself?" },
        { speaker: "user", text: "Of course. My name is Dewi, and I have two years of experience in marketing." },
        { speaker: "ai", text: "Nice to meet you. What is your greatest strength?" },
        { speaker: "user", text: "I am very organized and I enjoy solving problems." },
      ],
      vocab: [
        { word: "experience", meaning: "pengalaman kerja" },
        { word: "strength", meaning: "kelebihan / kekuatan" },
        { word: "qualification", meaning: "kualifikasi" },
        { word: "salary", meaning: "gaji" },
        { word: "position", meaning: "posisi / jabatan" },
      ],
      quiz: [
        {
          question: "Where does this conversation happen?",
          options: ["At a restaurant", "At a job interview", "At a bank", "At a party"],
          answerIndex: 1,
          explanation: "Percakapan terjadi saat wawancara kerja.",
        },
        {
          question: "How many years of experience does Dewi have?",
          options: ["One year", "Two years", "Five years", "No experience"],
          answerIndex: 1,
          explanation: "Dewi menyebut 'two years of experience in marketing'.",
        },
        {
          question: "What does Dewi say is her greatest strength?",
          options: ["Being friendly", "Being organized and solving problems", "Speaking fast", "Working alone"],
          answerIndex: 1,
          explanation: "Dewi menjawab 'I am very organized and I enjoy solving problems'.",
        },
        {
          question: "What is the meaning of 'salary'?",
          options: ["posisi", "pengalaman", "gaji", "wawancara"],
          answerIndex: 2,
          explanation: "'salary' berarti 'gaji'.",
        },
      ],
      roleplay: {
        scenario: "Anda sedang wawancara kerja dan diminta memperkenalkan diri.",
        lines: [
          { speaker: "ai", text: "Hello. Tell me a little about yourself." },
          { speaker: "user", text: "I am Rina. I just finished my degree in accounting." },
          { speaker: "ai", text: "Great. Why do you want to work here?" },
        ],
        keyPhrases: ["I have experience in", "my greatest strength is", "I would like to apply for", "Thank you for the opportunity"],
      },
    },
  },
  {
    topic: "phone",
    title: "Reservasi Restoran via Telepon",
    slug: "phone-restaurant-reservation",
    isFree: true,
    content: {
      dialogues: [
        { speaker: "ai", text: "Good afternoon, Sakura Restaurant. How can I help you?" },
        { speaker: "user", text: "Hello, I'd like to book a table for two tonight at seven." },
        { speaker: "ai", text: "Let me check. Yes, we have a table. What name should I note?" },
        { speaker: "user", text: "Budi. Could I also have a table near the window?" },
      ],
      vocab: [
        { word: "book a table", meaning: "memesan meja" },
        { word: "reservation", meaning: "reservasi" },
        { word: "available", meaning: "tersedia" },
        { word: "confirm", meaning: "mengonfirmasi" },
        { word: "near the window", meaning: "dekat jendela" },
      ],
      quiz: [
        {
          question: "Where is the caller booking a table?",
          options: ["At a hotel", "At Sakura Restaurant", "At an airport", "At a bank"],
          answerIndex: 1,
          explanation: "Penelepon memesan meja di Sakura Restaurant.",
        },
        {
          question: "For how many people does Budi book?",
          options: ["One", "Two", "Three", "Four"],
          answerIndex: 1,
          explanation: "Budi memesan 'a table for two'.",
        },
        {
          question: "What special request does Budi make?",
          options: ["A table near the window", "A table near the door", "A quiet corner", "A large table"],
          answerIndex: 0,
          explanation: "Budi meminta 'a table near the window'.",
        },
        {
          question: "What does 'reservation' mean?",
          options: ["meja", "pemesanan", "menu", "makanan"],
          answerIndex: 1,
          explanation: "'reservation' berarti 'pemesanan'.",
        },
      ],
      roleplay: {
        scenario: "Anda menelepon restoran untuk memesan meja.",
        lines: [
          { speaker: "ai", text: "Hello, how may I help you?" },
          { speaker: "user", text: "I'd like to reserve a table for three this evening." },
          { speaker: "ai", text: "Sure. What time and under what name?" },
        ],
        keyPhrases: ["I'd like to book a table", "Could I have", "What time", "under the name"],
      },
    },
  },
  {
    topic: "bank",
    title: "Buka Rekening di Bank",
    slug: "bank-open-account",
    isFree: true,
    content: {
      dialogues: [
        { speaker: "ai", text: "Welcome. How can I assist you today?" },
        { speaker: "user", text: "I'd like to open a savings account, please." },
        { speaker: "ai", text: "Sure. May I see your ID card and a recent photo?" },
        { speaker: "user", text: "Here you are. What is the minimum deposit?" },
      ],
      vocab: [
        { word: "savings account", meaning: "rekening tabungan" },
        { word: "deposit", meaning: "setoran awal" },
        { word: "withdraw", meaning: "menarik uang" },
        { word: "balance", meaning: "saldo" },
        { word: "teller", meaning: "petugas kasir bank" },
      ],
      quiz: [
        {
          question: "What does the customer want to do?",
          options: ["Close an account", "Open a savings account", "Exchange money", "Get a loan"],
          answerIndex: 1,
          explanation: "Tamu ingin 'open a savings account'.",
        },
        {
          question: "What documents does the teller ask for?",
          options: ["Passport and ticket", "ID card and a recent photo", "Credit card and phone", "Work letter only"],
          answerIndex: 1,
          explanation: "Teller meminta 'your ID card and a recent photo'.",
        },
        {
          question: "What is the meaning of 'withdraw'?",
          options: ["menyetor", "menarik uang", "menabung", "bertukar"],
          answerIndex: 1,
          explanation: "'withdraw' berarti 'menarik uang'.",
        },
        {
          question: "Where does this conversation take place?",
          options: ["At a shop", "At a bank", "At a school", "At a hotel"],
          answerIndex: 1,
          explanation: "Percakapan terjadi di bank.",
        },
      ],
      roleplay: {
        scenario: "Anda ingin membuka rekening tabungan di bank.",
        lines: [
          { speaker: "ai", text: "Hello. How may I help you?" },
          { speaker: "user", text: "I want to open a savings account. What do I need?" },
          { speaker: "ai", text: "You need your ID card and a small opening deposit." },
        ],
        keyPhrases: ["I'd like to open an account", "minimum deposit", "ID card", "fill out this form"],
      },
    },
  },
  {
    topic: "office",
    title: "Meeting Tim di Kantor",
    slug: "office-team-meeting",
    isFree: true,
    content: {
      dialogues: [
        { speaker: "ai", text: "Good morning, everyone. Let's start the meeting." },
        { speaker: "user", text: "Good morning. I'd like to share an update on the new project." },
        { speaker: "ai", text: "Great. Please go ahead." },
        { speaker: "user", text: "We finished the design phase, and we'll start testing next week." },
      ],
      vocab: [
        { word: "meeting", meaning: "rapat" },
        { word: "project", meaning: "proyek" },
        { word: "deadline", meaning: "tenggat waktu" },
        { word: "update", meaning: "pembaruan / laporan" },
        { word: "team", meaning: "tim" },
      ],
      quiz: [
        {
          question: "Where does this conversation happen?",
          options: ["At a bank", "At an office meeting", "At a party", "At a doctor's clinic"],
          answerIndex: 1,
          explanation: "Percakapan terjadi saat meeting di kantor.",
        },
        {
          question: "What does the employee share?",
          options: ["A recipe", "An update on the new project", "A personal story", "A travel plan"],
          answerIndex: 1,
          explanation: "Karyawan ingin 'share an update on the new project'.",
        },
        {
          question: "What happens next week according to the update?",
          options: ["The project will close", "Testing will start", "The team will rest", "The meeting ends"],
          answerIndex: 1,
          explanation: "Karyawan menyebut 'we'll start testing next week'.",
        },
        {
          question: "What does 'deadline' mean?",
          options: ["rapat", "tenggat waktu", "proyek", "laporan"],
          answerIndex: 1,
          explanation: "'deadline' berarti 'tenggat waktu'.",
        },
      ],
      roleplay: {
        scenario: "Anda sedang rapat tim dan diminta membagikan perkembangan proyek.",
        lines: [
          { speaker: "ai", text: "Okay, let's hear the update from your team." },
          { speaker: "user", text: "We are on schedule and the deadline is still on Friday." },
          { speaker: "ai", text: "Great. Let me know if you need any support." },
        ],
        keyPhrases: ["Let's start the meeting", "I'd like to share an update", "next week", "on schedule"],
      },
    },
  },
  {
    topic: "school",
    title: "Bertanya di Kelas",
    slug: "school-ask-in-class",
    isFree: true,
    content: {
      dialogues: [
        { speaker: "ai", text: "Class, please open your books to page twenty." },
        { speaker: "user", text: "Excuse me, could you explain this word again?" },
        { speaker: "ai", text: "Of course. It means 'to look for something'." },
        { speaker: "user", text: "Thank you. And what is the homework for tomorrow?" },
      ],
      vocab: [
        { word: "homework", meaning: "pekerjaan rumah" },
        { word: "explain", meaning: "menjelaskan" },
        { word: "page", meaning: "halaman" },
        { word: "understand", meaning: "memahami" },
        { word: "example", meaning: "contoh" },
      ],
      quiz: [
        {
          question: "Where does this conversation happen?",
          options: ["At a restaurant", "In a classroom", "At a bank", "On the phone"],
          answerIndex: 1,
          explanation: "Percakapan terjadi di kelas.",
        },
        {
          question: "What does the student ask the teacher?",
          options: ["For a holiday", "To explain a word again", "For extra credit", "To end the class"],
          answerIndex: 1,
          explanation: "Siswa meminta 'explain this word again'.",
        },
        {
          question: "What is the homework question about?",
          options: ["The exam date", "The homework for tomorrow", "The lunch menu", "The school trip"],
          answerIndex: 1,
          explanation: "Siswa bertanya 'what is the homework for tomorrow?'.",
        },
        {
          question: "What does 'understand' mean?",
          options: ["menjelaskan", "memahami", "membaca", "menulis"],
          answerIndex: 1,
          explanation: "'understand' berarti 'memahami'.",
        },
      ],
      roleplay: {
        scenario: "Anda di kelas dan ingin bertanya kepada guru.",
        lines: [
          { speaker: "ai", text: "Do you have any questions about today's lesson?" },
          { speaker: "user", text: "Yes, could you give me another example, please?" },
          { speaker: "ai", text: "Sure. Here is one more example for you." },
        ],
        keyPhrases: ["Excuse me", "Could you explain", "What is the homework", "I don't understand"],
      },
    },
  },
  {
    topic: "social",
    title: "Berkenalan di Pesta",
    slug: "social-meet-at-party",
    isFree: true,
    content: {
      dialogues: [
        { speaker: "ai", text: "Hi, I don't think we've met. I'm Andi." },
        { speaker: "user", text: "Nice to meet you, Andi. I'm Sari. How do you know the host?" },
        { speaker: "ai", text: "We work together. Are you having a good time?" },
        { speaker: "user", text: "Yes, the food is great and the music is fun." },
      ],
      vocab: [
        { word: "party", meaning: "pesta" },
        { word: "host", meaning: "tuan rumah" },
        { word: "introduce", meaning: "memperkenalkan" },
        { word: "small talk", meaning: "obrolan ringan" },
        { word: "invitation", meaning: "undangan" },
      ],
      quiz: [
        {
          question: "Where does this conversation happen?",
          options: ["At a meeting", "At a party", "At a bank", "At school"],
          answerIndex: 1,
          explanation: "Percakapan terjadi di pesta.",
        },
        {
          question: "How does Andi know the host?",
          options: ["They are neighbors", "They work together", "They are family", "They met online"],
          answerIndex: 1,
          explanation: "Andi menjawab 'We work together'.",
        },
        {
          question: "What does Sari like about the party?",
          options: ["The food and the music", "The weather", "The traffic", "The homework"],
          answerIndex: 0,
          explanation: "Sari berkata 'the food is great and the music is fun'.",
        },
        {
          question: "What does 'small talk' mean?",
          options: ["percakapan serius", "obrolan ringan", "rapat", "pidato"],
          answerIndex: 1,
          explanation: "'small talk' berarti 'obrolan ringan'.",
        },
      ],
      roleplay: {
        scenario: "Anda baru tiba di pesta dan ingin berkenalan dengan orang baru.",
        lines: [
          { speaker: "ai", text: "Hi there! I'm Rudi. Are you enjoying the party?" },
          { speaker: "user", text: "Yes, I am! I'm Maya. It's nice to meet you." },
          { speaker: "ai", text: "Nice to meet you too. Would you like something to drink?" },
        ],
        keyPhrases: ["Nice to meet you", "How do you know the host", "I don't think we've met", "enjoy the party"],
      },
    },
  },
  {
    topic: "customer_service",
    title: "Menangani Keluhan Pelanggan",
    slug: "customer-service-complaint",
    isFree: true,
    content: {
      dialogues: [
        { speaker: "ai", text: "Hello, thank you for calling our support line. How can I help?" },
        { speaker: "user", text: "I received a damaged product yesterday and I'd like a refund." },
        { speaker: "ai", text: "I'm sorry to hear that. Could you tell me your order number?" },
        { speaker: "user", text: "Yes, it's order number 4821. What do I need to do next?" },
      ],
      vocab: [
        { word: "complaint", meaning: "keluhan" },
        { word: "refund", meaning: "pengembalian dana" },
        { word: "damaged", meaning: "rusak" },
        { word: "order number", meaning: "nomor pesanan" },
        { word: "apologize", meaning: "meminta maaf" },
      ],
      quiz: [
        {
          question: "What is the customer's problem?",
          options: ["Late delivery", "A damaged product", "Wrong size", "High price"],
          answerIndex: 1,
          explanation: "Pelanggan menerima 'a damaged product'.",
        },
        {
          question: "What does the customer want?",
          options: ["A free gift", "A refund", "A new phone number", "A discount code"],
          answerIndex: 1,
          explanation: "Pelanggan minta 'a refund'.",
        },
        {
          question: "What information does the agent ask for?",
          options: ["A home address", "The order number", "A credit card", "A photo"],
          answerIndex: 1,
          explanation: "Agen meminta 'your order number'.",
        },
        {
          question: "What does 'apologize' mean?",
          options: ["menjelaskan", "meminta maaf", "menjawab", "mengembalikan"],
          answerIndex: 1,
          explanation: "'apologize' berarti 'meminta maaf'.",
        },
      ],
      roleplay: {
        scenario: "Anda melayani pelanggan yang ingin mengeluhkan barang rusak.",
        lines: [
          { speaker: "user", text: "Hello, my order arrived broken." },
          { speaker: "ai", text: "I'm very sorry about that. We will send a replacement right away." },
          { speaker: "user", text: "Thank you. How long will it take?" },
        ],
        keyPhrases: ["I'm sorry to hear that", "I'd like a refund", "order number", "we will send a replacement"],
      },
    },
  },
];