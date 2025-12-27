import React, { useState } from 'react';
import { Lock, X } from 'lucide-react';

interface PasswordPromptModalProps {
    onSubmit: (password: string) => void;
    onCancel: () => void;
    loading?: boolean;
    error?: string;
}

export default function PasswordPromptModal({ onSubmit, onCancel, loading = false, error }: PasswordPromptModalProps) {
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password.trim()) {
            onSubmit(password);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-neutral-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-600/20 rounded-lg flex items-center justify-center">
                            <Lock className="w-5 h-5 text-emerald-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-white">Setup Auto Fix</h2>
                    </div>
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <p className="text-neutral-300 text-sm">
                        Enter your system password to configure passwordless Auto Fix permissions.
                        This is a <strong>one-time setup</strong>.
                    </p>

                    <div className="space-y-2">
                        <label htmlFor="sudo-password" className="block text-sm font-medium text-neutral-200">
                            Sudo Password
                        </label>
                        <input
                            id="sudo-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            placeholder="Enter your password"
                            className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !password.trim()}
                            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Configuring...' : 'Setup'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
