import React, { memo, useCallback, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { NodeProps, NodeResizer, useReactFlow } from '@xyflow/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type TextNodeData = {
    label: string;
    autoEdit?: boolean;
    boxMode?: 'auto' | 'fixed';
    textStyle?: {
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
};

const MIN_TEXT_WIDTH = 120;
const MIN_TEXT_HEIGHT = 56;
const MAX_TEXT_WIDTH = 720;
const TEXT_PADDING_X = 16;
const TEXT_PADDING_Y = 16;

type MarkdownContentProps = {
    text: string;
    commonStyle: React.CSSProperties;
    baseFontSize: number;
};

function MarkdownContent({ text, commonStyle, baseFontSize }: MarkdownContentProps) {
    const headingBase = {
        ...commonStyle,
        fontWeight: 700,
        lineHeight: 1.2,
    };
    const tableCellBase: React.CSSProperties = {
        border: '1px solid rgba(113, 113, 122, 0.28)',
        padding: '6px 8px',
        verticalAlign: 'top',
        ...commonStyle,
    };

    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                a: ({ children, href }) => (
                    <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#2563eb', textDecoration: 'underline', textUnderlineOffset: 2 }}
                    >
                        {children}
                    </a>
                ),
                blockquote: ({ children }) => (
                    <blockquote style={{
                        margin: '0.65em 0',
                        padding: '0.15em 0 0.15em 0.75em',
                        borderLeft: '3px solid rgba(113, 113, 122, 0.35)',
                        color: commonStyle.color,
                    }}>
                        {children}
                    </blockquote>
                ),
                code: ({ children }) => (
                    <code style={{
                        backgroundColor: 'rgba(0,0,0,0.06)',
                        padding: '2px 4px',
                        borderRadius: '3px',
                        fontFamily: 'var(--font-geist-mono), monospace',
                        fontSize: `${baseFontSize * 0.9}px`,
                    }}>{children}</code>
                ),
                del: ({ children }) => <del style={{ opacity: 0.75 }}>{children}</del>,
                em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
                h1: ({ children }) => <h1 style={{ ...headingBase, margin: '0.55em 0 0.35em', fontSize: `${baseFontSize * 1.85}px` }}>{children}</h1>,
                h2: ({ children }) => <h2 style={{ ...headingBase, margin: '0.5em 0 0.3em', fontSize: `${baseFontSize * 1.55}px` }}>{children}</h2>,
                h3: ({ children }) => <h3 style={{ ...headingBase, margin: '0.45em 0 0.28em', fontSize: `${baseFontSize * 1.28}px` }}>{children}</h3>,
                h4: ({ children }) => <h4 style={{ ...headingBase, margin: '0.4em 0 0.25em', fontSize: `${baseFontSize * 1.12}px` }}>{children}</h4>,
                h5: ({ children }) => <h5 style={{ ...headingBase, margin: '0.35em 0 0.2em', fontSize: `${baseFontSize}px` }}>{children}</h5>,
                h6: ({ children }) => <h6 style={{ ...headingBase, margin: '0.3em 0 0.2em', fontSize: `${baseFontSize * 0.9}px`, opacity: 0.75 }}>{children}</h6>,
                hr: () => <hr style={{ border: 0, borderTop: '1px solid rgba(113, 113, 122, 0.28)', margin: '0.8em 0' }} />,
                img: ({ alt, src }) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        alt={alt || ''}
                        src={src || ''}
                        style={{ display: 'block', maxWidth: '100%', height: 'auto', margin: '0.5em 0', borderRadius: 4 }}
                    />
                ),
                input: (props) => (
                    <input
                        {...props}
                        readOnly
                        style={{ margin: '0 0.45em 0 0', transform: 'translateY(1px)' }}
                    />
                ),
                li: ({ children }) => <li style={{ margin: '0.22em 0', paddingLeft: '0.1em' }}>{children}</li>,
                ol: ({ children }) => <ol style={{ margin: '0.55em 0', paddingLeft: '1.45em' }}>{children}</ol>,
                p: ({ children }) => <p style={{ margin: '0.32em 0', ...commonStyle }}>{children}</p>,
                pre: ({ children }) => (
                    <pre style={{
                        margin: '0.65em 0',
                        padding: '8px 10px',
                        overflowX: 'auto',
                        borderRadius: 6,
                        backgroundColor: 'rgba(24, 24, 27, 0.06)',
                        fontFamily: 'var(--font-geist-mono), monospace',
                        fontSize: `${baseFontSize * 0.9}px`,
                        lineHeight: 1.55,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                    }}>{children}</pre>
                ),
                strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
                table: ({ children }) => (
                    <div style={{ maxWidth: '100%', overflowX: 'auto', margin: '0.65em 0' }}>
                        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: `${baseFontSize * 0.92}px` }}>{children}</table>
                    </div>
                ),
                tbody: ({ children }) => <tbody>{children}</tbody>,
                td: ({ children }) => <td style={tableCellBase}>{children}</td>,
                th: ({ children }) => <th style={{ ...tableCellBase, backgroundColor: 'rgba(24, 24, 27, 0.05)', fontWeight: 700 }}>{children}</th>,
                thead: ({ children }) => <thead>{children}</thead>,
                tr: ({ children }) => <tr>{children}</tr>,
                ul: ({ children }) => <ul style={{ margin: '0.55em 0', paddingLeft: '1.45em' }}>{children}</ul>,
            }}
        >
            {text}
        </ReactMarkdown>
    );
}

