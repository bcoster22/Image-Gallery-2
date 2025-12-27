
import React, { useState, useEffect } from 'react';
import { Package, RefreshCw, AlertTriangle, CheckCircle, ExternalLink, HardDrive, Cpu, Wifi, PlayCircle, ShieldAlert } from 'lucide-react';
import packageJson from '../package.json';

interface PackageInfo {
    name: string;
    current: string;
    latest: string | null;
    status: 'loading' | 'uptodate' | 'outdated' | 'error';
}

interface BackendInfo {
    versions: Record<string, string>;
    has_critical_update: boolean;
    critical_message: string;
    python_version: string;
    platform: string;
}

interface VerificationCheck {
    name: string;
    passed: boolean;
    message: string;
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
    // Frontend State
    const [packages, setPackages] = useState<PackageInfo[]>([]);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    // Backend State
    const [backendInfo, setBackendInfo] = useState<BackendInfo | null>(null);
    const [isBackendUpdating, setIsBackendUpdating] = useState(false);
    const [verificationResults, setVerificationResults] = useState<VerificationCheck[] | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);

    // --- Frontend Logic ---
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

        // Fetch (simulated for node_modules, real for npm check)
        // In a real app we'd need a backend endpoint to check npm registry to avoid CORS
        // For now we simulate logic or assume simple fetch works
        const updatedList = await Promise.all(initialList.map(async (pkg) => {
            if (pkg.current === 'Not installed') return { ...pkg, status: 'error' as const };
            try {
                // Determine status based on hardcoded 'latest' expectation or just show current
                // Since this is a client-side component, accurate 'latest' check is tricky without backend proxy
                // We'll mark as 'uptodate' for now unless we implement the registry proxy
                return { ...pkg, status: 'uptodate' } as PackageInfo;
            } catch (error) {
                return { ...pkg, status: 'error' } as PackageInfo;
            }
        }));

        setPackages(updatedList);
        setLastChecked(new Date());
    };

    // --- Backend Logic ---
    const fetchBackendInfo = async () => {
        try {
            const res = await fetch('http://localhost:2020/v1/system/backend-version');
            if (res.ok) {
                const data = await res.json();
                setBackendInfo(data);
            }
        } catch (e) {
            console.error("Backend fetch failed", e);
        }
    };

    const handleUpdateBackend = async () => {
        if (!confirm("This will upgrade core AI libraries (Torch, etc). It may take 5-10 minutes. Continue?")) return;

        setIsBackendUpdating(true);
        try {
            const res = await fetch('http://localhost:2020/v1/system/upgrade-backend', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                alert("Upgrade Complete! Running system verification...");
                handleVerifyBackend();
                fetchBackendInfo();
            } else {
                throw new Error(data.message || "Upgrade failed");
            }
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        } finally {
            setIsBackendUpdating(false);
        }
    };

    const handleVerifyBackend = async () => {
        setIsVerifying(true);
        setVerificationResults(null);
        try {
            const res = await fetch('http://localhost:2020/v1/system/verify-backend');
            const data = await res.json();
            if (data.checks) {
                setVerificationResults(data.checks);
            }
        } catch (e) {
            alert("Verification failed to run");
        } finally {
            setIsVerifying(false);
        }
    }

    useEffect(() => {
        fetchVersions();
        fetchBackendInfo();
    }, []);

    const outdatedPackages = packages.filter(p => p.status === 'outdated');

    // Commands
    const copyGalleryUpdate = () => {
        navigator.clipboard.writeText('git pull origin main && npm install');
        alert('Command copied!');
    };
    const copyStationUpdate = () => {
        navigator.clipboard.writeText('cd ~/.moondream-station/moondream-station && git pull && pip install -r requirements.txt');
        alert('Command copied!');
    };


    return (
        <div className="space-y-8">

            {/* 1. Critical Alerts */}
            {backendInfo?.has_critical_update && (
                <div className="bg-red-900/40 border border-red-500 rounded-lg p-6 flex flex-col items-center text-center animate-pulse">
                    <ShieldAlert className="w-12 h-12 text-red-500 mb-2" />
                    <h2 className="text-2xl font-bold text-red-400">Critical Security Update Required</h2>
                    <p className="text-red-200 mt-2 mb-4 max-w-xl">{backendInfo.critical_message}</p>
                    <button
                        onClick={handleUpdateBackend}
                        disabled={isBackendUpdating}
                        className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-md font-bold text-lg shadow-lg flex items-center gap-2"
                    >
                        {isBackendUpdating ? <RefreshCw className="animate-spin" /> : <ShieldAlert />}
                        {isBackendUpdating ? "Installing Security Fix..." : "Apply Security Fix Now"}
                    </button>
                </div>
            )}

            {/* 2. Backend System Control */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex justify-between items-center border-b border-gray-700 pb-4 mb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
                        <Cpu className="w-5 h-5 text-purple-400" />
                        Backend System (AI Server)
                    </h2>
                    <div className="flex gap-2">
                        <button
                            onClick={handleVerifyBackend}
                            disabled={isVerifying}
                            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-sm flex items-center gap-2"
                        >
                            {isVerifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            Run Health Checks
                        </button>
                        <button
                            onClick={handleUpdateBackend}
                            disabled={isBackendUpdating}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm flex items-center gap-2"
                        >
                            {isBackendUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            Update Backend
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Library Versions */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Core Libraries</h3>
                        <div className="space-y-2">
                            {backendInfo ? Object.entries(backendInfo.versions).map(([lib, ver]) => (
                                <div key={lib} className="flex justify-between items-center p-2 bg-gray-900/50 rounded border border-gray-700">
                                    <span className="text-gray-300 font-mono text-sm">{lib}</span>
                                    <span className={`font-mono text-sm ${ver.includes('Not') ? 'text-red-400' : 'text-green-400'}`}>
                                        {ver}
                                    </span>
                                </div>
                            )) : <div className="text-gray-500 italic">Connecting to backend...</div>}
                        </div>
                        {backendInfo && (
                            <div className="mt-4 text-xs text-gray-500 font-mono">
                                Python: {backendInfo.python_version} | Platform: {backendInfo.platform}
                            </div>
                        )}
                    </div>

                    {/* Verification Console */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">System Health</h3>

                        {!verificationResults && !isVerifying && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-700 rounded-lg p-4">
                                <CheckCircle className="w-8 h-8 mb-2 opacity-50" />
                                <p>Run health checks to verify installation</p>
                            </div>
                        )}

                        {isVerifying && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 p-8">
                                <RefreshCw className="w-8 h-8 mb-2 animate-spin text-purple-500" />
                                <p>Running diagnostic tests...</p>
                            </div>
                        )}

                        {verificationResults && (
                            <div className="space-y-2">
                                {verificationResults.map((check, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-2 bg-gray-900/30 rounded border border-gray-700/50">
                                        {check.passed ?
                                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" /> :
                                            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                        }
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between">
                                                <span className={`text-sm font-medium ${check.passed ? 'text-gray-200' : 'text-red-300'}`}>
                                                    {check.name}
                                                </span>
                                                {/* Optional: Icon for type */}
                                            </div>
                                            <p className="text-xs text-gray-400 truncate" title={check.message}>{check.message}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. Project Updates (Git) */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-white mb-4">
                    <RefreshCw className="w-5 h-5 text-indigo-400" />
                    Source Code Updates
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* 4. Frontend Libraries (Existing) */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 space-y-6">
                <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
                        <Package className="w-5 h-5 text-indigo-400" />
                        Frontend Libraries
                    </h2>
                    <button
                        onClick={fetchVersions}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-200 transition-colors"
                        title="Check for updates"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-gray-400 text-sm border-b border-gray-700">
                                <th className="py-3 px-4">Library</th>
                                <th className="py-3 px-4">Current</th>
                                <th className="py-3 px-4">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {packages.map((pkg) => (
                                <tr key={pkg.name} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                                    <td className="py-3 px-4 font-medium text-gray-200">{pkg.name}</td>
                                    <td className="py-3 px-4 text-mono text-gray-300">{pkg.current}</td>
                                    <td className="py-3 px-4">
                                        {pkg.status === 'uptodate' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                                                <CheckCircle className="w-3 h-3" /> Installed
                                            </span>
                                        )}
                                        {pkg.status === 'error' && (
                                            <span className="text-red-400 text-xs">Error</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
