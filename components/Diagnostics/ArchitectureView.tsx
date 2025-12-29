import React from 'react';
import { Server, Globe, Settings } from 'lucide-react';

export default function ArchitectureView() {
    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* System Overview */}
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Server className="w-5 h-5 text-indigo-400" />
                    System Architecture Overview
                </h2>

                {/* Mermaid Diagram */}
                <div className="bg-neutral-900 rounded-lg p-6 mb-6">
                    <pre className="mermaid text-sm">
                        {`graph TB
    subgraph "Your Computer localhost"
        FE["🖥️ FRONTEND<br/>React/TypeScript<br/>Port: 3000"]
        BE1["🧠 MOONDREAM-STATION<br/>Python/FastAPI<br/>Port: 2020"]
        BE2["⚙️ STATION MANAGER<br/>Python/Flask<br/>Port: 3001"]
    end
    
    FE -->|"API Calls"| BE1
    FE -->|"Process Control"| BE2
    BE2 -->|"Start/Stop"| BE1
    
    BE1 -->|"GPU/CUDA"| GPU["🎮 GPU<br/>NVIDIA RTX 3070"]
    BE1 -->|"Load Models"| MODELS["💾 AI Models<br/>~/.moondream-station/models"]
    
    style FE fill:#4f46e5,stroke:#6366f1,color:#fff
    style BE1 fill:#059669,stroke:#10b981,color:#fff
    style BE2 fill:#d97706,stroke:#f59e0b,color:#fff
    style GPU fill:#dc2626,stroke:#ef4444,color:#fff
    style MODELS fill:#7c3aed,stroke:#8b5cf6,color:#fff`}
                    </pre>
                </div>

                {/* Simple explanation */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Globe className="w-5 h-5 text-indigo-400" />
                            <h3 className="font-semibold text-indigo-300">Frontend</h3>
                        </div>
                        <p className="text-sm text-neutral-300">What you see in the browser. Handles UI, user interactions, and displays results.</p>
                        <p className="text-xs text-neutral-500 mt-2">Port 3000 • TypeScript/React</p>
                    </div>

                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Server className="w-5 h-5 text-green-400" />
                            <h3 className="font-semibold text-green-300">Moondream-Station</h3>
                        </div>
                        <p className="text-sm text-neutral-300">The AI brain. Runs models for captioning, tagging, and image generation.</p>
                        <p className="text-xs text-neutral-500 mt-2">Port 2020 • Python/FastAPI</p>
                    </div>

                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Settings className="w-5 h-5 text-orange-400" />
                            <h3 className="font-semibold text-orange-300">Station Manager</h3>
                        </div>
                        <p className="text-sm text-neutral-300">Process controller. Starts, stops, and monitors the backend services.</p>
                        <p className="text-xs text-neutral-500 mt-2">Port 3001 • Python/Flask</p>
                    </div>
                </div>
            </div>

            {/* How It Works Section */}
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">How It Works Together</h2>

                <div className="space-y-4">
                    <div className="bg-neutral-900 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-indigo-400 mb-2">Example: Captioning an Image</h3>
                        <ol className="text-sm text-neutral-300 space-y-2 list-decimal list-inside">
                            <li>You click image → Click "Caption with Moondream"</li>
                            <li><span className="text-indigo-400">Frontend</span> sends image to <span className="text-green-400">Moondream-Station</span></li>
                            <li><span className="text-green-400">Moondream-Station</span> loads AI model into GPU</li>
                            <li>Model processes image → Returns: "A person standing in a park"</li>
                            <li><span className="text-indigo-400">Frontend</span> displays the caption</li>
                        </ol>
                    </div>

                    <div className="bg-neutral-900 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-indigo-400 mb-2">Example: Running Diagnostics</h3>
                        <ol className="text-sm text-neutral-300 space-y-2 list-decimal list-inside">
                            <li>You click "Run New Scan"</li>
                            <li><span className="text-indigo-400">Frontend</span> runs 6 browser checks (storage, WebGL, etc.)</li>
                            <li><span className="text-indigo-400">Frontend</span> calls <span className="text-green-400">Moondream-Station</span> for 10 system checks</li>
                            <li><span className="text-green-400">Backend</span> checks GPU, CUDA, disk speed, network, etc.</li>
                            <li>Results merge → You see 16 total checks!</li>
                        </ol>
                    </div>
                </div>
            </div>

            {/* Diagnostics Breakdown */}
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Diagnostics Breakdown</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
                        <h3 className="font-semibold text-indigo-300 mb-3">Frontend Checks (6)</h3>
                        <ul className="text-sm text-neutral-300 space-y-1">
                            <li>✓ Browser Storage (IndexedDB)</li>
                            <li>✓ Database Integrity</li>
                            <li>✓ WebGL 2 Support</li>
                            <li>✓ API Key Validation</li>
                            <li>✓ Backend Latency</li>
                            <li>✓ Network Status</li>
                        </ul>
                        <p className="text-xs text-neutral-500 mt-3">Run in browser JavaScript</p>
                    </div>

                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                        <h3 className="font-semibold text-green-300 mb-3">Backend Checks (10)</h3>
                        <ul className="text-sm text-neutral-300 space-y-1">
                            <li>✓ Nvidia DRM Modesetting</li>
                            <li>✓ GPU Persistence Mode</li>
                            <li>✓ GPU Thermal Status</li>
                            <li>✓ PyTorch CUDA Detection</li>
                            <li>✓ System RAM</li>
                            <li>✓ Disk I/O Speed</li>
                            <li>✓ HuggingFace Network</li>
                            <li>✓ Secure Boot Status</li>
                            <li>✓ Ghost VRAM Detection</li>
                            <li>✓ Model File Integrity</li>
                        </ul>
                        <p className="text-xs text-neutral-500 mt-3">Run on Python/Hardware</p>
                    </div>
                </div>
            </div>

            {/* Quick Reference */}
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Quick Reference</h2>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-neutral-700">
                                <th className="text-left py-2 px-4 text-neutral-400">Task</th>
                                <th className="text-left py-2 px-4 text-neutral-400">Where</th>
                                <th className="text-left py-2 px-4 text-neutral-400">Service</th>
                            </tr>
                        </thead>
                        <tbody className="text-neutral-300">
                            <tr className="border-b border-neutral-800">
                                <td className="py-2 px-4">Display images</td>
                                <td className="py-2 px-4">Browser</td>
                                <td className="py-2 px-4 text-indigo-400">Frontend</td>
                            </tr>
                            <tr className="border-b border-neutral-800">
                                <td className="py-2 px-4">Caption image</td>
                                <td className="py-2 px-4">Python/GPU</td>
                                <td className="py-2 px-4 text-green-400">Moondream-Station</td>
                            </tr>
                            <tr className="border-b border-neutral-800">
                                <td className="py-2 px-4">Tag image</td>
                                <td className="py-2 px-4">Python/GPU</td>
                                <td className="py-2 px-4 text-green-400">Moondream-Station</td>
                            </tr>
                            <tr className="border-b border-neutral-800">
                                <td className="py-2 px-4">Generate image</td>
                                <td className="py-2 px-4">Python/GPU</td>
                                <td className="py-2 px-4 text-green-400">Moondream-Station</td>
                            </tr>
                            <tr className="border-b border-neutral-800">
                                <td className="py-2 px-4">Check GPU temp</td>
                                <td className="py-2 px-4">Python</td>
                                <td className="py-2 px-4 text-green-400">Moondream-Station</td>
                            </tr>
                            <tr className="border-b border-neutral-800">
                                <td className="py-2 px-4">Check WebGL</td>
                                <td className="py-2 px-4">Browser</td>
                                <td className="py-2 px-4 text-indigo-400">Frontend</td>
                            </tr>
                            <tr>
                                <td className="py-2 px-4">Start/stop backend</td>
                                <td className="py-2 px-4">Python</td>
                                <td className="py-2 px-4 text-orange-400">Station Manager</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Simple Analogy */}
            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-3">🍽️ Restaurant Analogy</h2>
                <p className="text-neutral-300 mb-4">Think of your system like a restaurant:</p>

                <div className="space-y-2 text-sm text-neutral-300">
                    <p><span className="text-indigo-400 font-semibold">Frontend</span> = Dining room where customers see the menu and order</p>
                    <p><span className="text-green-400 font-semibold">Moondream-Station</span> = Kitchen where food (AI results) is prepared</p>
                    <p><span className="text-orange-400 font-semibold">Station Manager</span> = Manager who can open/close the kitchen</p>
                    <p><span className="text-purple-400 font-semibold">AI Models</span> = Recipes and ingredients</p>
                </div>

                <p className="text-xs text-neutral-500 mt-4">💡 Everything runs on your local machine (localhost) - nothing goes to the cloud!</p>
            </div>
        </div>
    );
}
