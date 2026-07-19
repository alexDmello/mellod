import type { GeneratedCredentials } from "./types";

// ---------------------------------------------------------------
// Credential generator for new FBO / Picker accounts
// ---------------------------------------------------------------
const ADJECTIVES = ["swift", "green", "fresh", "clean", "bright"];

export function generateCredentials(
  role: "picker" | "fbo",
  fullName: string,
  existingCount: number
): GeneratedCredentials {
  const firstName = fullName.trim().split(" ")[0].toLowerCase().replace(/[^a-z]/g, "");
  const paddedCount = String(existingCount + 1).padStart(2, "0");
  const username = `${role}_${firstName}_${paddedCount}`;
  const password = generatePassword();
  // Supabase Auth requires an email; we use a deterministic internal one
  const email = `${username}@mellod.internal`;
  return { username, password, email };
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

// ---------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------
export function formatLiters(liters: number): string {
  return `${liters.toLocaleString("en-IN", { maximumFractionDigits: 1 })} L`;
}

export function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(typeof date === "string" ? new Date(date) : date);
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(typeof date === "string" ? new Date(date) : date);
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

// ---------------------------------------------------------------
// Class name merger (simple utility without clsx dependency)
// ---------------------------------------------------------------
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
