import type { CalendarEvent } from '../services/googleCalendar';
import type { Language, PlayerProfile } from '../types';
import { getActiveDreamStep } from './coaching';
import type { DailyEvidence, DayPhase } from './journal';

type Text = Record<Language, string>;

// Original paraphrases inspired by themes of rest, gratitude, trust, and faithful work.
const themes = {
  care: [
    { id: 'Tuhan menyediakan ruang untuk beristirahat. Kamu bisa meletakkan beban sejenak sebelum memilih langkah yang sanggup kamu jalani.', en: 'God makes room for rest. Set the burden down for a moment before choosing a step you have the strength to take.' },
    { id: 'Kamu boleh datang kepada Tuhan dengan perasaan yang belum rapi. Kejujuran itu bisa menjadi awal dari doa yang sederhana.', en: 'You can come to God with feelings you have yet to sort out. Honesty can be the beginning of a simple prayer.' },
    { id: 'Hadapi bagian hari ini yang ada di depanmu. Titipkan hal yang masih di luar kendalimu kepada Tuhan, satu per satu.', en: 'Meet the part of the day in front of you. Entrust what lies outside your control to God, one thing at a time.' },
    { id: 'Ada waktunya mengambil langkah dan ada waktunya menerima pertolongan. Pikirkan satu orang yang bisa berjalan bersamamu hari ini.', en: 'There is a time to take a step and a time to receive help. Think of one person who could walk with you today.' },
    { id: 'Tuhan tetap dekat pada hari yang sulit. Jadikan beberapa menit yang tenang sebagai kesempatan untuk bernapas dan mengakui apa yang berat.', en: 'God stays near on difficult days. Use a few quiet minutes to breathe and acknowledge what feels heavy.' },
    { id: 'Kalau hari ini rencanamu berubah, kamu masih bisa menjalani bagian kecil yang tersisa dengan kasih dan kesabaran.', en: 'If your plans change today, you can still meet the small part that remains with love and patience.' },
    { id: 'Biarkan doa berjalan seiring dengan jeda. Kamu bisa kembali pada pekerjaan ketika sudah punya ruang untuk melihatnya dengan lebih jernih.', en: 'Let prayer accompany a pause. You can return to the work once you have room to see it more clearly.' },
  ],
  gratitude: [
    { id: 'Nikmati kebaikan yang kamu jumpai hari ini. Mengingat siapa yang ikut menolongmu membuat rasa syukur itu lebih nyata.', en: 'Enjoy the good you encountered today. Remembering who helped you makes that gratitude more concrete.' },
    { id: 'Perhatikan satu kesempatan yang membuka jalan hari ini. Kamu bisa meneruskan kebaikan itu lewat hal sederhana untuk orang lain.', en: 'Notice one opportunity that made a way for you today. You can pass that kindness on in a small way.' },
    { id: 'Dengan bersyukur, kamu bisa melihat bagaimana hal-hal kecil yang dikerjakan dengan tekun mulai memberi hasil.', en: 'Gratitude helps you see how small acts of steady effort are beginning to bear fruit.' },
    { id: 'Ingat momen ketika hatimu terasa lapang. Bawa momen itu kepada Tuhan dan lihat apakah ada orang yang bisa kamu kuatkan.', en: 'Recall a moment when your heart felt at ease. Bring it to God and consider someone you could encourage.' },
    { id: 'Luangkan waktu untuk merayakan kemajuan yang bisa kamu lihat. Ingat juga proses dan orang yang membantu sampai sejauh ini.', en: 'Take time to celebrate the progress you can see. Remember the process and people who helped you get here.' },
    { id: 'Terima kebaikan hari ini dengan hati terbuka. Kamu bisa menjaganya dengan memperhatikan orang yang berjalan di sampingmu.', en: 'Receive today’s good with an open heart. Carry it forward by paying attention to those walking beside you.' },
    { id: 'Syukur bisa dimulai dari satu hal yang kelihatannya biasa. Sebutkan hal itu di hadapan Tuhan sebelum beralih ke rencana berikutnya.', en: 'Gratitude can begin with one seemingly ordinary thing. Name it before God before turning to the next plan.' },
  ],
  faithfulness: [
    { id: 'Rawat tanggung jawab yang ada di tanganmu. Kesetiaan dalam satu langkah kecil bisa membawa kebaikan yang belum terlihat hari ini.', en: 'Care for the responsibility in your hands. Faithfulness in one small step can bring good you cannot yet see.' },
    { id: 'Di tengah banyak pilihan, carilah langkah yang memberi manfaat nyata bagi seseorang. Mintalah hikmat sebelum mulai.', en: 'Among your choices, look for a step that will truly help someone. Ask for wisdom before you begin.' },
    { id: 'Bawa rencanamu kepada Tuhan dan beri ruang untuk mendengarkan. Masukan dari orang lain bisa menunjukkan bagian yang perlu diubah.', en: 'Bring your plans to God and make room to listen. Advice from another person may reveal something worth changing.' },
    { id: 'Bekerjalah dengan jujur pada bagian yang bisa kamu pegang hari ini. Kamu bisa menilai hasilnya dengan tenang setelah langkah itu selesai.', en: 'Do the part you can handle today with honesty. You can evaluate the result calmly when that step is done.' },
    { id: 'Kemajuan bisa bertumbuh lewat kebiasaan yang dijalani dengan sabar. Perhatikan apa yang sudah kamu pelajari dari prosesnya.', en: 'Progress can grow through habits practiced patiently. Notice what the process has already taught you.' },
    { id: 'Mulailah dari hal yang bisa kamu kerjakan dengan sungguh-sungguh. Percayakan dampak yang belum bisa kamu ukur kepada Tuhan.', en: 'Begin with what you can do wholeheartedly. Entrust the impact you cannot yet measure to God.' },
    { id: 'Perhatikan kebutuhan orang yang akan menerima hasil kerjamu. Itu bisa membantumu memilih apa yang perlu dikerjakan lebih dahulu.', en: 'Pay attention to the needs of the people who will receive your work. That can help you choose what to do first.' },
  ],
} satisfies Record<string, Text[]>;

