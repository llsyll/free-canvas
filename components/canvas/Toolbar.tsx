import React from 'react';
import { MousePointer2, Type, Trash2, Maximize, Hand, Undo2, Redo2, Download, Upload } from 'lucide-react';

export type ToolMode = 'select' | 'hand';

type ToolbarProps = {
    activeMode: ToolMode;
    onSetMode: (mode: ToolMode) => void;
    onAddText: () => void;
    onClear: () => void;
    onFitView: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onSaveFile: () => void;
    onOpenFile: () => void;
};

const Divider = () => (
    <div className="w-8 h-px bg-gray-200/60 mx-auto my-1" />
);

export default function Toolbar({ activeMode, onSetMode, onAddText, onClear, onFitView, onUndo, onRedo, onSaveFile, onOpenFile }: ToolbarProps) {
    const btnClass = (isActive: boolean, isDestructive = false) => `
        w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ease-out flex-shrink-0
        ${isActive
            ? 'bg-black/80 text-white shadow-lg shadow-black/20 scale-105'
            : `text-gray-500 hover:scale-110 active:scale-95 ${isDestructive ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-black/5 hover:text-black'}`
        }
    `;

    return (
        <div className="flex flex-col items-center gap-2 p-2">
            {/* Navigation */}
            <button onClick={() => onSetMode('select')} className={btnClass(activeMode === 'select')} title="Select Mode (V)">
                <MousePointer2 className="w-5 h-5 pointer-events-none" strokeWidth={2} />
            </button>
            <button onClick={() => onSetMode('hand')} className={btnClass(activeMode === 'hand')} title="Hand Mode (H)">
                <Hand className="w-5 h-5 pointer-events-none" strokeWidth={2} />
            </button>

            <Divider />

            {/* Creation */}
            <button onClick={onAddText} className={btnClass(false)} title="Add Text (T)">
                <Type className="w-5 h-5 pointer-events-none" strokeWidth={2} />
            </button>

            <Divider />

            {/* Undo/Redo */}
            <button onClick={onUndo} className={btnClass(false)} title="Undo (Cmd+Z)">
                <Undo2 className="w-5 h-5 pointer-events-none" strokeWidth={2} />
            </button>
            <button onClick={onRedo} className={btnClass(false)} title="Redo (Cmd+Shift+Z)">
                <Redo2 className="w-5 h-5 pointer-events-none" strokeWidth={2} />
            </button>

            <Divider />

            {/* File */}
            <button onClick={onSaveFile} className={btnClass(false)} title="Save File (JSON)">
                <Download className="w-5 h-5 pointer-events-none" strokeWidth={2} />
            </button>
            <button onClick={onOpenFile} className={btnClass(false)} title="Open File (JSON)">
                <Upload className="w-5 h-5 pointer-events-none" strokeWidth={2} />
            </button>

            <Divider />

            {/* View */}
            <button onClick={onFitView} className={btnClass(false)} title="Fit View">
                <Maximize className="w-5 h-5 pointer-events-none" strokeWidth={2} />
            </button>

            <Divider />

            {/* Clear */}
            <button onClick={onClear} className={btnClass(false, true)} title="Clear Canvas">
                <Trash2 className="w-5 h-5 pointer-events-none" strokeWidth={2} />
            </button>
        </div>
    );
}
