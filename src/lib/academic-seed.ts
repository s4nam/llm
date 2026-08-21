import type { AcademicSetContent, AcademicSection } from "@/lib/types-academic";

/**
 * Konten cadangan (seed) untuk modul Latihan Akademik.
 * Dipakai bila tabel toefl_sets masih kosong — agar modul langsung berfungsi
 * sebelum admin generate via AI. Semua konten ORISINAL (bukan materi ETS).
 */

export interface AcademicSeedSet {
  section: AcademicSection;
  title: string;
  slug: string;
  content: AcademicSetContent;
  isFree?: boolean;
}

export const ACADEMIC_SEED: AcademicSeedSet[] = [
  {
    section: "reading",
    title: "The History of Coffee",
    slug: "reading-history-of-coffee",
    isFree: true,
    content: {
      passages: [
        {
          title: "The Origins of Coffee",
          text: "Coffee cultivation is believed to have begun in the highlands of Ethiopia, where the plant Coffea arabica grows wild. According to popular legend, a goat herder noticed that his animals became unusually energetic after eating the berries of a certain shrub. The herder reported his discovery to a local monastery, where monks brewed the berries into a drink that helped them stay awake during long prayers. From Ethiopia, the practice of brewing coffee spread across the Red Sea to the Arabian Peninsula. By the fifteenth century, coffeehouses known as qahveh khaneh had appeared in cities such as Mecca and Cairo, serving as places where people gathered to talk, listen to music, and play chess. The beverage was prized not only for its taste but also for its stimulating effects, and its popularity grew steadily throughout the Islamic world.",
          questions: [
            {
              question: "According to the legend, who first noticed the effects of coffee berries?",
              options: [
                "A monk at a local monastery",
                "A goat herder in Ethiopia",
                "A merchant in Mecca",
                "A scholar in Cairo",
              ],
              answerIndex: 1,
              explanation: "Legenda menyebut seorang penggembala kambing melihat kambingnya jadi energik setelah makan buah semak tersebut.",
              type: "detail",
            },
            {
              question: "The word 'prized' in the passage is closest in meaning to...",
              options: ["ignored", "valued", "feared", "forgotten"],
              answerIndex: 1,
              explanation: "'Prized' berarti sangat dihargai = 'valued'.",
              type: "vocabulary-in-context",
            },
            {
              question: "What can be inferred about early coffeehouses?",
              options: [
                "They were exclusively used by religious figures.",
                "They served as social gathering places.",
                "They refused to serve tea.",
                "They were located only in Ethiopia.",
              ],
              answerIndex: 1,
              explanation: "Teks menyebut coffeehouse jadi tempat orang berkumpul, bicara, dan bermain catur — jadi tempat berkumpul sosial.",
              type: "inference",
            },
            {
              question: "Why does the author mention 'qahveh khaneh'?",
              options: [
                "To describe a type of coffee bean",
                "To illustrate how coffee spread culturally",
                "To compare coffee to tea",
                "To explain the decline of coffee",
              ],
              answerIndex: 1,
              explanation: "Penyebutan coffeehouse menunjukkan bagaimana kopi menyebar dan menjadi bagian budaya sosial.",
              type: "rhetorical purpose",
            },
            {
              question: "Where does the following sentence best fit? 'The new drink soon became a staple of daily life.'",
              options: [
                "At the end of the first sentence",
                "After the description of the monastery",
                "After the sentence about the Arabian Peninsula",
                "At the very end of the passage",
              ],
              answerIndex: 2,
              explanation: "Setelah penyebaran ke Semenanjung Arab, kalimat tersebut secara logis menutup perkembangan popularitas kopi.",
              type: "sentence insertion",
            },
          ],
        },
      ],
    },
  },
  {
    section: "listening",
    title: "A Campus Conversation: Library Hours",
    slug: "listening-library-hours",
    isFree: true,
    content: {
      scripts: [
        {
          title: "At the University Library",
          script:
            "Student: Excuse me, I was wondering when the library closes on weekends. I have a big paper due Monday and I really need a quiet place to study tonight. \n\nLibrarian: Sure. On Saturdays we're open from nine in the morning until ten at night, and on Sundays we open at noon and close at eight. But tonight, since it's Friday, we're open until midnight. \n\nStudent: Oh, that's great. Is the study room on the third floor available tonight? \n\nLibrarian: The group study rooms are available, but you'll need to reserve one at the front desk because they fill up quickly on weekends. The individual study carrels on the second floor, however, are first-come, first-served. \n\nStudent: Perfect. One more thing — is the Wi-Fi connection reliable in the building? \n\nLibrarian: Generally yes. If you have trouble, the IT help desk on the first floor can assist you until nine. After that, there's a network map near each study area that lists the available connections. \n\nStudent: That helps a lot. I'll go reserve a room right away. Thank you!",
          questions: [
            {
              question: "What is the student's main purpose in visiting the library?",
              options: [
                "To return a borrowed book",
                "To find a quiet place to study",
                "To apply for a library job",
                "To ask about Wi-Fi passwords",
              ],
              answerIndex: 1,
              explanation: "Siswa butuh tempat tenang untuk mengerjakan paper yang jatuh tempo Senin.",
              type: "gist-purpose",
            },
            {
              question: "How late is the library open on Friday nights?",
              options: ["8 PM", "9 PM", "10 PM", "Midnight"],
              answerIndex: 3,
              explanation: "Pustakawan berkata Jumat buka sampai tengah malam.",
              type: "detail",
            },
            {
              question: "What does the librarian say about the group study rooms?",
              options: [
                "They require a reservation at the front desk.",
                "They are always available on weekends.",
                "They are located on the second floor.",
                "They close at eight o'clock.",
              ],
              answerIndex: 0,
              explanation: "Ruangan kelompok perlu dipesan di meja depan karena cepat penuh.",
              type: "detail",
            },
            {
              question: "Why does the librarian mention the IT help desk?",
              options: [
                "To suggest the student print her paper there",
                "To explain where to get Wi-Fi assistance",
                "To warn about network problems",
                "To direct the student to a different building",
              ],
              answerIndex: 1,
              explanation: "Meja bantuan IT bisa membantu masalah Wi-Fi sampai pukul sembilan.",
              type: "speaker function",
            },
            {
              question: "What can be inferred about the student?",
              options: [
                "She has already finished her paper.",
                "She is in a hurry to reserve a room.",
                "She usually studies at home.",
                "She is a new librarian.",
              ],
              answerIndex: 1,
              explanation: "Dia bilang 'I'll go reserve a room right away' — menunjukkan dia buru-buru.",
              type: "inference",
            },
          ],
        },
      ],
    },
  },
  {
    section: "writing",
    title: "Should Students Have Part-Time Jobs?",
    slug: "writing-part-time-jobs",
    isFree: true,
    content: {
      task: {
        taskType: "independent",
        prompt:
          "Some universities encourage students to take part-time jobs while studying. Do you agree or disagree that part-time work benefits university students? Use specific reasons and examples to support your answer.",
        context: "",
        rubric: [
          { name: "Task Response", weight: 25 },
          { name: "Coherence & Organization", weight: 25 },
          { name: "Vocabulary", weight: 25 },
          { name: "Grammar & Accuracy", weight: 25 },
        ],
        timeMinutes: 30,
      },
    },
  },
  {
    section: "speaking",
    title: "Opinions and Campus Life",
    slug: "speaking-opinions",
    isFree: true,
    content: {
      tasks: [
        {
          prompt:
            "Describe a memorable place you have visited and explain why it was memorable. Include specific details and examples.",
          prepSeconds: 15,
          speakSeconds: 45,
        },
        {
          prompt:
            "The university plans to close the campus coffee shop. Read the notice and conversation, then explain the student's opinion and the reasons she gives.",
          prepSeconds: 30,
          speakSeconds: 60,
        },
        {
          prompt:
            "Using points from the lecture, explain how the 'spacing effect' improves memory, and give the example the professor provides.",
          prepSeconds: 30,
          speakSeconds: 60,
        },
        {
          prompt:
            "The professor discusses two views on remote work. Explain which view you agree with and why, using the professor's points and your own reasoning.",
          prepSeconds: 20,
          speakSeconds: 60,
        },
      ],
    },
  },
];

/** Slugs yang dianggap "sudah punya konten" (dipakai fallback landing). */
export const ACADEMIC_SEED_BY_SECTION: Record<AcademicSection, AcademicSeedSet[]> = {
  reading: ACADEMIC_SEED.filter((s) => s.section === "reading"),
  listening: ACADEMIC_SEED.filter((s) => s.section === "listening"),
  writing: ACADEMIC_SEED.filter((s) => s.section === "writing"),
  speaking: ACADEMIC_SEED.filter((s) => s.section === "speaking"),
};
