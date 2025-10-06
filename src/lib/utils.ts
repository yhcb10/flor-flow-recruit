import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Normalize Brazilian phone numbers to WhatsApp E.164 format without '+'
// Examples:
//  (11) 99123-4567       -> 5511991234567
//  0 11 99123 4567       -> 5511991234567
//  +55 11 99123-4567     -> 5511991234567
//  5511991234567         -> 5511991234567
export function normalizeWhatsappPhoneBR(input: string): string | null {
  if (!input) return null;
  let digits = String(input).replace(/\D/g, "");

  // Strip country code if already present to re-normalize
  if (digits.startsWith("55")) {
    digits = digits.slice(2);
  }

  // Remove any leading zeros (e.g., 0 before DDD)
  digits = digits.replace(/^0+/, "");

  // Expect 10 or 11 digits after DDD (landline 8, mobile 9)
  if (digits.length < 10 || digits.length > 11) {
    return null;
  }

  return "55" + digits;
}

