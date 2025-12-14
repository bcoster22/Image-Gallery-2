
import React from 'react';
import { UploadIcon } from './icons';

interface UploadAreaProps {
  onFilesChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const UploadArea: React.FC<UploadAreaProps> = ({ onFilesChange }) => {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      // Create a synthetic event to pass to onFilesChange
      const input = document.getElementById('file-upload') as HTMLInputElement;
      if (input) {
        // Create a new FileList-like object
        const dataTransfer = new DataTransfer();
        Array.from(files).forEach((file: File) => {
          if (file.type.startsWith('image/')) {
            dataTransfer.items.add(file);
          }
        });
        input.files = dataTransfer.files;

        // Trigger the change event
        const event = new Event('change', { bubbles: true });
        input.dispatchEvent(event);
      }
    }
  };

  return (
    <div className="flex items-center justify-center h-[60vh]">
      <label
        htmlFor="file-upload"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative cursor-pointer flex flex-col items-center justify-center w-full max-w-lg p-10 border-2 border-dashed rounded-2xl transition-all duration-300 transform ${isDragging
          ? 'border-blue-500 bg-blue-900/30 scale-105'
          : 'border-gray-600 bg-gray-800/50 hover:bg-gray-800/80 hover:scale-105'
          }`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadIcon className={`w-12 h-12 mb-4 transition-colors ${isDragging ? 'text-blue-400' : 'text-gray-400'}`} />
          <p className="mb-2 text-lg text-gray-300"><span className="font-semibold">Click to upload</span> or drag and drop</p>
          <p className="text-sm text-gray-500">Bulk upload supported</p>
        </div>
        <input id="file-upload" type="file" className="hidden" multiple accept="image/*" onChange={onFilesChange} />
      </label>
    </div>
  );
};

export default UploadArea;
