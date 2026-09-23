"use client";

export type ThemeMode = "light" | "dark";
export type ThemeAccent = "green" | "blue" | "purple" | "amber" | "rose";

export const themes: { id: ThemeAccent; name: string; color: string; dark: string }[] = [
  { id: "green", name: "Verde Pixel", color: "#2d9a6f", dark: "#55c295" },
  { id: "blue", name: "Azul océano", color: "#2f78b7", dark: "#6aaee0" },
  { id: "purple", name: "Púrpura", color: "#7c5cc4", dark: "#a98ce4" },
  { id: "amber", name: "Ámbar", color: "#b98524", dark: "#e2b45e" },
  { id: "rose", name: "Rosa", color: "#c25d7a", dark: "#e38aa3" },
];

const modeKey = "cotiza-theme-mode";
const accentKey = "cotiza-theme-accent";

export function getStoredTheme(): { mode: ThemeMode; accent: ThemeAccent } {
  if (typeof window === "undefined") return { mode: "light", accent: "green" };
  const mode = localStorage.getItem(modeKey) === "dark" ? "dark" : "light";
  const accent = (localStorage.getItem(accentKey) as ThemeAccent) || "green";
  return { mode, accent: themes.some((theme) => theme.id === accent) ? accent : "green" };
}

export function applyTheme(mode: ThemeMode, accent: ThemeAccent) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = mode;
  document.documentElement.dataset.accent = accent;
  try {
    localStorage.setItem(modeKey, mode);
    localStorage.setItem(accentKey, accent);
  } catch { /* private mode */ }
}
