
import React, { useState, useEffect } from 'react';
import { Package, RefreshCw, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import packageJson from '../package.json';

interface PackageInfo {
    name: string;
    current: string;
    latest: string | null;
    status: 'loading' | 'uptodate' | 'outdated' | 'error';
}

// Critical packages to track
const TRACKED_PACKAGES = [
    'react',
    'react-dom',
    'vite',
    '@google/genai',
    'lucide-react',
    'react-virtuoso',
    'tailwind-merge',
    'typescript'
];

export const AdminVersions: React.FC = () => {
    const [packages, setPackages] = useState<PackageInfo[]>([]);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);

    const fetchVersions = async () => {
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies } as Record<string, string>;

        // Initialize list
        const initialList = TRACKED_PACKAGES.map(name => ({
            name,
            current: deps[name]?.replace('^', '').replace('~', '') || 'Not installed',
            latest: null,
            status: 'loading' as const
        }));

        setPackages(initialList);

        // Fetch latest versions
        const updatedList = await Promise.all(initialList.map(async (pkg) => {
            if (pkg.current === 'Not installed') return { ...pkg, status: 'error' as const };

            try {
                const response = await fetch(`https://registry.npmjs.org/${pkg.name}/latest`);
                const data = await response.json();
                const latest = data.version;

                return {
                    ...pkg,
                    latest,
                    status: latest === pkg.current ? 'uptodate' : 'outdated'
                } as PackageInfo;
            } catch (error) {
                console.error(`Failed to fetch version for ${pkg.name}`, error);
                return { ...pkg, status: 'error' } as PackageInfo;
            }
        }));

        setPackages(updatedList);
        setLastChecked(new Date());
    };

    useEffect(() => {
        fetchVersions();
    }, []);


    const outdatedPackages = packages.filter(p => p.status === 'outdated');


    const copyUpdateCommand = () => {
        const packagesToUpdate = outdatedPackages.map(p => `${p.name}@latest`).join(' ');
        const command = `npm install ${packagesToUpdate}`;
        navigator.clipboard.writeText(command);
        alert('Update command copied to clipboard! Run this in your terminal.');
    };

    const copyGalleryUpdate = () => {
        const command = 'git pull origin main && npm install';
        navigator.clipboard.writeText(command);
        alert('Gallery update command copied!');
    };

    const copyStationUpdate = () => {
        const command = 'cd ~/.moondream-station/moondream-station && git pull && pip install -r requirements.txt';
        navigator.clipboard.writeText(command);
        alert('Station update command copied!');
    };

    return (
        <div className="space-y-6">
            {/* Project Updates Section */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-white mb-4">
                    <RefreshCw className="w-5 h-5 text-indigo-400" />
                    Update Core
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600 flex flex-col justify-between">
                        <div>
                            <h3 className="text-lg font-medium text-white mb-2">System</h3>
                            <p className="text-xs text-gray-400 mb-2">Required Node.js version</p>
                            <div className="flex items-center gap-2 text-indigo-300 font-mono text-lg">
                                <Package className="w-5 h-5" />
                                <span>{(packageJson as any).engines?.node || 'Unknown'}</span>
                            </div>
                        </div>
                        <div className="mt-4 text-[10px] text-gray-500">
                            Defined in package.json
                        </div>
                    </div>

                    <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                        <h3 className="text-lg font-medium text-white mb-2">Gallery Application</h3>
                        <p className="text-xs text-gray-400 mb-4">Update the web interface code from GitHub.</p>
                        <button
                            onClick={copyGalleryUpdate}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white text-sm font-medium transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Copy Update Command
                        </button>
                        <code className="block mt-2 text-[10px] text-gray-500 font-mono text-center">git pull origin main && npm install</code>
                    </div>

                    <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                        <h3 className="text-lg font-medium text-white mb-2">Moondream Station</h3>
                        <p className="text-xs text-gray-400 mb-4">Update the backend AI server code.</p>
                        <button
                            onClick={copyStationUpdate}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-white text-sm font-medium transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Copy Update Command
                        </button>
                        <code className="block mt-2 text-[10px] text-gray-500 font-mono text-center">cd ~/.moondream-station... && git pull</code>
                    </div>
                </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 space-y-6">
                <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                    <div>
                        <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
                            <Package className="w-5 h-5 text-indigo-400" />
                            Library Dependencies
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">
                            Manage installed node modules and version compatibility.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {outdatedPackages.length > 0 && (
                            <button
                                onClick={copyUpdateCommand}
                                className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white text-sm font-medium transition-colors animate-pulse"
                                title="Copy npm install command"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Update {outdatedPackages.length} Packages
                            </button>
                        )}
                        <button
                            onClick={fetchVersions}
                            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-200 transition-colors"
                            title="Check for updates"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-gray-400 text-sm border-b border-gray-700">
                                <th className="py-3 px-4">Library</th>
                                <th className="py-3 px-4">Current</th>
                                <th className="py-3 px-4">Latest</th>
                                <th className="py-3 px-4">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {packages.map((pkg) => (
                                <tr key={pkg.name} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                                    <td className="py-3 px-4 font-medium text-gray-200">
                                        <a
                                            href={`https://www.npmjs.com/package/${pkg.name}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="hover:text-indigo-400 flex items-center gap-2"
                                        >
                                            {pkg.name}
                                            <ExternalLink className="w-3 h-3 opacity-50" />
                                        </a>
                                    </td>
                                    <td className="py-3 px-4 text-mono text-gray-300">{pkg.current}</td>
                                    <td className="py-3 px-4 text-mono text-gray-300">{pkg.latest || '...'}</td>
                                    <td className="py-3 px-4">
                                        {pkg.status === 'uptodate' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                                                <CheckCircle className="w-3 h-3" /> Up to date
                                            </span>
                                        )}
                                        {pkg.status === 'outdated' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                                                <AlertTriangle className="w-3 h-3" /> Update Available
                                            </span>
                                        )}
                                        {pkg.status === 'error' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                                                Error
                                            </span>
                                        )}
                                        {pkg.status === 'loading' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-gray-500">
                                                Checking...
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {outdatedPackages.length > 0 && (
                    <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-md p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-semibold text-indigo-300">Updates Required</h4>
                            <p className="text-xs text-gray-400 mt-1 mb-2">
                                Use the "Update Packages" button above to copy the install command, then run it in your server terminal.
                            </p>
                            <code className="block bg-black/30 p-2 rounded text-xs font-mono text-gray-300 break-all select-all">
                                npm install {outdatedPackages.map(p => `${p.name}@latest`).join(' ')}
                            </code>
                        </div>
                    </div>
                )}

                {lastChecked && (
                    <div className="text-right text-xs text-gray-500">
                        Last checked: {lastChecked.toLocaleTimeString()}
                    </div>
                )}
            </div>
        </div>
    );
};
