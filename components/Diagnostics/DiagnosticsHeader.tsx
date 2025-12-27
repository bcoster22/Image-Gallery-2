import React from 'react';
import { Activity, X } from 'lucide-react';
import { DiagnosticsHeaderProps } from './DiagnosticsPage.types';
import HealthScoreRing from './HealthScoreRing';

const DiagnosticsHeader: React.FC<DiagnosticsHeaderProps> = ({ onClose, healthScore }) => {
    return (
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50">
            <div className="flex items-center gap-4">
                <Activity className="w-8 h-8 text-indigo-500" />
                <div>
                    <h1 className="text-2xl font-bold text-white">System Diagnostics</h1>
                    <p className="text-neutral-400 text-sm">Real-time health monitoring and issue detection</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <HealthScoreRing score={healthScore} />

                <button
                    onClick={onClose}
                    className="p-2 hover:bg-neutral-800 rounded-full transition-colors"
                >
                    <X className="w-6 h-6 text-neutral-400" />
                </button>
            </div>
        </div>
    );
};

export default DiagnosticsHeader;
