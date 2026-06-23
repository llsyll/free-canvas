import React, { useState } from 'react';
import { useReactFlow, useOnSelectionChange, Node } from '@xyflow/react';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

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

const COLORS = ['#000000', '#dc2626', '#ea580c', '#16a34a', '#2563eb', '#7c3aed', '#db2777', '#ffffff'];

const TEXT_ALIGN_OPTIONS = [
    { value: 'left', label: '左对齐', Icon: AlignLeft },
    { value: 'center', label: '居中', Icon: AlignCenter },
    { value: 'right', label: '右对齐', Icon: AlignRight }
] as const;

export default function ContextBar() {
    const { setNodes } = useReactFlow();
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [style, setStyle] = useState<TextStyle>({});

    useOnSelectionChange({
        onChange: ({ nodes }) => {
            const textNode = nodes.find(n => n.type === 'text');
            setSelectedNode(textNode || null);
            if (textNode) {
                setStyle((textNode.data as TextNodeData).textStyle || {});
            }
        },
    });

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
        <div style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '12px 24px',
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(12px)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            minWidth: '600px'
        }}>
            {/* Font */}
            <select
                value={style.fontFamily || FONTS[0].value}
                onChange={(e) => update('fontFamily', e.target.value)}
                style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    cursor: 'pointer'
                }}
            >
                {FONTS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
            </select>

            <div style={{ width: '1px', height: '24px', backgroundColor: '#e5e7eb' }} />

            {/* Font Size */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                    type="number"
                    min="8"
                    max="72"
                    value={style.fontSize || 16}
                    onChange={(e) => update('fontSize', parseInt(e.target.value) || 16)}
                    style={{
                        width: '50px',
                        fontSize: '14px',
                        fontWeight: '500',
                        background: 'transparent',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        outline: 'none',
                        textAlign: 'center'
                    }}
                />
                <span style={{ fontSize: '12px', color: '#6b7280' }}>px</span>
            </div>

            <div style={{ width: '1px', height: '24px', backgroundColor: '#e5e7eb' }} />

            {/* Weight */}
            <select
                value={style.fontWeight || '400'}
                onChange={(e) => update('fontWeight', e.target.value)}
                style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    cursor: 'pointer'
                }}
            >
                <option value="300">Light</option>
                <option value="400">Regular</option>
                <option value="700">Bold</option>
                <option value="900">Black</option>
            </select>


            <div style={{ width: '1px', height: '24px', backgroundColor: '#e5e7eb' }} />

            {/* Text Align */}
            <div style={{ display: 'flex', gap: '4px' }}>
                {TEXT_ALIGN_OPTIONS.map(align => (
                    <button
                        key={align.value}
                        onClick={() => update('textAlign', align.value)}
                        title={align.label}
                        style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            backgroundColor: style.textAlign === align.value ? '#3b82f6' : 'transparent',
                            color: style.textAlign === align.value ? '#ffffff' : '#000000',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                            if (style.textAlign !== align.value) {
                                e.currentTarget.style.backgroundColor = '#f3f4f6';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (style.textAlign !== align.value) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }
                        }}
                    >
                        <align.Icon size={18} />
                    </button>
                ))}
            </div>

            <div style={{ width: '1px', height: '24px', backgroundColor: '#e5e7eb' }} />

            {/* Line Height */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>行距</span>
                <input
                    type="number"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={style.lineHeight || 1.5}
                    onChange={(e) => update('lineHeight', parseFloat(e.target.value) || 1.5)}
                    style={{
                        width: '50px',
                        fontSize: '14px',
                        fontWeight: '500',
                        background: 'transparent',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        outline: 'none',
                        textAlign: 'center'
                    }}
                />
            </div>

            <div style={{ width: '1px', height: '24px', backgroundColor: '#e5e7eb' }} />

            {/* Letter Spacing */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>字距</span>
                <input
                    type="number"
                    min="-2"
                    max="10"
                    step="0.5"
                    value={style.letterSpacing || 0}
                    onChange={(e) => update('letterSpacing', parseFloat(e.target.value) || 0)}
                    style={{
                        width: '50px',
                        fontSize: '14px',
                        fontWeight: '500',
                        background: 'transparent',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        outline: 'none',
                        textAlign: 'center'
                    }}
                />
                <span style={{ fontSize: '12px', color: '#6b7280' }}>px</span>
            </div>

            <div style={{ width: '1px', height: '24px', backgroundColor: '#e5e7eb' }} />

            {/* Colors */}
            <div style={{ display: 'flex', gap: '10px' }}>
                {COLORS.map(c => (
                    <button
                        key={c}
                        onClick={() => update('color', c)}
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: c,
                            border: c === '#ffffff' ? '2px solid #d1d5db' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            outline: style.color === c ? '2px solid #3b82f6' : 'none',
                            outlineOffset: '2px',
                            transform: style.color === c ? 'scale(1.1)' : 'scale(1)'
                        }}
                        onMouseEnter={(e) => {
                            if (style.color !== c) {
                                e.currentTarget.style.transform = 'scale(1.1)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (style.color !== c) {
                                e.currentTarget.style.transform = 'scale(1)';
                            }
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
