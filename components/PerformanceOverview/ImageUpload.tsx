import React from 'react';
import { Eye, Download, XCircle } from 'lucide-react';

interface ImageUploadProps {
    testImage: string | null;
    setTestImage: (image: string | null) => void;
}

export function ImageUpload({ testImage, setTestImage }: ImageUploadProps) {
    return (
        <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Eye className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-white">Test Image</h2>
                    <p className="text-sm text-neutral-400">Required for testing Vision & Analysis models</p>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex-1">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-neutral-700 border-dashed rounded-lg cursor-pointer bg-neutral-800/50 hover:bg-neutral-800 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Download className="w-8 h-8 mb-3 text-neutral-400 rotate-180" />
                            <p className="mb-2 text-sm text-neutral-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                            <p className="text-xs text-neutral-500">PNG, JPG or WEBP</p>
                        </div>
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                        setTestImage(reader.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                }
                            }}
                        />
                    </label>
                </div>

                {testImage && (
                    <div className="relative group w-32 h-32 bg-black rounded-lg border border-white/10 overflow-hidden shrink-0">
                        <img src={testImage} alt="Test Preview" className="w-full h-full object-cover" />
                        <button
                            onClick={() => setTestImage(null)}
                            className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors"
                        >
                            <XCircle className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
