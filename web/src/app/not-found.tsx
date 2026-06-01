import Link from "next/link";
import { Golos_Text } from "next/font/google";
import { Home, Compass } from "lucide-react";

const golos = Golos_Text({ subsets: ["latin", "cyrillic"], display: "swap" });

export default function NotFound() {
  return (
    <div className={`fixed inset-0 overflow-hidden bg-[#08080f] text-white ${golos.className}`}>
      {/* glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-fuchsia-600/20 blur-3xl" />
      </div>

      <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.05] border border-white/10">
          <Compass className="h-8 w-8 text-fuchsia-300" />
        </div>

        <p className="bg-gradient-to-br from-violet-300 to-fuchsia-400 bg-clip-text text-7xl font-bold tracking-tight text-transparent">
          404
        </p>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">Страница не найдена</h1>
        <p className="mt-2 max-w-sm text-sm text-white/50">
          Возможно, ссылка устарела или страница была перемещена. Вернитесь на главную и продолжите.
        </p>

        <Link
          href="/dashboard"
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080f]"
        >
          <Home className="h-4 w-4" />
          На главную
        </Link>
      </div>
    </div>
  );
}
