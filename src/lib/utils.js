import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function untuk menggabungkan className dengan tailwind-merge
 * Menghindari konflik class Tailwind CSS
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
