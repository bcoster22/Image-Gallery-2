import React from 'react';
import { HealthScoreRingProps } from './DiagnosticsPage.types';
import { COLOR_THRESHOLDS } from './Diagnostics.constants';

const HealthScoreRing: React.FC<HealthScoreRingProps> = ({ score, size = 64, strokeWidth = 4 }) => {
    // Determine color
    let colorClass = 'text-red-500';
    if (score > COLOR_THRESHOLDS.HIGH) colorClass = 'text-green-500';
    else if (score > COLOR_THRESHOLDS.MEDIUM) colorClass = 'text-yellow-500';

    const radius = size / 2 - strokeWidth;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (circumference * score) / 100;

    return (
        <div className="relative flex items-center justify-center p-2">
            <svg
                width={size}
                height={size}
                className="transform -rotate-90"
            >
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    className="text-neutral-800"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    className={`${colorClass} transition-all duration-1000`}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                />
            </svg>
            <span className="absolute text-lg font-bold text-white">{Math.round(score)}%</span>
        </div>
    );
};

export default HealthScoreRing;
