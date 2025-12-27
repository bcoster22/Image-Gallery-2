import React, { useState } from 'react';
import { AdminSettings, PromptStrategy, PromptStep, AiProvider } from '../types';
import { PlusIcon, TrashIcon, CheckCircleIcon, XCircleIcon, PencilSquareIcon as EditIcon, ArrowUpIcon, ArrowDownIcon, MagnifyingGlassIcon as SearchIcon, Bars3Icon as GripVerticalIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import { providerCapabilities, capabilityDetails } from '../services/providerCapabilities';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PromptEngineeringPageProps {
    settings: AdminSettings;
    onUpdateSettings: (settings: AdminSettings) => void;
}

interface SortableStepProps {
    step: PromptStep;
    index: number;
    editingStrategyId: string;
    onStepChange: (strategyId: string, stepId: string, field: keyof PromptStep, value: string) => void;
    onRemoveStep: (strategyId: string, stepId: string) => void;
    onMoveStep: (strategyId: string, stepId: string, direction: 'up' | 'down') => void;
    isFirst: boolean;
    isLast: boolean;
}

const SortableStep: React.FC<SortableStepProps> = ({ step, index, editingStrategyId, onStepChange, onRemoveStep, onMoveStep, isFirst, isLast }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: step.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 group">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3 flex-1">
                    <button {...attributes} {...listeners} className="cursor-grab text-gray-500 hover:text-gray-300 p-1 rounded hover:bg-gray-800 focus:outline-none">
                        <GripVerticalIcon className="w-5 h-5" />
                    </button>
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-800 text-xs font-bold text-gray-400 border border-gray-700">
                        {index + 1}
                    </span>
                    <input
                        type="text"
                        value={step.name}
                        onChange={(e) => onStepChange(editingStrategyId, step.id, 'name', e.target.value)}
                        className="bg-transparent text-sm font-semibold text-indigo-300 focus:outline-none border-b border-transparent focus:border-indigo-500/50"
                    />
                    <input
                        type="text"
                        value={step.status}
                        onChange={(e) => onStepChange(editingStrategyId, step.id, 'status', e.target.value)}
                        className="bg-transparent text-xs text-gray-500 italic focus:outline-none border-b border-transparent focus:border-gray-600 flex-1"
                        placeholder="Status message..."
                    />
                </div>
                <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onMoveStep(editingStrategyId, step.id, 'up')}
                        disabled={isFirst}
                        className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white disabled:opacity-30"
                    >
                        <ArrowUpIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onMoveStep(editingStrategyId, step.id, 'down')}
                        disabled={isLast}
                        className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white disabled:opacity-30"
                    >
                        <ArrowDownIcon className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-gray-700 mx-1"></div>
                    <button
                        onClick={() => onRemoveStep(editingStrategyId, step.id)}
                        className="p-1 hover:bg-red-900/30 rounded text-gray-400 hover:text-red-400"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <textarea
                value={step.prompt}
                onChange={(e) => onStepChange(editingStrategyId, step.id, 'prompt', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-md p-3 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[80px] resize-y"
                placeholder="Enter prompt for this step..."
            />
        </div>
    );
};

