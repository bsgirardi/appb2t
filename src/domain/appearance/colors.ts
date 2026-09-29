import { AppError } from "@/lib/errors";
function luminance(hex: string) {
  if (!/^#[0-9a-f]{6}$/i.test(hex))
    throw new AppError("VALIDATION", "Cor inválida. Use #RRGGBB.");
  const values = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
export function contrastRatio(a: string, b: string): number {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function readableText(background: string): "#ffffff" | "#111827" {
  const white = contrastRatio(background, "#ffffff"),
    dark = contrastRatio(background, "#111827");
  if (Math.max(white, dark) < 4.5)
    throw new AppError(
      "VALIDATION",
      "Escolha uma cor mais clara ou mais escura para garantir a leitura.",
    );
  return white >= dark ? "#ffffff" : "#111827";
}
