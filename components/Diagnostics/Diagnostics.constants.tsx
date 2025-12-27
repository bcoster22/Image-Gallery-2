import React from 'react';
import {
    Activity, AlertTriangle, Check, X, Thermometer, HardDrive, Wifi, Shield, Cpu
} from 'lucide-react';

// Constants
export const DEFAULT_DIAGNOSTICS_ENDPOINT = "http://localhost:2020";
export const SCAN_ENDPOINT_PATH = "/diagnostics/scan";

export const FILTER_OPTIONS = ['All', 'Critical', 'Warning'];

export const SCORE_PENALTY = {
    FAIL: 15,
    WARNING: 5
};

export const COLOR_THRESHOLDS = {
    HIGH: 80,
    MEDIUM: 50
};

// UI Helpers
const STATUS_STYLES = {
    pass: 'bg-green-500/10 text-green-400 border-green-500/20',
    fail: 'bg-red-500/10 text-red-400 border-red-500/20',
    warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
    default: 'bg-gray-500/10 text-gray-400 border-gray-500/20'
};

export const getStatusColor = (status: string): string => {
    return STATUS_STYLES[status as keyof typeof STATUS_STYLES] || STATUS_STYLES.default;
};

export const getStatusIcon = (status: string) => {
    switch (status) {
        case 'pass': return <Check className="w-5 h-5" />;
        case 'fail': return <X className="w-5 h-5" />;
        case 'warning': return <AlertTriangle className="w-5 h-5" />;
        default: return <Activity className="w-5 h-5 animate-pulse" />;
    }
};

export const getCategoryIcon = (category: string) => {
    switch (category) {
        case 'hardware': return <Thermometer className="w-5 h-5 text-orange-400" />;
        case 'performance': return <HardDrive className="w-5 h-5 text-blue-400" />;
        case 'network': return <Wifi className="w-5 h-5 text-purple-400" />;
        case 'system': return <Shield className="w-5 h-5 text-green-400" />;
        case 'environment': return <Cpu className="w-5 h-5 text-cyan-400" />;
        default: return <Activity className="w-5 h-5 text-gray-400" />;
    }
};
