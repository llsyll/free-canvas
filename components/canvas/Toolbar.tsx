import React, { useEffect, useRef, useState } from 'react';
import {
    AlignHorizontalJustifyCenter,
    AlignHorizontalJustifyEnd,
    AlignHorizontalDistributeCenter,
    AlignHorizontalJustifyStart,
    AlignVerticalJustifyCenter,
    AlignVerticalJustifyEnd,
    AlignVerticalDistributeCenter,
    AlignVerticalJustifyStart,
    BringToFront,
    EyeOff,
    Hand,
    Maximize,
    Maximize2,
    MousePointer2,
    MoveDown,
    MoveUp,
    Redo2,
    SendToBack,
    Trash2,
    Type,
    Undo2,
    Download,
    Upload,
    LayoutPanelLeft,
} from 'lucide-react';

export type ToolMode = 'select' | 'hand';

type ToolbarProps = {
    activeMode: ToolMode;
    textInsertMode: boolean;
    chromeMode: 'normal' | 'fullscreen' | 'canvasOnly';
    onSetMode: (mode: ToolMode) => void;
    onAddText: () => void;
    onClear: () => void;
    onFitView: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onSaveFile: () => void;
    onOpenFile: () => void;
    onEnterFullscreen: () => void;
    onEnterCanvasOnly: () => void;
    hasSelection: boolean;
    onAlignLeft: () => void;
    onAlignCenter: () => void;
    onAlignRight: () => void;
    onAlignTop: () => void;
    onAlignMiddle: () => void;
    onAlignBottom: () => void;
    onDistributeHorizontal: () => void;
    onDistributeVertical: () => void;
    onSendToBack: () => void;
    onMoveDown: () => void;
    onMoveUp: () => void;
    onBringToFront: () => void;
};

const Divider = () => <div className="mx-auto my-1 h-px w-6 bg-zinc-200/80" />;

type MenuItemProps = {
    onClick: () => void;
    disabled?: boolean;
    icon: React.ReactNode;
    label: string;
};

function MenuItem({ onClick, disabled, icon, label }: MenuItemProps) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-xs text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40"
        >
            <span className="flex h-4 w-4 items-center justify-center text-zinc-500">{icon}</span>
            <span className="whitespace-nowrap">{label}</span>
        </button>
    );
}

type MenuGroupProps = {
    label: string;
    icon: React.ReactNode;
    open: boolean;
    onToggle: () => void;
    onClose: () => void;
    children: React.ReactNode;
};

