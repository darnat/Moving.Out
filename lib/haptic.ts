export function haptic(type: "light" | "medium" | "success" | "error" = "light") {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  const patterns: Record<string, number[]> = {
    light:   [6],
    medium:  [14],
    success: [8, 55, 12],
    error:   [50, 40, 50],
  };
  navigator.vibrate(patterns[type]);
}
