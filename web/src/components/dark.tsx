import * as React from "react";

/** Dark surface panel for the redesigned parent app. */
export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-3xl bg-white/[0.04] border border-white/[0.06] ${className ?? "p-6"}`}>
      {children}
    </div>
  );
}

export function DLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm text-white/60 mb-1.5">{children}</label>;
}

export function DInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl bg-white/[0.05] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-fuchsia-400/60 focus:bg-white/[0.07] ${className ?? ""}`}
    />
  );
}

export function DSelect({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl bg-white/[0.05] border border-white/10 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-fuchsia-400/60 focus:bg-white/[0.07] [color-scheme:dark] ${className ?? ""}`}
    />
  );
}

export function DButton({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "ghost" }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080f] disabled:opacity-50 disabled:pointer-events-none";
  const v =
    variant === "primary"
      ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
      : variant === "outline"
      ? "border border-white/15 text-white hover:bg-white/[0.06]"
      : "text-white/60 hover:text-white hover:bg-white/[0.06]";
  return <button {...props} className={`${base} ${v} ${className ?? ""}`} />;
}

/** Toggle pill (filters / selectors). */
export function Pill({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/50 ${
        active ? "bg-white/15 text-white" : "bg-white/[0.04] text-white/50 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

/** Small status badge. */
export function DBadge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "muted" | "success" | "warn" | "danger";
}) {
  const tones: Record<string, string> = {
    default: "bg-fuchsia-500/15 text-fuchsia-200",
    muted: "bg-white/10 text-white/60",
    success: "bg-emerald-500/15 text-emerald-300",
    warn: "bg-amber-500/15 text-amber-300",
    danger: "bg-rose-500/15 text-rose-300",
  };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}
