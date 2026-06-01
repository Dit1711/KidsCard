/** Format an UZS amount for display: "1 234 сум", or "—" for null/undefined. */
export function formatSum(uzs: number | null | undefined): string {
  if (uzs == null) return "—";
  return new Intl.NumberFormat("ru-UZ").format(uzs) + " сум";
}
