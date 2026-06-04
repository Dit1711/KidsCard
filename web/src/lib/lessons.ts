// Editorial financial-literacy content for the child cabinet. The backend only
// stores progress (completed lesson ids + stars); the lessons themselves live
// here so they're easy to edit without a deploy/migration.
//
// Content is localized (ru/uz/en). Lesson ids and emojis are shared across
// locales — only the prose differs — so progress stored by the backend stays
// valid no matter which language the child reads in.

import { getRuntimeLocale } from "@/i18n/runtime";

export interface Quiz {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface Lesson {
  id: string;
  emoji: string;
  title: string;
  intro: string;
  body: string[];
  quiz: Quiz;
  stars: number;
}

const LESSONS_RU: Lesson[] = [
  {
    id: "what-is-money",
    emoji: "💰",
    title: "Что такое деньги",
    intro: "Откуда берутся деньги и зачем они нужны.",
    body: [
      "Деньги — это то, чем мы платим за вещи: еду, игрушки, билет в кино. В Узбекистане деньги называются сумы.",
      "Раньше люди менялись: давали козу, а получали мешок зерна. Это было неудобно! Деньги придумали, чтобы менять было просто.",
      "Деньги нельзя печатать дома — это делает только государство. Поэтому их нужно беречь и тратить с умом.",
    ],
    quiz: {
      question: "Как называются деньги в Узбекистане?",
      options: ["Доллары", "Сумы", "Рубли"],
      correctIndex: 1,
    },
    stars: 5,
  },
  {
    id: "needs-vs-wants",
    emoji: "🤔",
    title: "Нужное и желанное",
    intro: "Чем «надо» отличается от «хочу».",
    body: [
      "Нужное — это то, без чего трудно прожить: еда, одежда, школа.",
      "Желанное — это то, что приятно, но можно подождать: новая игра, сладости, игрушка.",
      "Сначала тратим на нужное, а на желанное — копим. Так деньги не закончатся в самый важный момент.",
    ],
    quiz: {
      question: "Что из этого «нужное»?",
      options: ["Конфеты", "Обед", "Новая игра"],
      correctIndex: 1,
    },
    stars: 5,
  },
  {
    id: "saving",
    emoji: "🐷",
    title: "Зачем копить",
    intro: "Как маленькие суммы превращаются в большую мечту.",
    body: [
      "Если откладывать понемногу каждую неделю, накопится много. Это называется копить.",
      "Когда копишь на счёте, на деньги капает процент — банк добавляет немного сверху. Деньги растут сами!",
      "Поставь цель: например, велосипед. Каждый раз, когда откладываешь, ты ближе к мечте.",
    ],
    quiz: {
      question: "Что происходит с деньгами на копилке-счёте?",
      options: ["Они исчезают", "На них капает процент", "Их забирает банк"],
      correctIndex: 1,
    },
    stars: 5,
  },
  {
    id: "budget",
    emoji: "📊",
    title: "Планируем траты",
    intro: "Что такое бюджет и зачем считать деньги.",
    body: [
      "Бюджет — это план: сколько у тебя есть и на что потратишь.",
      "Полезное правило: часть денег потрать, часть отложи, часть — на доброе дело.",
      "Лимиты в приложении помогают не потратить всё сразу. Это как тренер, который бережёт твои деньги.",
    ],
    quiz: {
      question: "Для чего нужен бюджет?",
      options: ["Чтобы спланировать траты", "Чтобы потратить всё сразу", "Чтобы спрятать деньги"],
      correctIndex: 0,
    },
    stars: 5,
  },
  {
    id: "earning",
    emoji: "💪",
    title: "Как зарабатывают",
    intro: "Деньги приходят за труд и пользу.",
    body: [
      "Взрослые получают деньги за работу. Ты тоже можешь зарабатывать — выполняя задания и помогая по дому.",
      "За выполненное задание ты получаешь награду на карту. Это честные, заработанные деньги.",
      "Чем больше полезных дел — тем больше можно накопить на мечту.",
    ],
    quiz: {
      question: "Как получить награду за задание?",
      options: ["Просто попросить", "Выполнить его", "Подождать"],
      correctIndex: 1,
    },
    stars: 5,
  },
  {
    id: "safety",
    emoji: "🛡️",
    title: "Деньги в безопасности",
    intro: "Как защитить свои деньги и карту.",
    body: [
      "ПИН-код и пароль — это секрет. Никому их не говори, даже друзьям.",
      "Если кто-то просит перевести деньги или сообщить код — сначала спроси у родителей.",
      "Покупай только в надёжных местах. Если что-то кажется обманом — это, скорее всего, обман.",
    ],
    quiz: {
      question: "Кому можно говорить свой ПИН-код?",
      options: ["Лучшему другу", "Никому", "Продавцу в магазине"],
      correctIndex: 1,
    },
    stars: 5,
  },
];

const LESSONS_UZ: Lesson[] = [
  {
    id: "what-is-money",
    emoji: "💰",
    title: "Pul nima",
    intro: "Pul qayerdan keladi va nima uchun kerak.",
    body: [
      "Pul — bu narsalar uchun to'laydigan vositamiz: ovqat, o'yinchoq, kinoga chipta. O'zbekistonda pul so'm deb ataladi.",
      "Ilgari odamlar ayirboshlashardi: echki berib, bir qop don olishardi. Bu noqulay edi! Ayirboshlashni osonlashtirish uchun pul o'ylab topilgan.",
      "Pulni uyda chop etib bo'lmaydi — buni faqat davlat qiladi. Shuning uchun uni asrash va aql bilan sarflash kerak.",
    ],
    quiz: {
      question: "O'zbekistonda pul qanday ataladi?",
      options: ["Dollar", "So'm", "Rubl"],
      correctIndex: 1,
    },
    stars: 5,
  },
  {
    id: "needs-vs-wants",
    emoji: "🤔",
    title: "Zarur va istalgan",
    intro: "«Kerak» «xohlayman»dan nimasi bilan farq qiladi.",
    body: [
      "Zarur narsa — busiz yashash qiyin bo'lgan narsa: ovqat, kiyim, maktab.",
      "Istalgan narsa — yoqimli, lekin kutsa bo'ladigan narsa: yangi o'yin, shirinlik, o'yinchoq.",
      "Avval zarurga sarflaymiz, istalganga esa jamg'aramiz. Shunda pul eng muhim damda tugab qolmaydi.",
    ],
    quiz: {
      question: "Bulardan qaysi biri «zarur»?",
      options: ["Konfet", "Tushlik", "Yangi o'yin"],
      correctIndex: 1,
    },
    stars: 5,
  },
  {
    id: "saving",
    emoji: "🐷",
    title: "Nega jamg'arish kerak",
    intro: "Kichik summalar qanday qilib katta orzuga aylanadi.",
    body: [
      "Har hafta ozdan chetga qo'ysang, ko'p yig'iladi. Bu jamg'arish deyiladi.",
      "Hisobda jamg'arsang, pulingga foiz qo'shiladi — bank ustiga ozroq qo'shadi. Pul o'zi o'sadi!",
      "Maqsad qo'y: masalan, velosiped. Har safar chetga qo'yganingda, orzuingga yaqinlashasan.",
    ],
    quiz: {
      question: "Jamg'arma hisobidagi pulga nima bo'ladi?",
      options: ["Yo'qoladi", "Unga foiz qo'shiladi", "Bank olib qo'yadi"],
      correctIndex: 1,
    },
    stars: 5,
  },
  {
    id: "budget",
    emoji: "📊",
    title: "Xarajatlarni rejalashtiramiz",
    intro: "Byudjet nima va nega pulni sanash kerak.",
    body: [
      "Byudjet — bu reja: qancha pulingiz bor va uni nimaga sarflaysiz.",
      "Foydali qoida: pulning bir qismini sarfla, bir qismini jamg'ar, bir qismini ezgu ishga ber.",
      "Ilovadagi limitlar hammasini birdan sarflamaslikka yordam beradi. Ular pulingni asraydigan murabbiy kabi.",
    ],
    quiz: {
      question: "Byudjet nima uchun kerak?",
      options: ["Xarajatlarni rejalashtirish uchun", "Hammasini birdan sarflash uchun", "Pulni yashirish uchun"],
      correctIndex: 0,
    },
    stars: 5,
  },
  {
    id: "earning",
    emoji: "💪",
    title: "Qanday pul topiladi",
    intro: "Pul mehnat va foyda evaziga keladi.",
    body: [
      "Kattalar ish uchun pul oladi. Sen ham topishing mumkin — topshiriqlarni bajarib va uy ishlariga yordam berib.",
      "Bajarilgan topshiriq uchun kartangga mukofot olasan. Bu halol, mehnat bilan topilgan pul.",
      "Qancha ko'p foydali ish qilsang, orzuingga shuncha ko'p jamg'arasan.",
    ],
    quiz: {
      question: "Topshiriq uchun mukofotni qanday olasan?",
      options: ["Shunchaki so'rab", "Uni bajarib", "Kutib"],
      correctIndex: 1,
    },
    stars: 5,
  },
  {
    id: "safety",
    emoji: "🛡️",
    title: "Pul xavfsizligi",
    intro: "O'z pulingni va kartangni qanday himoya qilish.",
    body: [
      "PIN-kod va parol — bu sir. Hech kimga, hatto do'stlaringga ham aytma.",
      "Kimdir pul o'tkazishni yoki kodni aytishni so'rasa — avval ota-onangdan so'ra.",
      "Faqat ishonchli joylardan xarid qil. Agar nimadir aldovga o'xshasa — bu, ehtimol, aldov.",
    ],
    quiz: {
      question: "PIN-kodingni kimga aytish mumkin?",
      options: ["Eng yaqin do'stga", "Hech kimga", "Do'kondagi sotuvchiga"],
      correctIndex: 1,
    },
    stars: 5,
  },
];

const LESSONS_EN: Lesson[] = [
  {
    id: "what-is-money",
    emoji: "💰",
    title: "What is money",
    intro: "Where money comes from and why we need it.",
    body: [
      "Money is what we use to pay for things: food, toys, a movie ticket. In Uzbekistan money is called soʻm.",
      "Long ago people bartered: they gave a goat and got a sack of grain. That was inconvenient! Money was invented to make trading simple.",
      "You can't print money at home — only the government does. So you should look after it and spend it wisely.",
    ],
    quiz: {
      question: "What is money called in Uzbekistan?",
      options: ["Dollars", "Soʻm", "Rubles"],
      correctIndex: 1,
    },
    stars: 5,
  },
  {
    id: "needs-vs-wants",
    emoji: "🤔",
    title: "Needs and wants",
    intro: "How a 'need' differs from a 'want'.",
    body: [
      "A need is something you can hardly live without: food, clothes, school.",
      "A want is something nice that can wait: a new game, sweets, a toy.",
      "First we spend on needs and save up for wants. That way money won't run out at the most important moment.",
    ],
    quiz: {
      question: "Which of these is a 'need'?",
      options: ["Candy", "Lunch", "A new game"],
      correctIndex: 1,
    },
    stars: 5,
  },
  {
    id: "saving",
    emoji: "🐷",
    title: "Why save",
    intro: "How small amounts turn into a big dream.",
    body: [
      "If you set aside a little every week, a lot adds up. This is called saving.",
      "When you save in an account, your money earns interest — the bank adds a bit on top. Money grows by itself!",
      "Set a goal: a bicycle, for example. Every time you set money aside, you get closer to your dream.",
    ],
    quiz: {
      question: "What happens to money in a savings account?",
      options: ["It disappears", "It earns interest", "The bank takes it"],
      correctIndex: 1,
    },
    stars: 5,
  },
  {
    id: "budget",
    emoji: "📊",
    title: "Planning spending",
    intro: "What a budget is and why to count money.",
    body: [
      "A budget is a plan: how much you have and what you'll spend it on.",
      "A handy rule: spend part of the money, save part, and give part to a good cause.",
      "Limits in the app help you not spend it all at once. They're like a coach that protects your money.",
    ],
    quiz: {
      question: "What is a budget for?",
      options: ["To plan spending", "To spend it all at once", "To hide money"],
      correctIndex: 0,
    },
    stars: 5,
  },
  {
    id: "earning",
    emoji: "💪",
    title: "How people earn",
    intro: "Money comes for work and being useful.",
    body: [
      "Grown-ups get money for work. You can earn too — by doing tasks and helping around the house.",
      "For a completed task you get a reward on your card. That's honest, earned money.",
      "The more useful things you do, the more you can save for your dream.",
    ],
    quiz: {
      question: "How do you get a reward for a task?",
      options: ["Just ask", "Complete it", "Wait"],
      correctIndex: 1,
    },
    stars: 5,
  },
  {
    id: "safety",
    emoji: "🛡️",
    title: "Money safety",
    intro: "How to protect your money and card.",
    body: [
      "Your PIN and password are a secret. Don't tell anyone, even friends.",
      "If someone asks you to transfer money or share a code — ask your parents first.",
      "Buy only in trusted places. If something seems like a scam — it probably is.",
    ],
    quiz: {
      question: "Who can you tell your PIN to?",
      options: ["Your best friend", "No one", "A shop cashier"],
      correctIndex: 1,
    },
    stars: 5,
  },
];

const LESSONS_BY_LOCALE: Record<string, Lesson[]> = {
  ru: LESSONS_RU,
  uz: LESSONS_UZ,
  en: LESSONS_EN,
};

/** Lessons in the active runtime locale (falls back to RU). */
export function getLessons(): Lesson[] {
  return LESSONS_BY_LOCALE[getRuntimeLocale()] ?? LESSONS_RU;
}

/** Number of lessons (same across locales). */
export const LESSON_COUNT = LESSONS_RU.length;

export interface Badge {
  threshold: number;
  emoji: string;
  label: string;
}

// Earned once the child completes `threshold` lessons.
const READING_BADGES: Record<string, Badge[]> = {
  ru: [
    { threshold: 1, emoji: "🌱", label: "Росток" },
    { threshold: 3, emoji: "⭐", label: "Звёздочка" },
    { threshold: 5, emoji: "🧠", label: "Умник" },
    { threshold: LESSON_COUNT, emoji: "🏆", label: "Магистр денег" },
  ],
  uz: [
    { threshold: 1, emoji: "🌱", label: "Nihol" },
    { threshold: 3, emoji: "⭐", label: "Yulduzcha" },
    { threshold: 5, emoji: "🧠", label: "Aqlli" },
    { threshold: LESSON_COUNT, emoji: "🏆", label: "Pul ustasi" },
  ],
  en: [
    { threshold: 1, emoji: "🌱", label: "Sprout" },
    { threshold: 3, emoji: "⭐", label: "Star" },
    { threshold: 5, emoji: "🧠", label: "Brainy" },
    { threshold: LESSON_COUNT, emoji: "🏆", label: "Money Master" },
  ],
};

/** Reading badges in the active runtime locale (falls back to RU). */
export function getReadingBadges(): Badge[] {
  return READING_BADGES[getRuntimeLocale()] ?? READING_BADGES.ru;
}
