import React from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface ConfigSectionProps {
    number: number;
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

export const ConfigSection: React.FC<ConfigSectionProps> = ({ number, title, icon: Icon, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);

    return (
        <div className="border-b border-[#2a2a2a] bg-[#141414]">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-[#1f1f1f] transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <div className={`
                        w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold border transition-colors
                        ${isOpen ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-[#1a1a1a] border-gray-700 text-gray-500 group-hover:border-gray-500'}
                    `}>
                        {number}
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-wider transition-colors ${isOpen ? 'text-gray-200' : 'text-gray-500 group-hover:text-gray-400'}`}>
                        {title}
                    </span>
                </div>
                {isOpen ? (
                    <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-600" />
                )}
            </button>

            {isOpen && (
                <div className="px-4 pb-6 animate-fade-in-down">
                    {children}
                </div>
            )}
        </div>
    );
};

export default ConfigSection;