function MenuGroup({ label, icon, open, onToggle, onClose, children }: MenuGroupProps) {
    return (
        <div className="relative">
            <button
                type="button"
                onClick={onToggle}
                className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${open ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950'}`}
                aria-expanded={open}
                title={label}
            >
                {icon}
                <span className="sr-only">{label}</span>
            </button>
            {open && (
                <>
                    <button
                        type="button"
                        aria-label={`关闭${label}`}
                        className="fixed inset-0 z-40 cursor-default bg-transparent"
                        onClick={onClose}
                    />
                    <div className="absolute left-full top-0 z-50 ml-2 min-w-40 rounded-lg border border-zinc-200 bg-white p-1.5 shadow-[0_12px_32px_rgba(24,24,27,0.12)]">
                        <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400">{label}</div>
                        <div className="space-y-0.5">{children}</div>
                    </div>
                </>
            )}
        </div>
    );
}

export default function Toolbar({
    activeMode,
    textInsertMode,
    chromeMode,
    onSetMode,
    onAddText,
    onClear,
    onFitView,
    onUndo,
    onRedo,
    onSaveFile,
    onOpenFile,
    onEnterFullscreen,
    onEnterCanvasOnly,
    hasSelection,
    onAlignLeft,
    onAlignCenter,
    onAlignRight,
    onAlignTop,
    onAlignMiddle,
    onAlignBottom,
    onDistributeHorizontal,
    onDistributeVertical,
    onSendToBack,
    onMoveDown,
    onMoveUp,
    onBringToFront,
}: ToolbarProps) {
    const toolbarRef = useRef<HTMLDivElement>(null);
    const [openMenu, setOpenMenu] = useState<'arrange' | 'file' | null>(null);

    const closeMenus = () => setOpenMenu(null);
    const toggleMenu = (menu: 'arrange' | 'file') => {
        setOpenMenu((current) => (current === menu ? null : menu));
    };

    useEffect(() => {
        const handlePointerDown = (event: PointerEvent) => {
            if (!toolbarRef.current) return;
            if (toolbarRef.current.contains(event.target as Node)) return;
            closeMenus();
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') closeMenus();
        };

        document.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const runAndClose = (callback: () => void) => {
        callback();
        closeMenus();
    };

    const btnClass = (isActive: boolean, isDestructive = false) => `
        h-9 w-9 appearance-none border-0 flex items-center justify-center rounded-md transition-colors duration-150 flex-shrink-0 disabled:cursor-not-allowed disabled:opacity-30
        ${isActive
            ? 'bg-zinc-900 text-white'
            : `bg-transparent text-zinc-500 ${isDestructive ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-zinc-100 hover:text-zinc-950'}`
        }
    `;

    return (
        <div ref={toolbarRef} className="flex w-12 flex-col items-center gap-1 rounded-lg border border-zinc-200/80 bg-white/95 p-1.5 shadow-[0_8px_24px_rgba(24,24,27,0.05)] backdrop-blur-xl">
            {/* Navigation */}
            <button onClick={() => runAndClose(() => onSetMode('select'))} className={btnClass(activeMode === 'select')} title="Select Mode (V)">
                <MousePointer2 className="pointer-events-none h-4 w-4" strokeWidth={1.8} />
            </button>
            <button onClick={() => runAndClose(() => onSetMode('hand'))} className={btnClass(activeMode === 'hand')} title="Hand Mode (H)">
                <Hand className="pointer-events-none h-4 w-4" strokeWidth={1.8} />
            </button>

            <Divider />

            {/* Creation */}
            <button onClick={() => runAndClose(onAddText)} className={btnClass(textInsertMode)} title="Text Tool (T)">
                <Type className="pointer-events-none h-4 w-4" strokeWidth={1.8} />
            </button>

            <Divider />

            <MenuGroup
                label="排列"
                icon={<LayoutPanelLeft className="h-4 w-4" strokeWidth={1.8} />}
                open={openMenu === 'arrange'}
                onToggle={() => toggleMenu('arrange')}
                onClose={closeMenus}
            >
                <MenuItem onClick={onAlignLeft} disabled={!hasSelection} icon={<AlignHorizontalJustifyStart className="h-3.5 w-3.5" strokeWidth={1.9} />} label="左对齐" />
                <MenuItem onClick={onAlignCenter} disabled={!hasSelection} icon={<AlignHorizontalJustifyCenter className="h-3.5 w-3.5" strokeWidth={1.9} />} label="水平居中" />
                <MenuItem onClick={onAlignRight} disabled={!hasSelection} icon={<AlignHorizontalJustifyEnd className="h-3.5 w-3.5" strokeWidth={1.9} />} label="右对齐" />
                <Divider />
                <MenuItem onClick={onAlignTop} disabled={!hasSelection} icon={<AlignVerticalJustifyStart className="h-3.5 w-3.5" strokeWidth={1.9} />} label="上对齐" />
                <MenuItem onClick={onAlignMiddle} disabled={!hasSelection} icon={<AlignVerticalJustifyCenter className="h-3.5 w-3.5" strokeWidth={1.9} />} label="垂直居中" />
                <MenuItem onClick={onAlignBottom} disabled={!hasSelection} icon={<AlignVerticalJustifyEnd className="h-3.5 w-3.5" strokeWidth={1.9} />} label="下对齐" />
                <Divider />
                <MenuItem onClick={onDistributeHorizontal} disabled={!hasSelection} icon={<AlignHorizontalDistributeCenter className="h-3.5 w-3.5" strokeWidth={1.9} />} label="水平等距" />
                <MenuItem onClick={onDistributeVertical} disabled={!hasSelection} icon={<AlignVerticalDistributeCenter className="h-3.5 w-3.5" strokeWidth={1.9} />} label="垂直等距" />
                <Divider />
                <MenuItem onClick={onBringToFront} disabled={!hasSelection} icon={<BringToFront className="h-3.5 w-3.5" strokeWidth={1.9} />} label="置顶" />
                <MenuItem onClick={onMoveUp} disabled={!hasSelection} icon={<MoveUp className="h-3.5 w-3.5" strokeWidth={1.9} />} label="上移一层" />
                <MenuItem onClick={onMoveDown} disabled={!hasSelection} icon={<MoveDown className="h-3.5 w-3.5" strokeWidth={1.9} />} label="下移一层" />
                <MenuItem onClick={onSendToBack} disabled={!hasSelection} icon={<SendToBack className="h-3.5 w-3.5" strokeWidth={1.9} />} label="置底" />
            </MenuGroup>

            <Divider />

            <MenuGroup
                label="文件"
                icon={<Upload className="h-4 w-4" strokeWidth={1.8} />}
                open={openMenu === 'file'}
                onToggle={() => toggleMenu('file')}
                onClose={closeMenus}
            >
                <MenuItem onClick={onSaveFile} icon={<Download className="h-3.5 w-3.5" strokeWidth={1.9} />} label="导出 JSON" />
                <MenuItem onClick={onOpenFile} icon={<Upload className="h-3.5 w-3.5" strokeWidth={1.9} />} label="导入 JSON" />
            </MenuGroup>

            <Divider />

            <button onClick={() => { closeMenus(); onFitView(); }} className={btnClass(false)} title="适配画布">
                <Maximize className="pointer-events-none h-4 w-4" strokeWidth={1.8} />
            </button>
            <button
                onClick={() => { closeMenus(); onEnterFullscreen(); }}
                className={btnClass(chromeMode === 'fullscreen')}
                title="全屏专注 (Shift+F)"
            >
                <Maximize2 className="pointer-events-none h-4 w-4" strokeWidth={1.8} />
            </button>
            <button
                onClick={() => { closeMenus(); onEnterCanvasOnly(); }}
                className={btnClass(chromeMode === 'canvasOnly')}
                title="纯画布模式 (F)"
            >
                <EyeOff className="pointer-events-none h-4 w-4" strokeWidth={1.8} />
            </button>

            <Divider />

            <button onClick={() => runAndClose(onUndo)} className={btnClass(false)} title="Undo (Cmd+Z)">
                <Undo2 className="pointer-events-none h-4 w-4" strokeWidth={1.8} />
            </button>
            <button onClick={() => runAndClose(onRedo)} className={btnClass(false)} title="Redo (Cmd+Shift+Z)">
                <Redo2 className="pointer-events-none h-4 w-4" strokeWidth={1.8} />
            </button>

            <Divider />

            {/* Clear */}
            <button onClick={() => runAndClose(onClear)} className={btnClass(false, true)} title="Clear Canvas">
                <Trash2 className="pointer-events-none h-4 w-4" strokeWidth={1.8} />
            </button>
        </div>
    );
}
