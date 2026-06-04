import type { Locale } from "./config";

// Flat, dotted keys. `{name}`-style placeholders are filled by t(key, params).
// New screens add their keys here; missing keys fall back to RU, then the key.
type Dictionary = Record<string, string>;

const ru: Dictionary = {
  // shared
  "common.sending": "Отправка...",
  "common.checking": "Проверка...",
  "common.signIn": "Войти",
  "common.register": "Зарегистрироваться",
  "common.childLogin": "Вход для детей",
  "common.changeNumber": "← Изменить номер",
  "common.wrongOtp": "Неверный OTP-код",
  "common.language": "Язык",

  // login
  "login.title": "С возвращением",
  "login.subtitle": "Войдите по номеру телефона",
  "login.otpSentTo": "Код отправлен на {phone}",
  "login.phoneLabel": "Телефон",
  "login.notFound": "Номер не найден. Сначала зарегистрируйтесь.",
  "login.getCode": "Получить код",
  "login.noAccount": "Нет аккаунта?",
  "login.otpLabel": "Код из SMS",

  // register
  "register.title": "Регистрация",
  "register.subtitle": "Создайте аккаунт родителя",
  "register.otpSentToFull": "Введите код из SMS на {phone}",
  "register.formatError": "Ошибка. Проверьте формат номера (+998XXXXXXXXX)",
  "register.phoneLabel": "Номер телефона",
  "register.formatHint": "Формат: +998XXXXXXXXX",
  "register.haveAccount": "Уже есть аккаунт?",
  "register.otpLabel": "Код подтверждения",
  "register.devHint": "Код отправлен на {phone}. В dev-режиме смотрите в логах сервиса.",

  // child login
  "child.greeting": "Привет!",
  "child.subtitle": "Вход в твой кошелёк",
  "child.codeLabel": "Твой код",
  "child.pinLabel": "PIN",
  "child.error": "Неверный код или PIN. Попроси родителя проверить.",
  "child.signingIn": "Входим…",
  "child.parent": "Родитель?",
  "child.parentLogin": "Вход для родителей",

  // auth brand panel
  "auth.brand.headline": "Карманные деньги — под контролем родителей",
  "auth.brand.subtitle": "Карты для детей, лимиты, накопления и финансовая грамотность — в одном приложении.",
  "auth.brand.prop1": "Лимиты по дням, неделям и категориям",
  "auth.brand.prop2": "Поручения с реальной наградой на карту",
  "auth.brand.prop3": "Накопления с начислением процентов",
  "auth.brand.prop4": "Уведомления в реальном времени",
  "auth.brand.footer": "© KidsCard · Семейные финансы · Узбекистан",
};

const uz: Dictionary = {
  "common.sending": "Yuborilmoqda...",
  "common.checking": "Tekshirilmoqda...",
  "common.signIn": "Kirish",
  "common.register": "Ro'yxatdan o'tish",
  "common.childLogin": "Bolalar uchun kirish",
  "common.changeNumber": "← Raqamni o'zgartirish",
  "common.wrongOtp": "Noto'g'ri OTP kod",
  "common.language": "Til",

  "login.title": "Xush kelibsiz",
  "login.subtitle": "Telefon raqamingiz orqali kiring",
  "login.otpSentTo": "Kod {phone} raqamiga yuborildi",
  "login.phoneLabel": "Telefon",
  "login.notFound": "Raqam topilmadi. Avval ro'yxatdan o'ting.",
  "login.getCode": "Kod olish",
  "login.noAccount": "Hisobingiz yo'qmi?",
  "login.otpLabel": "SMS'dagi kod",

  "register.title": "Ro'yxatdan o'tish",
  "register.subtitle": "Ota-ona hisobini yarating",
  "register.otpSentToFull": "{phone} raqamiga kelgan SMS kodini kiriting",
  "register.formatError": "Xatolik. Raqam formatini tekshiring (+998XXXXXXXXX)",
  "register.phoneLabel": "Telefon raqami",
  "register.formatHint": "Format: +998XXXXXXXXX",
  "register.haveAccount": "Hisobingiz bormi?",
  "register.otpLabel": "Tasdiqlash kodi",
  "register.devHint": "Kod {phone} raqamiga yuborildi. Dev rejimida xizmat loglarida ko'ring.",

  "child.greeting": "Salom!",
  "child.subtitle": "Hamyoningga kirish",
  "child.codeLabel": "Sening koding",
  "child.pinLabel": "PIN",
  "child.error": "Kod yoki PIN noto'g'ri. Ota-onangdan tekshirishni so'ra.",
  "child.signingIn": "Kirilmoqda…",
  "child.parent": "Ota-onamisiz?",
  "child.parentLogin": "Ota-onalar uchun kirish",

  "auth.brand.headline": "Cho'ntak puli — ota-onalar nazoratida",
  "auth.brand.subtitle": "Bolalar uchun kartalar, limitlar, jamg'armalar va moliyaviy savodxonlik — bitta ilovada.",
  "auth.brand.prop1": "Kunlik, haftalik va toifa bo'yicha limitlar",
  "auth.brand.prop2": "Kartaga real mukofotli topshiriqlar",
  "auth.brand.prop3": "Foiz hisoblanadigan jamg'armalar",
  "auth.brand.prop4": "Real vaqtdagi bildirishnomalar",
  "auth.brand.footer": "© KidsCard · Oilaviy moliya · O'zbekiston",
};

const en: Dictionary = {
  "common.sending": "Sending...",
  "common.checking": "Checking...",
  "common.signIn": "Sign in",
  "common.register": "Register",
  "common.childLogin": "Kids login",
  "common.changeNumber": "← Change number",
  "common.wrongOtp": "Invalid OTP code",
  "common.language": "Language",

  "login.title": "Welcome back",
  "login.subtitle": "Sign in with your phone number",
  "login.otpSentTo": "Code sent to {phone}",
  "login.phoneLabel": "Phone",
  "login.notFound": "Number not found. Please register first.",
  "login.getCode": "Get code",
  "login.noAccount": "No account?",
  "login.otpLabel": "SMS code",

  "register.title": "Registration",
  "register.subtitle": "Create a parent account",
  "register.otpSentToFull": "Enter the SMS code sent to {phone}",
  "register.formatError": "Error. Check the number format (+998XXXXXXXXX)",
  "register.phoneLabel": "Phone number",
  "register.formatHint": "Format: +998XXXXXXXXX",
  "register.haveAccount": "Already have an account?",
  "register.otpLabel": "Verification code",
  "register.devHint": "Code sent to {phone}. In dev mode, check the service logs.",

  "child.greeting": "Hi!",
  "child.subtitle": "Sign in to your wallet",
  "child.codeLabel": "Your code",
  "child.pinLabel": "PIN",
  "child.error": "Wrong code or PIN. Ask your parent to check.",
  "child.signingIn": "Signing in…",
  "child.parent": "Parent?",
  "child.parentLogin": "Parent login",

  "auth.brand.headline": "Pocket money — under parental control",
  "auth.brand.subtitle": "Cards for kids, limits, savings and financial literacy — in one app.",
  "auth.brand.prop1": "Limits by day, week and category",
  "auth.brand.prop2": "Chores with real rewards to the card",
  "auth.brand.prop3": "Savings with interest",
  "auth.brand.prop4": "Real-time notifications",
  "auth.brand.footer": "© KidsCard · Family finance · Uzbekistan",
};

export const dictionaries: Record<Locale, Dictionary> = { ru, uz, en };
