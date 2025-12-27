import React from 'react';
import { ExternalLink } from 'lucide-react';
import { DiagnosticsResultCardProps } from './DiagnosticsPage.types';
import { getStatusColor, getStatusIcon, getCategoryIcon } from './Diagnostics.constants';

const DiagnosticsResultCard: React.FC<DiagnosticsResultCardProps> = ({ result, onFix }) => {
    const statusColor = getStatusColor(result.status);
    const StatusIcon = getStatusIcon(result.status);

    return (
        <div className={`p-4 rounded-xl border flex gap-4 ${statusColor} bg-opacity-5`}>
            {/* Status Icon */}
            <div className={`p-3 rounded-lg h-fit ${statusColor} bg-opacity-20`}>
                {StatusIcon}
            </div>

            <div className="flex-1">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-white text-lg">{result.name}</h3>
                    <span className="text-xs uppercase tracking-wider opacity-70 border px-1.5 py-0.5 rounded border-current">
                        {result.category}
                    </span>
                </div>

                {/* Message */}
                <p className="mt-1 text-sm opacity-90">{result.message}</p>

                {/* Actions (Fix / View Solution) */}
                <div className="mt-4 flex gap-3 items-center">
                    {result.fix_id && onFix && (
                        <button
                            onClick={() => onFix(result.fix_id!)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-md transition-colors flex items-center shadow-lg shadow-blue-900/20"
                        >
                            <ExternalLink className="w-3 h-3 mr-1.5" />
                            Auto Fix Issue
                        </button>
                    )}

                    {(result.status === 'fail' || result.status === 'warning') && !result.fix_id && (
                        <button className="text-xs flex items-center font-bold underline decoration-dotted hover:text-white transition-colors">
                            View Solution <ExternalLink className="w-3 h-3 ml-1" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DiagnosticsResultCard;