const PromptEngineeringPage: React.FC<PromptEngineeringPageProps> = ({ settings, onUpdateSettings }) => {
    const [activeStrategyId, setActiveStrategyId] = useState<string>(settings.prompts.activeStrategyId);
    const [editingStrategyId, setEditingStrategyId] = useState<string | null>(null);
    const [newStrategyName, setNewStrategyName] = useState('');
    const [assignmentSearch, setAssignmentSearch] = useState('');

    const strategies = settings.prompts.strategies;
    const activeStrategy = strategies.find(s => s.id === activeStrategyId);
    const editingStrategy = strategies.find(s => s.id === editingStrategyId);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || !editingStrategy) return;

        if (active.id !== over.id) {
            const oldIndex = editingStrategy.steps.findIndex((step) => step.id === active.id);
            const newIndex = editingStrategy.steps.findIndex((step) => step.id === over.id);

            const newSteps = arrayMove(editingStrategy.steps, oldIndex, newIndex);

            handleUpdateStrategy({
                ...editingStrategy,
                steps: newSteps
            });
        }
    };

    const handleSetActiveStrategy = (id: string) => {
        setActiveStrategyId(id);
        onUpdateSettings({
            ...settings,
            prompts: {
                ...settings.prompts,
                activeStrategyId: id
            }
        });
    };

    const handleCreateStrategy = () => {
        if (!newStrategyName.trim()) return;
        const newId = `strategy-${Date.now()}`;
        const newStrategy: PromptStrategy = {
            id: newId,
            name: newStrategyName,
            description: 'Custom strategy',
            steps: []
        };

        onUpdateSettings({
            ...settings,
            prompts: {
                ...settings.prompts,
                strategies: [...strategies, newStrategy]
            }
        });
        setNewStrategyName('');
        setEditingStrategyId(newId);
    };

    const handleDeleteStrategy = (id: string) => {
        if (strategies.length <= 1) return; // Prevent deleting last strategy
        const newStrategies = strategies.filter(s => s.id !== id);
        let newActiveId = activeStrategyId;
        if (activeStrategyId === id) {
            newActiveId = newStrategies[0].id;
        }

        onUpdateSettings({
            ...settings,
            prompts: {
                activeStrategyId: newActiveId,
                strategies: newStrategies
            }
        });
    };

    const handleUpdateStrategy = (updatedStrategy: PromptStrategy) => {
        const newStrategies = strategies.map(s => s.id === updatedStrategy.id ? updatedStrategy : s);
        onUpdateSettings({
            ...settings,
            prompts: {
                ...settings.prompts,
                strategies: newStrategies
            }
        });
    };

    const handleAddStep = (strategyId: string) => {
        const strategy = strategies.find(s => s.id === strategyId);
        if (!strategy) return;

        const newStep: PromptStep = {
            id: `step-${Date.now()}`,
            name: `Step ${strategy.steps.length + 1}`,
            prompt: '',
            status: 'Analyzing...'
        };

        handleUpdateStrategy({
            ...strategy,
            steps: [...strategy.steps, newStep]
        });
    };

    const handleRemoveStep = (strategyId: string, stepId: string) => {
        const strategy = strategies.find(s => s.id === strategyId);
        if (!strategy) return;

        handleUpdateStrategy({
            ...strategy,
            steps: strategy.steps.filter(s => s.id !== stepId)
        });
    };

    const handleMoveStep = (strategyId: string, stepId: string, direction: 'up' | 'down') => {
        const strategy = strategies.find(s => s.id === strategyId);
        if (!strategy) return;

        const index = strategy.steps.findIndex(s => s.id === stepId);
        if (index === -1) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === strategy.steps.length - 1) return;

        const newSteps = [...strategy.steps];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newSteps[index], newSteps[swapIndex]] = [newSteps[swapIndex], newSteps[index]];

        handleUpdateStrategy({
            ...strategy,
            steps: newSteps
        });
    };

    const handleStepChange = (strategyId: string, stepId: string, field: keyof PromptStep, value: string) => {
        const strategy = strategies.find(s => s.id === strategyId);
        if (!strategy) return;

        const newSteps = strategy.steps.map(s => s.id === stepId ? { ...s, [field]: value } : s);
        handleUpdateStrategy({
            ...strategy,
            steps: newSteps
        });
    };

    const handleAssignmentChange = (providerId: string, strategyId: string) => {
        onUpdateSettings({
            ...settings,
            prompts: {
                ...settings.prompts,
                assignments: {
                    ...settings.prompts.assignments,
                    [providerId]: strategyId
                }
            }
        });
    };

    const visionProviders = Object.entries(providerCapabilities)
        .filter(([_, caps]) => caps.vision)
        .map(([id]) => ({
            id: id as AiProvider,
            name: capabilityDetails[id as AiProvider]?.name || id
        }))
        .filter(p => p.name.toLowerCase().includes(assignmentSearch.toLowerCase()));

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Prompt Engineering</h2>
                    <p className="text-gray-400">Design and manage multi-turn interrogation strategies.</p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={newStrategyName}
                        onChange={(e) => setNewStrategyName(e.target.value)}
                        placeholder="New Strategy Name"
                        className="bg-gray-800 border border-gray-600 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                        onClick={handleCreateStrategy}
                        disabled={!newStrategyName.trim()}
                        className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Create
                    </button>
                </div>
            </div>

            {/* Model Assignments Section */}
            <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white">Model Assignments</h3>
                    <div className="relative">
                        <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            value={assignmentSearch}
                            onChange={(e) => setAssignmentSearch(e.target.value)}
                            placeholder="Search models..."
                            className="bg-gray-900 border border-gray-700 rounded-full pl-9 pr-4 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-64"
                        />
                    </div>
                </div>

                <div className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden">
                    {visionProviders.length > 0 ? (
                        <div className="divide-y divide-gray-800">
                            {visionProviders.map(provider => (
                                <div key={provider.id} className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-900/30 flex items-center justify-center text-indigo-400">
                                            <SearchIcon className="w-4 h-4" />
                                        </div>
                                        <span className="font-medium text-gray-200">{provider.name}</span>
                                    </div>
                                    <select
                                        value={settings.prompts.assignments?.[provider.id] || ''}
                                        onChange={(e) => handleAssignmentChange(provider.id, e.target.value)}
                                        className="bg-gray-800 border border-gray-600 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 min-w-[200px]"
                                    >
                                        <option value="">Default (Single Prompt)</option>
                                        {strategies.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-500">
                            No models found matching "{assignmentSearch}"
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col md:flex-row h-full gap-6">
                {/* Strategy List - Hidden on mobile when editing */}
                <div className={`w-full md:w-1/3 bg-gray-800/30 rounded-lg border border-gray-700 flex flex-col ${editingStrategyId ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white">Strategies</h3>
                        <button
                            onClick={handleCreateStrategy}
                            className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
                            title="Create New Strategy"
                        >
                            <PlusIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {strategies.map(strategy => (
                            <div
                                key={strategy.id}
                                onClick={() => setEditingStrategyId(strategy.id)} // Changed to setEditingStrategyId
                                className={`p-3 rounded-lg cursor-pointer border transition-all ${editingStrategyId === strategy.id ? 'bg-indigo-900/30 border-indigo-500/50' : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`font-semibold text-sm ${editingStrategyId === strategy.id ? 'text-indigo-300' : 'text-gray-200'}`}>{strategy.name}</span>
                                    {editingStrategyId === strategy.id && <CheckCircleIcon className="w-4 h-4 text-indigo-400" />}
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-2">{strategy.description}</p>
                                <div className="flex justify-end mt-2">
                                    {/* Edit button removed as clicking the div now sets editingStrategyId */}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Editor Area - Full width on mobile when editing */}
                <div className={`flex-1 bg-gray-800/30 rounded-lg border border-gray-700 flex flex-col ${!editingStrategyId ? 'hidden md:flex' : 'flex'}`}>
                    {editingStrategy ? (
                        <>
                            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setEditingStrategyId(null)}
                                        className="md:hidden p-1 text-gray-400 hover:text-white"
                                    >
                                        <ChevronLeftIcon className="w-5 h-5" />
                                    </button>
                                    <input
                                        type="text"
                                        value={editingStrategy.name}
                                        onChange={(e) => handleUpdateStrategy({ ...editingStrategy, name: e.target.value })}
                                        className="bg-transparent text-lg font-bold text-white focus:outline-none border-b border-transparent focus:border-indigo-500"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleDeleteStrategy(editingStrategy.id)}
                                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-md transition-colors"
                                        title="Delete Strategy"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => setEditingStrategyId(null)}
                                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                                        title="Close Editor"
                                    >
                                        <XCircleIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 border-b border-gray-700 bg-gray-900/20">
                                <input
                                    type="text"
                                    value={editingStrategy.description}
                                    onChange={(e) => handleUpdateStrategy({ ...editingStrategy, description: e.target.value })}
                                    className="w-full bg-transparent text-sm text-gray-400 focus:outline-none border-b border-gray-700 focus:border-indigo-500 pb-1"
                                    placeholder="Strategy description..."
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto p-4">
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={editingStrategy.steps.map(s => s.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-3">
                                            {editingStrategy.steps.map((step, index) => (
                                                <SortableStep
                                                    key={step.id}
                                                    step={step}
                                                    index={index}
                                                    editingStrategyId={editingStrategy.id}
                                                    onStepChange={handleStepChange}
                                                    onRemoveStep={handleRemoveStep}
                                                    onMoveStep={handleMoveStep}
                                                    isFirst={index === 0}
                                                    isLast={index === editingStrategy.steps.length - 1}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>

                                <button
                                    onClick={() => handleAddStep(editingStrategy.id)}
                                    className="w-full mt-4 py-3 border-2 border-dashed border-gray-700 rounded-lg text-gray-500 hover:border-indigo-500 hover:text-indigo-400 transition-all flex items-center justify-center gap-2 font-medium"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    Add New Step
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
                            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                <EditIcon className="w-8 h-8 opacity-50" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-300 mb-2">Select a Strategy to Edit</h3>
                            <p className="text-sm max-w-xs">Choose a strategy from the list on the left to modify its steps, prompts, and configuration.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PromptEngineeringPage;
