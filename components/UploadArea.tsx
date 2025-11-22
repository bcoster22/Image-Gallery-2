
import React from 'react';
import { UploadIcon } from './icons';

interface UploadAreaProps {
  onFilesChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const UploadArea: React.FC<UploadAreaProps> = ({ onFilesChange }) => {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <label
        htmlFor="file-upload"
        className="relative cursor-pointer flex flex-col items-center justify-center w-full max-w-lg p-10 border-2 border-dashed border-gray-600 rounded-2xl bg-gray-800/50 hover:bg-gray-800/80 transition-all duration-300 transform hover:scale-105"
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadIcon className="w-12 h-12 mb-4 text-gray-400"/>
            <p className="mb-2 text-lg text-gray-300"><span className="font-semibold">Click to upload</span> or drag and drop</p>
            <p className="text-sm text-gray-500">Bulk upload supported</p>
        </div>
        <input id="file-upload" type="file" className="hidden" multiple accept="image/*" onChange={onFilesChange} />
      </label>
    </div>
  );
};

export default UploadArea;
