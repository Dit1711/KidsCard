import Link from "next/link";

const VARIANTS = [
  { href: "/design/v1", name: "V1 — Mercury", desc: "Светлый институциональный финтех: воздух, тонкие границы, строгая типографика, сдержанный акцент." },
  { href: "/design/v2", name: "V2 — Revolut", desc: "Тёмный потребительский: крупный градиент-баланс, живые цвета, энергичные карточки." },
  { href: "/design/v3", name: "V3 — Linear", desc: "Тёмный продуктовый: плотный UI, неон-акцент, моно-цифры, техно-эстетика." },
];

export default function DesignIndex() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 p-8 sm:p-16">
      <div className="max-w-2xl mx-auto">
        <p className="text-sm font-medium text-indigo-600">KidsCard · дизайн-эксплорация</p>
        <h1 className="text-3xl font-bold tracking-tight mt-2">Макеты родительского дашборда</h1>
        <p className="text-neutral-500 mt-2">Три направления на выбор. Открой каждый и скажи, какое ближе.</p>
        <div className="mt-8 space-y-3">
          {VARIANTS.map((v) => (
            <Link
              key={v.href}
              href={v.href}
              className="block rounded-2xl border border-neutral-200 bg-white p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <p className="font-semibold">{v.name}</p>
              <p className="text-sm text-neutral-500 mt-1">{v.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