const questions: Text[] = [
  { id: 'Apa yang ingin kamu serahkan kepada Tuhan sekarang?', en: 'What would you like to entrust to God right now?' },
  { id: 'Kebaikan kecil apa yang bisa kamu teruskan hari ini?', en: 'What small kindness could you pass on today?' },
  { id: 'Apa yang layak kamu syukuri dari prosesmu akhir-akhir ini?', en: 'What about your recent progress is worth giving thanks for?' },
  { id: 'Apa satu hal yang bisa kamu jalani dengan lebih tenang?', en: 'What is one thing you can approach more calmly?' },
  { id: 'Siapa yang bisa kamu dengarkan atau kuatkan dalam agenda berikutnya?', en: 'Who could you listen to or encourage in what comes next?' },
  { id: 'Bagian mana yang bisa kamu kerjakan dengan setia hari ini?', en: 'Which part can you do faithfully today?' },
  { id: 'Dukungan apa yang ingin kamu minta hari ini?', en: 'What support would you like to ask for today?' },
  { id: 'Apa satu keputusan yang ingin kamu bawa dalam doa?', en: 'What is one decision you would like to bring to prayer?' },
  { id: 'Apa yang bisa memberi ruang untuk jeda hari ini?', en: 'What could make room for a pause today?' },
  { id: 'Siapa yang ingin kamu ingat dan doakan hari ini?', en: 'Who would you like to remember and pray for today?' },
  { id: 'Apa yang akan membantumu menutup hari dengan hati lapang?', en: 'What would help you close the day with an open heart?' },
];

