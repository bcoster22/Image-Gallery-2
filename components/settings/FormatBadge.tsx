import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/20/solid';

interface FormatBadgeProps {
    format: string | null;
    has_warning?: boolean;
}

export const FormatBadge: React.FC<FormatBadgeProps> = ({ format, has_warning }) => {
    if (!format) return null;

    const formatLower = format.toLowerCase();

    // Color schemes based on format
    let badgeClasses = '';
    let icon = null;

    if (formatLower === 'diffusers') {
        badgeClasses = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    } else if (formatLower === 'safetensors') {
        badgeClasses = 'bg-green-500/20 text-green-300 border-green-500/30';
    } else if (formatLower === 'ckpt' || formatLower === 'bin') {
        badgeClasses = 'bg-orange-500/20 text-orange-300 border-orange-500/30';
        icon = <ExclamationTriangleIcon className="w-3 h-3" />;
    } else {
        badgeClasses = 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }

    return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badgeClasses} ml-1.5`}>
            {icon}
            {format.toUpperCase()}
        </span>
    );
};

interface ModelOptionWithBadgeProps {
    model: {
        id: string;
        name: string;
        format?: string | null;
        has_warning?: boolean;
        source?: string;
    };
}

export const ModelOptionWithBadge: React.FC<ModelOptionWithBadgeProps> = ({ model }) => {
    return (
        <span className="flex items-center justify-between w-full">
            <span>{model.name}</span>
            {model.format && (
                <FormatBadge format={model.format} has_warning={model.has_warning} />
            )}
        </span>
    );
};
