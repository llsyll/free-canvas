import React, { memo, useCallback, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { NodeProps, NodeResizer, useReactFlow } from '@xyflow/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Enhanced Data Type
type TextNodeData = {
    label: string;
    textStyle?: {
        color?: string;
        fontFamily?: string;
        fontWeight?: string;
        fontStyle?: string;
        textDecoration?: string;
        textAlign?: 'left' | 'center' | 'right';
        fontSize?: number;
        lineHeight?: number; // 行距
        letterSpacing?: number; // 字间距
    }
};

const MIN_TEXT_WIDTH = 120;
const MIN_TEXT_HEIGHT = 56;
const MAX_TEXT_WIDTH = 720;
const TEXT_PADDING_X = 16;
const TEXT_PADDING_Y = 16;

const TextNodeSimpler = ({ id, data, selected, width, height }: NodeProps) => {
    const { setNodes } = useReactFlow();
    const nodeData = data as unknown as TextNodeData;
    const initialText = nodeData.label || 'Text';
    const textStyle = nodeData.textStyle || {};

    const [text, setText] = useState(initialText);
    const [isEditing, setIsEditing] = useState(false);
    const [isCtrlPressed, setIsCtrlPressed] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const measureRef = useRef<HTMLDivElement>(null);

    const lastSizeRef = useRef({ width: width || 300, height: height || 150 });

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
        }
    }, [isEditing]);

    // 监听 Ctrl/Cmd 键
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey) {
                setIsCtrlPressed(true);
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (!e.metaKey && !e.ctrlKey) {
                setIsCtrlPressed(false);
            }
        };
        const handleBlur = () => {
            setIsCtrlPressed(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);

    // 监听节点尺寸变化,按住 Ctrl/Cmd 时缩放字体
    useEffect(() => {
        if (!selected || isEditing || !isCtrlPressed) {
            lastSizeRef.current = { width: width || 300, height: height || 150 };
            return;
        }

        const currentWidth = width || 300;
        const currentHeight = height || 150;
        const lastWidth = lastSizeRef.current.width;
        const lastHeight = lastSizeRef.current.height;

        // 计算缩放比例(使用宽度和高度的平均值)
        const scaleX = currentWidth / lastWidth;
        const scaleY = currentHeight / lastHeight;
        const scale = (scaleX + scaleY) / 2;

        // 只有在尺寸真正变化时才更新
        if (Math.abs(scale - 1) > 0.01) {
            const currentFontSize = textStyle.fontSize || 16;
            const newFontSize = Math.max(8, Math.min(72, currentFontSize * scale));

            setNodes((nds) => nds.map((n) => {
                if (n.id === id) {
                    return {
                        ...n,
                        data: {
                            ...n.data,
                            textStyle: {
                                ...(n.data.textStyle as object),
                                fontSize: newFontSize
                            }
                        }
                    };
                }
                return n;
            }));
        }

        lastSizeRef.current = { width: currentWidth, height: currentHeight };
    }, [width, height, isCtrlPressed, selected, isEditing, id, setNodes, textStyle.fontSize]);

    const updateNode = useCallback((nextText: string, nextSize?: { width: number; height: number }) => {
        setNodes((nds) => nds.map((n) => {
            if (n.id !== id) return n;

            return {
                ...n,
                ...(nextSize ? {
                    width: nextSize.width,
                    height: nextSize.height,
                    style: {
                        ...n.style,
                        width: nextSize.width,
                        height: nextSize.height,
                    },
                } : {}),
                data: {
                    ...n.data,
                    label: nextText,
                },
            };
        }));
    }, [id, setNodes]);

    const onBlur = () => {
        updateNode(text);
        setIsEditing(false);
    };

    // 使用 textStyle 中的字体大小,如果没有则使用默认值 16
    const baseFontSize = textStyle.fontSize || 16;

    const commonStyle: React.CSSProperties = {
        fontSize: `${baseFontSize}px`,
        lineHeight: textStyle.lineHeight || 1.5,
        letterSpacing: textStyle.letterSpacing ? `${textStyle.letterSpacing}px` : 'normal',
        color: textStyle.color || '#18181b',
        fontFamily: textStyle.fontFamily || 'var(--font-geist-sans), sans-serif',
        fontWeight: textStyle.fontWeight || 'normal',
        fontStyle: textStyle.fontStyle || 'normal',
        textDecoration: textStyle.textDecoration || 'none',
        textAlign: textStyle.textAlign || 'left',
    };

    useLayoutEffect(() => {
        if (!isEditing || !measureRef.current) return;

        const measured = measureRef.current.getBoundingClientRect();
        const nextWidth = Math.ceil(Math.min(MAX_TEXT_WIDTH, Math.max(MIN_TEXT_WIDTH, measured.width + TEXT_PADDING_X)));
        const nextHeight = Math.ceil(Math.max(MIN_TEXT_HEIGHT, measured.height + TEXT_PADDING_Y));
        const currentWidth = Math.round(width || 0);
        const currentHeight = Math.round(height || 0);

        if (Math.abs(nextWidth - currentWidth) < 2 && Math.abs(nextHeight - currentHeight) < 2) return;

        updateNode(text, { width: nextWidth, height: nextHeight });
    }, [isEditing, text, textStyle.fontFamily, textStyle.fontSize, textStyle.fontWeight, textStyle.lineHeight, textStyle.letterSpacing, width, height, updateNode]);

    const onTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const nextText = event.target.value;
        setText(nextText);
        updateNode(nextText);
    };

    return (
        <div
            className="w-full h-full relative group"
            onDoubleClick={(e) => {
                e.stopPropagation();
                setText(nodeData.label || 'Text');
                setIsEditing(true);
            }}
        >
            <div
                ref={measureRef}
                aria-hidden="true"
                className="pointer-events-none fixed left-[-10000px] top-[-10000px] whitespace-pre-wrap px-2 py-2"
                style={{
                    ...commonStyle,
                    width: 'max-content',
                    maxWidth: MAX_TEXT_WIDTH - TEXT_PADDING_X,
                    overflowWrap: 'break-word',
                }}
            >
                {text || ' '}
            </div>

            <NodeResizer
                isVisible={selected && !isEditing}
                minWidth={100}
                minHeight={60}
                keepAspectRatio={false}
                lineStyle={{ opacity: 0 }}
                handleStyle={{
                    width: 10, height: 10,
                    opacity: selected ? 1 : 0,
                    backgroundColor: isCtrlPressed ? '#10b981' : '#ffffff',
                    border: `2px solid ${isCtrlPressed ? '#10b981' : '#3b82f6'}`,
                    borderRadius: '50%',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
            />

            {/* Ctrl/Cmd 键提示 */}
            {selected && !isEditing && isCtrlPressed && (
                <div style={{
                    position: 'absolute',
                    top: '-30px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#10b981',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                }}>
                    按住 Ctrl/Cmd 拖拽调整字体大小
                </div>
            )}

            <div className={`
                w-full h-full
                transition-all duration-200
                ${selected && !isEditing
                    ? 'ring-2 ring-blue-500/50 shadow-sm'
                    : 'hover:ring-1 hover:ring-black/5'
                }
            `}>
                {isEditing ? (
                    <textarea
                        ref={inputRef}
                        value={text}
                        onChange={onTextChange}
                        onBlur={onBlur}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="nodrag w-full h-full bg-white/80 backdrop-blur-sm outline-none resize-none p-2 rounded shadow-sm overflow-hidden"
                        style={{
                            ...commonStyle,
                            overflowWrap: 'break-word',
                        }}
                    />
                ) : (
                    <div
                        className="pointer-events-none select-none w-full h-full px-2 py-2 overflow-auto"
                        style={{
                            ...commonStyle,
                        }}
                    >
                        {/* 等宽字体使用 pre 标签保留格式(支持 ASCII 艺术) */}
                        {textStyle.fontFamily?.includes('mono') ? (
                            <pre style={{
                                margin: 0,
                                ...commonStyle,
                                whiteSpace: 'pre',
                                wordWrap: 'normal',
                                overflowX: 'auto',
                            }}>
                                {text}
                            </pre>
                        ) : (
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    p: ({ children }) => <p style={{ margin: '0.25em 0', ...commonStyle }}>{children}</p>,
                                    h1: ({ children }) => <h1 style={{ margin: '0.5em 0', fontSize: `${baseFontSize * 1.8}px`, fontWeight: 'bold', ...commonStyle }}>{children}</h1>,
                                    h2: ({ children }) => <h2 style={{ margin: '0.4em 0', fontSize: `${baseFontSize * 1.5}px`, fontWeight: 'bold', ...commonStyle }}>{children}</h2>,
                                    h3: ({ children }) => <h3 style={{ margin: '0.3em 0', fontSize: `${baseFontSize * 1.2}px`, fontWeight: 'bold', ...commonStyle }}>{children}</h3>,
                                    strong: ({ children }) => <strong style={{ fontWeight: 'bold' }}>{children}</strong>,
                                    em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
                                    code: ({ children }) => <code style={{
                                        backgroundColor: 'rgba(0,0,0,0.05)',
                                        padding: '2px 4px',
                                        borderRadius: '3px',
                                        fontFamily: 'var(--font-geist-mono), monospace',
                                        fontSize: `${baseFontSize * 0.9}px`
                                    }}>{children}</code>,
                                    ul: ({ children }) => <ul style={{ margin: '0.5em 0', paddingLeft: '20px' }}>{children}</ul>,
                                    ol: ({ children }) => <ol style={{ margin: '0.5em 0', paddingLeft: '20px' }}>{children}</ol>,
                                    li: ({ children }) => <li style={{ margin: '0.2em 0' }}>{children}</li>,
                                }}
                            >
                                {text}
                            </ReactMarkdown>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default memo(TextNodeSimpler);
