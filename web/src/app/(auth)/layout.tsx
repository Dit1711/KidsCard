import { ShieldCheck, ListChecks, PiggyBank, Bell } from "lucide-react";

const VALUE_PROPS = [
  { Icon: ShieldCheck, text: "Лимиты по дням, неделям и категориям" },
  { Icon: ListChecks, text: "Поручения с реальной наградой на карту" },
  { Icon: PiggyBank, text: "Накопления с начислением процентов" },
  { Icon: Bell, text: "Уведомления в реальном времени" },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Brand panel — desktop */}
      <div className="hidden md:flex md:w-[44%] relative overflow-hidden bg-brand-gradient text-white p-10 xl:p-16 flex-col justify-between">
        {/* Decorative glow */}
        <div className="absolute -top-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 w-[26rem] h-[26rem] rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 backdrop-blur text-xl font-bold">
            K
          </span>
          <span className="text-xl font-bold tracking-tight">KidsCard</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl xl:text-5xl font-bold leading-[1.1] tracking-tight">
            Карманные деньги — под контролем родителей
          </h2>
          <p className="mt-5 text-white/80 text-lg leading-relaxed">
            Карты для детей, лимиты, накопления и финансовая грамотность — в одном приложении.
          </p>
          <ul className="mt-9 space-y-3.5">
            {VALUE_PROPS.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/90">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-white/55 text-sm">© KidsCard · Семейные финансы · Узбекистан</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-background">
        <div className="w-full max-w-sm">
          <div className="md:hidden flex flex-col items-center gap-2 mb-8">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-gradient text-white text-xl font-bold shadow-soft">
              K
            </span>
            <span className="text-lg font-bold tracking-tight">KidsCard</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