const prayers: Text[] = [
  { id: 'Beri aku hikmat untuk memilih satu langkah dan hati yang sabar menjalaninya.', en: 'Give me wisdom to choose one step and patience as I take it.' },
  { id: 'Tolong aku menerima pertolongan dan memperlakukan orang lain dengan lembut.', en: 'Help me receive support and treat others with gentleness.' },
  { id: 'Ajari aku memberi perhatian penuh pada hal kecil yang ada di hadapanku.', en: 'Teach me to give my full attention to the small thing in front of me.' },
  { id: 'Tenangkan pikiranku saat rencana berubah dan tunjukkan apa yang masih bisa kulakukan.', en: 'Quiet my thoughts when plans change and show me what I can still do.' },
  { id: 'Beri aku keberanian untuk meminta masukan dan kerendahan hati untuk mendengarkan.', en: 'Give me courage to ask for advice and humility to listen.' },
];

const moodText: Record<Exclude<DailyEvidence['mood'], ''>, Text> = {
  calm: { id: 'Kamu merasa tenang hari ini. Gunakan ruang itu untuk mendengarkan dengan lebih saksama.', en: 'You feel calm today. Use that space to listen more closely.' },
  hopeful: { id: 'Ada harapan yang kamu rasakan hari ini. Bawa harapan itu ke satu langkah yang bisa kamu mulai.', en: 'You feel hopeful today. Let that hope guide one step you can begin.' },
  grateful: { id: 'Kamu mencatat rasa syukur hari ini. Ingat satu hal yang membuatmu merasakannya.', en: 'You noted that you feel grateful today. Recall one thing that brought it about.' },
  anxious: { id: 'Kamu merasa cemas hari ini. Beri ruang untuk menyebutkan apa yang paling mengusik pikiranmu.', en: 'You feel anxious today. Give yourself room to name what is on your mind.' },
  overwhelmed: { id: 'Kamu merasa kewalahan. Pilih satu hal untuk ditangani sekarang dan beri ruang bagi yang lain untuk menunggu.', en: 'You feel overwhelmed. Choose one thing to address now and let the rest wait.' },
  sad: { id: 'Kamu merasa sedih hari ini. Bawa perasaan itu dalam doa dan beri dirimu waktu untuk menjalaninya.', en: 'You feel sad today. Bring that feeling into prayer and give yourself time to sit with it.' },
  mixed: { id: 'Perasaanmu bercampur hari ini. Coba beri nama pada yang paling terasa saat ini.', en: 'You have mixed feelings today. Try naming the one that feels strongest right now.' },
  neutral: { id: 'Hari ini terasa biasa saja. Beri perhatian pada satu hal kecil yang berharga untukmu.', en: 'Today feels ordinary. Notice one small thing that matters to you.' },
};

export interface DailyReflection {
  message: string;
  question: string;
  prayer: string;
}

const shortLine = (value?: string) => (value ?? '').split('\n')[0].trim().replace(/\s+/g, ' ').slice(0, 110);

function prayerForCalendar(events: CalendarEvent[], dateKey: string, now: number, lang: Language) {
  const today = new Date(dateKey + 'T00:00:00');
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const afterTomorrow = new Date(tomorrow);
  afterTomorrow.setDate(tomorrow.getDate() + 1);
  const timed = events.filter((event) => shortLine(event.title)).map((event) => {
    const start = Date.parse(event.allDay ? event.start.slice(0, 10) + 'T00:00:00' : event.start);
    const end = Date.parse(event.allDay ? event.end.slice(0, 10) + 'T00:00:00' : event.end);
    return { title: shortLine(event.title), start, end: Number.isFinite(end) ? end : start, allDay: event.allDay };
  }).filter((event) => Number.isFinite(event.start)).sort((a, b) => a.start - b.start);
  const todaysEvents = timed.filter((event) => event.start < +tomorrow && (event.end > +today || event.start >= +today));
  const upcoming = todaysEvents.filter((event) => event.end > now || event.start >= now);
  const current = upcoming.find((event) => !event.allDay) ?? upcoming[0];
  const past = todaysEvents.at(-1);
  const next = timed.find((event) => event.start >= +tomorrow && event.start < +afterTomorrow);
  const id = lang === 'id';
  if (current) return id ? `Sertai aku dalam agenda “${current.title}” hari ini. Beri aku ketenangan, hikmat, dan perhatian kepada orang yang terlibat.` :
    `Be with me in today’s event “${current.title}.” Give me a calm mind, wisdom, and care for the people involved.`;
  if (past) return id ? `Aku membawa kembali agenda “${past.title}” kepada-Mu. Tunjukkan apa yang bisa kusyukuri dan apa yang perlu kutindaklanjuti.` :
    `I bring the event “${past.title}” back to You. Show me what I can give thanks for and what I should follow up on.`;
  if (next) return id ? `Sertai persiapanku untuk “${next.title}” besok. Tolong aku mempersiapkan yang perlu dengan tenang.` :
    `Be with me as I prepare for tomorrow’s “${next.title}.” Help me calmly get ready for what is needed.`;
  return '';
}

