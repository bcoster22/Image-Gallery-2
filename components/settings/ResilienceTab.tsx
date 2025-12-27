import React from 'react';
import { ExclamationTriangleIcon as AlertTriangleIcon } from '@heroicons/react/24/outline';
import { AdminSettings } from '../../types';

interface ResilienceTabProps {
    settings: AdminSettings;
    onUpdateSettings: (settings: AdminSettings) => void;
}

export const ResilienceTab: React.FC<ResilienceTabProps> = ({ settings, onUpdateSettings }) => {

    const handleChange = <K extends keyof NonNullable<AdminSettings['resilience']>>(
        key: K,
        value: NonNullable<AdminSettings['resilience']>[K]
    ) => {
        onUpdateSettings({
            ...settings,
            resilience: {
                ...settings.resilience!,
                [key]: value
            }
        });
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-4">Queue Resilience</h2>
            <p className="text-sm text-gray-400 mb-6">Configure how the system handles backend failures and recovery.</p>

            <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 space-y-6">

                {/* Pause & Recover */}
                <div>
                    <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        Auto-Pause & Recovery
                    </h3>
                    <div className="space-y-3 pl-4 border-l-2 border-gray-700 ml-1">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium text-gray-200">Pause Queue on Failure</label>
                                <p className="text-xs text-gray-500">Automatically pause the queue if the local backend becomes unreachable.</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.resilience?.pauseOnLocalFailure ?? true}
                                onChange={e => handleChange('pauseOnLocalFailure', e.target.checked)}
                                className="h-5 w-5 rounded-md border-gray-500 bg-gray-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium text-gray-200">Consistency Check</label>
                                <p className="text-xs text-gray-500">Verify active jobs when connectivity is restored.</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.resilience?.checkActiveJobOnRecovery ?? true}
                                onChange={e => handleChange('checkActiveJobOnRecovery', e.target.checked)}
                                className="h-5 w-5 rounded-md border-gray-500 bg-gray-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Health Check Interval</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={settings.resilience?.checkBackendInterval ?? 5000}
                                    onChange={e => handleChange('checkBackendInterval', parseInt(e.target.value))}
                                    className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-2 w-24 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                />
                                <span className="text-sm text-gray-400">ms</span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">How often to ping the backend while paused (Default: 5000ms)</p>
                        </div>
                    </div>
                </div>

                <hr className="border-gray-700/50" />

                {/* Cloud Failover */}
                <div>
                    <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        Cloud Failover (Direct)
                    </h3>
                    <div className="space-y-3 pl-4 border-l-2 border-gray-700 ml-1">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium text-gray-200">Enable Failover</label>
                                <p className="text-xs text-gray-500">If local backend fails, attempt to route requests to Cloud providers (if configured).</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.resilience?.failoverEnabled ?? false}
                                onChange={e => handleChange('failoverEnabled', e.target.checked)}
                                className="h-5 w-5 rounded-md border-gray-500 bg-gray-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                        </div>
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-200 flex gap-2">
                            <AlertTriangleIcon className="w-4 h-4 flex-shrink-0" />
                            <p>Warning: Enabling failover may result in unexpected API costs if your local server goes offline during a large batch.</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
