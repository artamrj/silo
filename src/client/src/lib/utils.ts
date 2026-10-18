import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge conditional class lists while resolving conflicting Tailwind classes.
 * @param inputs Class values passed to {@link clsx}
 * @returns {string} The merged class string
 */
export function cn(...inputs : ClassValue[]) {
    return twMerge(clsx(inputs));
}
