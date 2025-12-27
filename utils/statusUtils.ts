import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function statusColor(status: "operational" | "degraded" | "down" | "idle") {
    switch (status) {
        case "operational":
            return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30";
        case "degraded":
            return "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30";
        case "down":
            return "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30";
        case "idle":
            return "bg-gray-500/15 text-gray-300 ring-1 ring-gray-500/30";
    }
}

export function fmtAgo(timestamp: number) {
    const diffMs = Date.now() - timestamp;
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

// Interpolate check for smooth color transition
export function getSmoothColor(value: number) {
    // New gradient ranges:
    // 0-20: Blue (240)
    // 20-50: Green (120)
    // 50-70: Yellow (60)
    // 70-85: Orange (30)
    // 85-95: Red (0)
    // 95-100: Blood Red (0 with higher saturation)

    const v = Math.max(0, Math.min(100, value));
    let hue = 120;
    let saturation = 100;
    let lightness = 50;

    if (v <= 20) {
        // Blue
        hue = 240;
    } else if (v <= 50) {
        // Blue to Green: 20-50 (30 range)
        const progress = (v - 20) / 30;
        hue = 240 - (progress * 120); // 240 -> 120
    } else if (v <= 70) {
        // Green to Yellow: 50-70 (20 range)
        const progress = (v - 50) / 20;
        hue = 120 - (progress * 60); // 120 -> 60
    } else if (v <= 85) {
        // Yellow to Orange: 70-85 (15 range)
        const progress = (v - 70) / 15;
        hue = 60 - (progress * 30); // 60 -> 30
    } else if (v <= 95) {
        // Orange to Red: 85-95 (10 range)
        const progress = (v - 85) / 10;
        hue = 30 - (progress * 30); // 30 -> 0
    } else {
        // Blood Red: 95-100
        hue = 0;
        saturation = 100;
        lightness = 40; // Darker red for "blood red"
    }

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
