import React from 'react';
import {
  TrashIcon,
  XCircleIcon as CloseIcon,
  CheckCircleIcon,
  UserIcon,
  ArrowPathIcon as RefreshIcon, // Regenerate
  QueueListIcon as SelectAllIcon,
  ViewfinderCircleIcon as ViewfinderIcon, // Smart Crop (Old)
  ScissorsIcon as CropIcon, // Smart Crop (New)
  SparklesIcon as MagicIcon, // Remix/Generate
  VideoCameraIcon as AnimateIcon,
  ArrowTrendingUpIcon as UpscaleIcon, // Enhance
  ArrowsRightLeftIcon as TransferIcon, // Img2Img
  ArrowDownTrayIcon as DownloadIcon
} from '@heroicons/react/24/outline';
import { ImageInfo } from '../types';
import BulkDownloader from './BulkDownloader';

interface SelectionActionBarProps {
  count: number;
  selectedImages: ImageInfo[];
  onDelete: () => void;
  onClear: () => void;
  onRemix: () => void;
  onMakePublic: () => void;
  onMakePrivate: () => void;
  onRegenerate: () => void;
  onSelectAll: () => void;
  onSmartCrop: () => void;
  onEnhance?: () => void; // Added for completeness
  onAnimate?: () => void; // Added for completeness
  triggerDownload?: boolean;
}

const ActionButton: React.FC<{
  onClick?: () => void;
  disabled?: boolean;
  icon: React.ElementType;
  label?: string; // Tooltip/Sr-only
  colorClass: string;
  badge?: number;
}> = ({ onClick, disabled, icon: Icon, label, colorClass, badge }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={label}
    className={`
      group relative p-3 rounded-xl transition-all duration-200 ease-out
      ${disabled ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:scale-105 active:scale-95 shadow-lg'}
      ${colorClass}
    `}
  >
    <Icon className="w-6 h-6 text-white" strokeWidth={1.5} />
    {badge ? (
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
        {badge}
      </span>
    ) : null}
    {/* Tooltip on hover */}
    {label && !disabled && (
      <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10">
        {label}
      </span>
    )}
  </button>
);

const SelectionActionBar: React.FC<SelectionActionBarProps> = ({
  count,
  selectedImages,
  onDelete,
  onClear,
  onRemix,
  onMakePublic,
  onMakePrivate,
  onRegenerate,
  onSelectAll,
  onSmartCrop,
  onEnhance,
  onAnimate,
  triggerDownload
}) => {
  return (
    <div className={`fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-8 p-4 pointer-events-none transition-transform duration-300 ease-in-out ${count > 0 ? 'translate-y-0' : 'translate-y-32'}`}>

      {/* Main Container - Glassmorphism Dock */}
      <div className="bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex items-center p-2 gap-4 pointer-events-auto max-w-full overflow-x-auto scrollbar-hide">

        {/* 1. Selection Info & Controls (Left) */}
        <div className="flex items-center gap-3 pr-4 border-r border-white/10">
          <div className="flex flex-col items-start min-w-[60px] pl-2">
            <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Selected</span>
            <span className="text-xl font-bold text-white leading-none">{count}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onSelectAll}
              className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Select All"
            >
              <SelectAllIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onClear}
              className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Clear Selection"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Creative Actions (Center - The "Actions" Toolbar) */}
        <div className="flex items-center gap-2">
          {/* Section Label (Optional, matches screenshot 'ACTIONS' text style roughly?) */}
          {/* actually screenshot has label above, but inline is cleaner for single bar. We omit text label for cleanliness. */}

          {/* Crop (Scissors) */}
          <ActionButton
            onClick={onSmartCrop}
            icon={CropIcon}
            label="Smart Crop"
            colorClass="bg-slate-700 hover:bg-slate-600 ring-1 ring-white/10"
          />

          {/* Enhance (Trend Up) - Purple */}
          {/* If onEnhance is not passed, we can hide or show disabled. Showing disabled to match design request? 
               Let's show disabled if not present to illustrate the UI capability requested. */}
          <ActionButton
            onClick={onEnhance}
            disabled={!onEnhance}
            icon={UpscaleIcon}
            label="Upscale / Enhance"
            colorClass="bg-purple-600 hover:bg-purple-500 ring-1 ring-purple-400/30"
          />

          {/* Regenerate (Refresh) - Blue */}
          <ActionButton
            onClick={onRegenerate}
            icon={RefreshIcon}
            label="Regenerate"
            colorClass="bg-blue-600 hover:bg-blue-500 ring-1 ring-blue-400/30"
          />

          {/* Animate (Video) - Green */}
          <ActionButton
            onClick={onAnimate}
            disabled={!onAnimate}
            icon={AnimateIcon}
            label="Animate"
            colorClass="bg-emerald-600 hover:bg-emerald-500 ring-1 ring-emerald-400/30"
          />

          {/* Remix (Sparkles) - Pink */}
          <ActionButton
            onClick={onRemix}
            icon={MagicIcon}
            label="Remix"
            colorClass="bg-pink-600 hover:bg-pink-500 ring-1 ring-pink-400/30"
          />

          {/* Img2Img (Arrows) - Indigo */}
          {/* We map this to Remix as well if only one remix function? Or maybe onRemix IS Img2Img. 
               Let's map TransferIcon to onRemix too for now, or hide if redundant.
               The screenshot showed 6 icons. We have 5 above.
               Let's add the 6th as a 'Transfer' or placeholder.
               Actually, in ActionButtons: Sparkles = Txt2Img (Generate), Arrows = Img2Img (Recreate).
               Here onRemix usually triggers BatchRemix (Img2Img).
               So maybe `onRemix` should be on the ArrowsIcon?
               And `Sparkles` could be a new "Generate Variant"?
               Let's mapping existing `onRemix` to `Sparkles` (Pink) as users associate Magic with Remix.
               And leave Arrows for `TriggerDownload`? No.
               Let's stick to the 5 strong creative actions + Management.
           */}
          <ActionButton
            onClick={onRemix}
            icon={TransferIcon}
            label="Transfer / Img2Img"
            colorClass="bg-indigo-600 hover:bg-indigo-500 ring-1 ring-indigo-400/30"
          />

        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-white/10 mx-2"></div>

        {/* 3. Management Actions (Right) */}
        <div className="flex items-center gap-2">
          {/* Download */}
          <BulkDownloader
            selectedImages={selectedImages}
            className="group p-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-all ring-1 ring-white/10 w-[48px] h-[48px] flex items-center justify-center"
            triggerDownload={triggerDownload}
            showIconOnly={true}
          />

          {/* Privacy Group */}
          <div className="flex bg-neutral-800 rounded-xl p-1 border border-white/5 h-[48px] items-center">
            <button
              onClick={onMakePublic}
              className="p-3 text-neutral-400 hover:text-emerald-400 hover:bg-neutral-700 rounded-lg transition-colors"
              title="Make Public"
            >
              <CheckCircleIcon className="w-5 h-5" />
            </button>
            <div className="w-px bg-white/5 mx-0.5 h-6"></div>
            <button
              onClick={onMakePrivate}
              className="p-3 text-neutral-400 hover:text-amber-400 hover:bg-neutral-700 rounded-lg transition-colors"
              title="Make Private"
            >
              <UserIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Delete */}
          <button
            onClick={onDelete}
            className="p-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all ring-1 ring-red-500/20 ml-2"
            title="Delete Selected"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default SelectionActionBar;