const TextNodeSimpler = ({ id, data, selected, width, height }: NodeProps) => {
    const { setNodes } = useReactFlow();
    const nodeData = data as unknown as TextNodeData;
    const initialText = nodeData.label ?? '';
    const textStyle = nodeData.textStyle || {};
    const autoEdit = nodeData.autoEdit === true;
    const boxMode = nodeData.boxMode === 'fixed' ? 'fixed' : 'auto';

    const [text, setText] = useState(initialText);
    const [isEditing, setIsEditing] = useState(autoEdit);
    const [isCtrlPressed, setIsCtrlPressed] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const measureRef = useRef<HTMLDivElement>(null);

    const currentWidth = Math.max(width || MIN_TEXT_WIDTH, MIN_TEXT_WIDTH);
    const currentHeight = Math.max(height || MIN_TEXT_HEIGHT, MIN_TEXT_HEIGHT);
    const lastSizeRef = useRef({ width: currentWidth, height: currentHeight });

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
        }
    }, [isEditing]);

    useEffect(() => {
        if (!autoEdit) return;
        setNodes((nds) => nds.map((n) => {
            if (n.id !== id) return n;
            return {
                ...n,
                data: {
                    ...n.data,
                    autoEdit: false,
                },
            };
        }));
    }, [autoEdit, id, setNodes]);

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

    useEffect(() => {
        if (!selected || isEditing || !isCtrlPressed) {
            lastSizeRef.current = { width: currentWidth, height: currentHeight };
            return;
        }

        const lastWidth = lastSizeRef.current.width;
        const lastHeight = lastSizeRef.current.height;
        const scaleX = currentWidth / lastWidth;
        const scaleY = currentHeight / lastHeight;
        const scale = (scaleX + scaleY) / 2;

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
                                fontSize: newFontSize,
                            },
                        },
                    };
                }
                return n;
            }));
        }

        lastSizeRef.current = { width: currentWidth, height: currentHeight };
    }, [currentHeight, currentWidth, isCtrlPressed, selected, isEditing, id, setNodes, textStyle.fontSize]);

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

    const measureContentSize = useCallback(() => {
        if (!measureRef.current) return null;

        const measured = measureRef.current.getBoundingClientRect();
        return {
            width: Math.ceil(Math.min(MAX_TEXT_WIDTH, Math.max(MIN_TEXT_WIDTH, measured.width + TEXT_PADDING_X))),
            height: Math.ceil(Math.max(MIN_TEXT_HEIGHT, measured.height + TEXT_PADDING_Y)),
        };
    }, []);

    const onBlur = () => {
        if (!text.trim()) {
            setNodes((nds) => nds.filter((n) => n.id !== id));
            setIsEditing(false);
            return;
        }

        const contentSize = measureContentSize();
        if (contentSize) {
            if (boxMode === 'fixed') {
                updateNode(text, {
                    width: currentWidth,
                    height: Math.max(currentHeight, contentSize.height),
                });
            } else {
                updateNode(text, contentSize);
            }
        } else {
            updateNode(text);
        }
        setIsEditing(false);
    };

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
        whiteSpace: 'pre-wrap',
    };

    useLayoutEffect(() => {
        if (!isEditing || !measureRef.current) return;

        const contentSize = measureContentSize();
        if (!contentSize) return;

        if (boxMode === 'fixed') {
            if (Math.abs(contentSize.height - currentHeight) < 2) return;
            updateNode(text, {
                width: currentWidth,
                height: Math.max(currentHeight, contentSize.height),
            });
            return;
        }

        const nextWidth = Math.max(currentWidth, contentSize.width);
        const nextHeight = Math.max(currentHeight, contentSize.height);
        if (Math.abs(nextWidth - currentWidth) < 2 && Math.abs(nextHeight - currentHeight) < 2) return;

        updateNode(text, { width: nextWidth, height: nextHeight });
    }, [boxMode, currentHeight, currentWidth, isEditing, measureContentSize, text, updateNode]);

    const onTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const nextText = event.target.value;
        setText(nextText);
        updateNode(nextText);
    };

    return (
        <div
            className="relative group w-full h-full"
            onDoubleClick={(e) => {
                e.stopPropagation();
                setText(nodeData.label ?? '');
                setIsEditing(true);
            }}
        >
            <div
                ref={measureRef}
                aria-hidden="true"
                className="pointer-events-none fixed left-[-10000px] top-[-10000px] inline-block whitespace-pre-wrap px-2 py-2"
                style={{
                    ...commonStyle,
                    width: boxMode === 'fixed'
                        ? Math.max(MIN_TEXT_WIDTH, currentWidth - TEXT_PADDING_X)
                        : 'fit-content',
                    maxWidth: MAX_TEXT_WIDTH - TEXT_PADDING_X,
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                }}
            >
                {textStyle.fontFamily?.includes('mono') ? (
                    text || ' '
                ) : (
                    <MarkdownContent text={text || ' '} commonStyle={commonStyle} baseFontSize={baseFontSize} />
                )}
            </div>

            <NodeResizer
                isVisible={selected && !isEditing}
                minWidth={100}
                minHeight={60}
                keepAspectRatio={false}
                lineStyle={{ opacity: 0 }}
                handleStyle={{
                    width: 8,
                    height: 8,
                    opacity: selected ? 1 : 0,
                    backgroundColor: '#ffffff',
                    border: `1.5px solid ${isCtrlPressed ? '#18181b' : '#52525b'}`,
                    borderRadius: '50%',
                    boxShadow: '0 1px 3px rgba(24,24,27,0.16)',
                }}
                onResizeStart={() => {
                    setIsResizing(true);
                    setNodes((nds) => nds.map((n) => (
                        n.id === id
                            ? {
                                ...n,
                                data: {
                                    ...n.data,
                                    boxMode: 'fixed',
                                },
                            }
                            : n
                    )));
                }}
                onResizeEnd={() => {
                    setIsResizing(false);
                }}
            />

            {selected && !isEditing && isCtrlPressed && (
                <div style={{
                    position: 'absolute',
                    top: '-30px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#18181b',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '5px',
                    fontSize: '12px',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 8px 18px rgba(24,24,27,0.14)',
                    zIndex: 1000,
                }}>
                    按住 Ctrl/Cmd 拖拽调整字体大小
                </div>
            )}

            <div className={`
                w-full h-full
                transition-all duration-200
                ${selected && !isEditing
                    ? 'ring-1 ring-zinc-900/70'
                    : 'hover:ring-1 hover:ring-zinc-900/10'
                }
                ${isResizing ? 'select-none' : ''}
            `}>
                {isEditing ? (
                    <textarea
                        ref={inputRef}
                        value={text}
                        onChange={onTextChange}
                        onBlur={onBlur}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="nodrag h-full w-full resize-none overflow-hidden rounded-md border border-transparent bg-transparent p-2 outline-none"
                        style={{
                            ...commonStyle,
                            overflowWrap: 'anywhere',
                            wordBreak: 'break-word',
                        }}
                    />
                ) : (
                    <div
                        className="pointer-events-none select-none w-full h-full px-2 py-2 overflow-hidden"
                        style={{
                            ...commonStyle,
                            overflowWrap: 'anywhere',
                            wordBreak: 'break-word',
                        }}
                    >
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
                            <MarkdownContent text={text} commonStyle={commonStyle} baseFontSize={baseFontSize} />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default memo(TextNodeSimpler);
