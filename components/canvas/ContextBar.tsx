import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReactFlow, useOnSelectionChange, Node as FlowNode } from '@xyflow/react';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { SketchPicker, ColorResult } from 'react-color';

type TextStyle = {
    color?: string;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
    textAlign?: 'left' | 'center' | 'right';
    fontSize?: number;
    lineHeight?: number;
    letterSpacing?: number;
};

type TextStyleKey = keyof TextStyle;

type TextNodeData = {
    label?: string;
    textStyle?: TextStyle;
};

const FONTS = [
    { name: 'Sans', value: 'var(--font-geist-sans), sans-serif' },
    { name: 'Serif', value: 'serif' },
    { name: 'Mono', value: 'var(--font-geist-mono), monospace' },
];

const TEXT_ALIGN_OPTIONS = [
    { value: 'left', label: '左对齐', Icon: AlignLeft },
    { value: 'center', label: '居中', Icon: AlignCenter },
    { value: 'right', label: '右对齐', Icon: AlignRight }
] as const;

export default function ContextBar() {
    const { setNodes } = useReactFlow();
    const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
    const [style, setStyle] = useState<TextStyle>({});
    const [colorOpen, setColorOpen] = useState(false);
    const colorButtonRef = useRef<HTMLButtonElement>(null);
    const colorPanelRef = useRef<HTMLDivElement>(null);
    const [colorPanelPosition, setColorPanelPosition] = useState({ top: 0, left: 0 });

    useOnSelectionChange({
        onChange: ({ nodes }) => {
            const textNode = nodes.find(n => n.type === 'text');
            setSelectedNode(textNode || null);
            setColorOpen(false);
            if (textNode) {
                setStyle((textNode.data as TextNodeData).textStyle || {});
            }
        },
    });

    useEffect(() => {
        if (!colorOpen) return;

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as globalThis.Node;
            if (colorButtonRef.current?.contains(target)) return;
            if (!colorPanelRef.current) return;
            if (colorPanelRef.current.contains(target)) return;
            setColorOpen(false);
        };

        const updateColorPanelPosition = () => {
            const button = colorButtonRef.current;
            if (!button) return;

            const rect = button.getBoundingClientRect();
            const panelWidth = 280;
            const left = Math.min(
                Math.max(12, rect.left),
                Math.max(12, window.innerWidth - panelWidth - 12)
            );

            setColorPanelPosition({
                top: rect.bottom + 10,
                left,
            });
        };

        updateColorPanelPosition();
        window.addEventListener('resize', updateColorPanelPosition);
        window.addEventListener('scroll', updateColorPanelPosition, true);
        window.addEventListener('pointerdown', handlePointerDown);
        return () => {
            window.removeEventListener('resize', updateColorPanelPosition);
            window.removeEventListener('scroll', updateColorPanelPosition, true);
            window.removeEventListener('pointerdown', handlePointerDown);
        };
    }, [colorOpen]);

    const update = <K extends TextStyleKey>(key: K, value: TextStyle[K]) => {
        if (!selectedNode) return;
        setStyle((prev) => ({ ...prev, [key]: value }));
        setNodes((nds) => nds.map((n) => {
            if (n.id === selectedNode.id) {
                const data = n.data as TextNodeData;
                return {
                    ...n,
                    data: {
                        ...n.data,
                        textStyle: { ...data.textStyle, [key]: value }
                    }
                };
            }
            return n;
        }));
    };

    if (!selectedNode) return null;

    return (
        <div className="fixed left-1/2 top-4 z-[9999] flex max-w-[calc(100vw-180px)] -translate-x-1/2 items-center gap-2 overflow-x-auto rounded-lg border border-zinc-200/90 bg-white/95 px-2 py-1.5 text-sm text-zinc-800 shadow-[0_8px_24px_rgba(24,24,27,0.08)] backdrop-blur-xl">
            <select
                value={style.fontFamily || FONTS[0].value}
                onChange={(e) => update('fontFamily', e.target.value)}
                className="h-8 rounded-md border border-transparent bg-transparent px-2 text-xs font-medium outline-none hover:border-zinc-200 hover:bg-zinc-50"
            >
                {FONTS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
            </select>

            <Divider />

            <div className="flex items-center gap-1">
                <input
                    type="number"
                    min="8"
                    max="72"
                    value={style.fontSize || 16}
                    onChange={(e) => update('fontSize', parseInt(e.target.value) || 16)}
                    className="h-8 w-12 rounded-md border border-zinc-200 bg-white px-1 text-center text-xs font-medium outline-none focus:border-zinc-500"
                />
                <span className="text-[11px] text-zinc-400">px</span>
            </div>

            <Divider />

            <select
                value={style.fontWeight || '400'}
                onChange={(e) => update('fontWeight', e.target.value)}
                className="h-8 rounded-md border border-transparent bg-transparent px-2 text-xs font-medium outline-none hover:border-zinc-200 hover:bg-zinc-50"
            >
                <option value="300">Light</option>
                <option value="400">Regular</option>
                <option value="700">Bold</option>
                <option value="900">Black</option>
            </select>

            <Divider />

            <div className="flex rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
                {TEXT_ALIGN_OPTIONS.map(align => (
                    <button
                        key={align.value}
                        onClick={() => update('textAlign', align.value)}
                        title={align.label}
                        className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${style.textAlign === align.value ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-950'}`}
                    >
                        <align.Icon size={15} strokeWidth={1.8} />
                    </button>
                ))}
            </div>

            <Divider />

            <div className="flex items-center gap-1">
                <span className="whitespace-nowrap text-[11px] text-zinc-400">行距</span>
                <input
                    type="number"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={style.lineHeight || 1.5}
                    onChange={(e) => update('lineHeight', parseFloat(e.target.value) || 1.5)}
                    className="h-8 w-12 rounded-md border border-zinc-200 bg-white px-1 text-center text-xs font-medium outline-none focus:border-zinc-500"
                />
            </div>

            <Divider />

            <div className="flex items-center gap-1">
                <span className="whitespace-nowrap text-[11px] text-zinc-400">字距</span>
                <input
                    type="number"
                    min="-2"
                    max="10"
                    step="0.5"
                    value={style.letterSpacing || 0}
                    onChange={(e) => update('letterSpacing', parseFloat(e.target.value) || 0)}
                    className="h-8 w-12 rounded-md border border-zinc-200 bg-white px-1 text-center text-xs font-medium outline-none focus:border-zinc-500"
                />
                <span className="text-[11px] text-zinc-400">px</span>
            </div>

            <Divider />

            <div className="relative">
                <button
                    ref={colorButtonRef}
                    type="button"
                    onClick={() => setColorOpen((current) => !current)}
                    className="flex h-8 items-center gap-2 rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                    title="颜色"
                >
                    <span
                        className="h-4 w-4 rounded-full border border-black/10"
                        style={{ backgroundColor: style.color || '#18181b' }}
                    />
                    <span className="whitespace-nowrap">颜色</span>
                </button>
            </div>
            {colorOpen && typeof window !== 'undefined' && createPortal(
                <div
                    ref={colorPanelRef}
                    className="fixed z-[10000] rounded-xl border border-zinc-200/90 bg-white p-2 shadow-[0_12px_36px_rgba(24,24,27,0.14)]"
                    style={{ top: `${colorPanelPosition.top}px`, left: `${colorPanelPosition.left}px` }}
                >
                    <SketchPicker
                        color={style.color || '#18181b'}
                        disableAlpha
                        onChange={(nextColor: ColorResult) => update('color', nextColor.hex)}
                    />
                </div>,
                document.body,
            )}
        </div>
    );
}

function Divider() {
    return <div className="h-5 w-px flex-none bg-zinc-200" />;
}
