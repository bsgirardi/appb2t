export function csvText(value: string): string {
  const safe =
    /^[\s]*[=+\-@\t\r]/.test(value) || /^[\t\r]/.test(value)
      ? `'${value}`
      : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function csvMoney(value: string): string {
  if (!/^-?\d+\.\d{2}$/.test(value))
    throw new Error("Valor monetário inválido para exportação.");
  return value.replace(".", ",");
}