export function createDailyReflection({ owner, player, evidence, events, dateKey, phase, now, lang }: {
  owner: string; player: PlayerProfile; evidence: DailyEvidence; events: CalendarEvent[];
  dateKey: string; phase: DayPhase; now: number; lang: Language;
}): DailyReflection {
  const id = lang === 'id';
  let seed = 2166136261;
  for (const char of owner) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  const day = Math.floor(Date.parse(dateKey + 'T00:00:00Z') / 86400000);
  const mood = evidence.mood;
  const heavier = mood === 'anxious' || mood === 'overwhelmed' || mood === 'sad';
  const lowEnergy = evidence.status === 'rest' || evidence.shortSleep || evidence.meal === 'skipped';
  const thankful = mood === 'grateful' || (phase === 'evening' && evidence.completedCount > 0);
  const bank = heavier || lowEnergy ? themes.care : thankful ? themes.gratitude : themes.faithfulness;
  const message = bank[(day + seed) % bank.length][lang];
  const question = questions[(day + (seed >>> 8)) % questions.length][lang];
  const achievement = shortLine(evidence.completed[0]);
  const plan = shortLine(evidence.plan);
  const step = getActiveDreamStep(player);
  const nextFocus = shortLine(player.career?.projectStatus === 'blocked' && player.career.project
    ? player.career.project : step && step.completedMinutes > 0 ? step.title : player.goal);
  let context = '';
  if (achievement) context = id ? `Kamu sudah mencatat “${achievement}”. Hargai usaha yang membawamu sampai ke sana.` :
    `You recorded “${achievement}.” Take a moment to appreciate the effort that got you there.`;
  else if (plan) context = id ? `Untuk rencana “${plan}”, pilih bagian yang sanggup kamu jalani hari ini.` :
    `For your plan “${plan},” choose the part you have room for today.`;
  else if (nextFocus) context = id ? `Bawa fokusmu pada “${nextFocus}” dalam doa, mulai dari satu langkah kecil.` :
    `Bring your focus on “${nextFocus}” into prayer, beginning with one small step.`;

  const condition = evidence.shortSleep
    ? (id ? `Kamu mencatat tidur ${evidence.sleep} jam. Sisakan waktu untuk jeda.` : `You logged ${evidence.sleep} hours of sleep. Leave room for a pause.`)
    : evidence.meal === 'skipped'
      ? (id ? 'Kamu mencatat waktu makan yang terlewat. Luangkan waktu untuk merawat dirimu.' : 'You logged a missed meal. Make time to care for yourself.')
      : '';
  const personal = mood ? moodText[mood]?.[lang] : '';
  const calendarPrayer = prayerForCalendar(events, dateKey, now, lang);
  const startPrayer = heavier || lowEnergy
    ? (id ? 'Tuhan, aku membawa apa yang memberatkan hari ini kepada-Mu.' : 'God, I bring what feels heavy today to You.')
    : (id ? 'Tuhan, terima kasih untuk kesempatan menjalani hari ini.' : 'God, thank You for the chance to live this day.');
  const closingPrayer = calendarPrayer || prayers[(day + (seed >>> 16)) % prayers.length][lang];
  const name = shortLine(player.name);
  const opening = /^(Tuhan|God)\b/.test(message) ? message : message[0].toLowerCase() + message.slice(1);
  return {
    message: [name ? `${name}, ${opening}` : message, personal, condition, context].filter(Boolean).join(' '),
    question,
    prayer: `${startPrayer} ${closingPrayer}`,
  };
}
