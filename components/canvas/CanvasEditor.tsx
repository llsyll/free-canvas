"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    BackgroundVariant,
    useReactFlow,
    ReactFlowProvider,
    Node,
    Panel,
} from '@xyflow/react';
import { Cloud, Loader2, LogOut, Save, Trash2 } from 'lucide-react';

import '@xyflow/react/dist/style.css';
import ImageNode from './CustomNodes/ImageNode';
import TextNode from './CustomNodes/TextNode';
import Toolbar, { ToolMode } from './Toolbar';
import ContextBar from './ContextBar';

const nodeTypes = {
    image: ImageNode,
    text: TextNode,
};

const defaultNodes: Node[] = [];

type User = {
    id: string;
    email: string;
};

type CanvasFile = {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
};

type CanvasPayload = {
    nodes: Node[];
    edges: Edge[];
};

async function apiJson<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(url, {
        ...options,
        headers: {
            'content-type': 'application/json',
            ...(options.headers || {}),
        },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || 'Request failed');
    }
    return data as T;
}

function CanvasEditorContent() {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const { screenToFlowPosition, fitView, getNodes } = useReactFlow();
    const canvasRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [toolMode, setToolMode] = useState<ToolMode>('select');
    const lastClickTimeRef = useRef<number>(0);

    const [isSpacePressed, setIsSpacePressed] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [files, setFiles] = useState<CanvasFile[]>([]);
    const [currentCanvasId, setCurrentCanvasId] = useState<string | null>(null);
    const [canvasTitle, setCanvasTitle] = useState('未命名画布');
    const [cloudMessage, setCloudMessage] = useState('');
    const [cloudBusy, setCloudBusy] = useState(false);
    const [cloudAvailable, setCloudAvailable] = useState(false);

    // Undo/Redo state
    const [history, setHistory] = useState<{ nodes: Node[], edges: Edge[] }[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const historyIndexRef = useRef(-1);
    const skipNextHistoryRef = useRef(false);

    // Always load default canvas on mount (no auto-save restore)
    useEffect(() => {
        setNodes(defaultNodes);
        // Center view after a short delay
        setTimeout(() => fitView({ duration: 800 }), 100);
    }, [setNodes, fitView]);

    const refreshFiles = useCallback(async () => {
        const data = await apiJson<{ canvases: CanvasFile[] }>('/api/canvases');
        setFiles(data.canvases);
    }, []);

    useEffect(() => {
        apiJson<{ user: User | null }>('/api/auth/me')
            .then((data) => {
                setCloudAvailable(true);
                setUser(data.user);
                if (data.user) return refreshFiles();
            })
            .catch(() => {
                setCloudAvailable(false);
                setUser(null);
            });
    }, [refreshFiles]);

    // File I/O Handlers
    const handleSaveFile = () => {
        const data = {
            source: 'free-canvas',
            version: '1.0',
            timestamp: Date.now(),
            nodes,
            edges,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `canvas-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleOpenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const data = JSON.parse(content);
                if (data.nodes && Array.isArray(data.nodes)) {
                    // Clear current selection to avoid issues
                    const newNodes = data.nodes.map((n: Node) => ({
                        ...n,
                        selected: false,
                    }));
                    setNodes(newNodes);
                    setEdges(data.edges || []);
                    // Reset history
                    setHistory([]);
                    historyIndexRef.current = -1;
                    setHistoryIndex(-1);

                    setTimeout(() => fitView({ duration: 800 }), 100);
                } else {
                    alert('Invalid file format');
                }
            } catch (err) {
                console.error('Error reading file:', err);
                alert('Failed to read file');
            }
        };
        reader.readAsText(file);
        // Reset input value so same file can be selected again
        e.target.value = '';
    };

    const loadCanvasData = useCallback((payload: CanvasPayload) => {
        const newNodes = payload.nodes.map((n: Node) => ({
            ...n,
            selected: false,
        }));
        setNodes(newNodes);
        setEdges(payload.edges || []);
        setHistory([]);
        historyIndexRef.current = -1;
        setHistoryIndex(-1);
        setTimeout(() => fitView({ duration: 800 }), 100);
    }, [fitView, setEdges, setNodes]);

    const handleAuthSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setAuthError('');
        setCloudBusy(true);
        try {
            const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
            const data = await apiJson<{ user: User }>(endpoint, {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });
            setUser(data.user);
            setPassword('');
            setCloudMessage('已登录');
            await refreshFiles();
        } catch (error) {
            setAuthError(error instanceof Error ? error.message : '操作失败');
        } finally {
            setCloudBusy(false);
        }
    };

    const handleLogout = async () => {
        setCloudBusy(true);
        try {
            await apiJson('/api/auth/logout', { method: 'POST', body: '{}' });
        } finally {
            setUser(null);
            setFiles([]);
            setCurrentCanvasId(null);
            setCloudBusy(false);
        }
    };

    const handleSaveCloud = async () => {
        if (!user) return;
        setCloudMessage('');
        setCloudBusy(true);
        try {
            const title = canvasTitle.trim() || '未命名画布';
            const data = await apiJson<{ canvas: { id: string; title: string } }>('/api/canvases', {
                method: 'POST',
                body: JSON.stringify({
                    id: currentCanvasId,
                    title,
                    data: { nodes, edges },
                }),
            });
            setCurrentCanvasId(data.canvas.id);
            setCanvasTitle(data.canvas.title);
            setCloudMessage('已保存');
            await refreshFiles();
        } catch (error) {
            setCloudMessage(error instanceof Error ? error.message : '保存失败');
        } finally {
            setCloudBusy(false);
        }
    };

    const handleOpenCloud = async (file: CanvasFile) => {
        setCloudMessage('');
        setCloudBusy(true);
        try {
            const data = await apiJson<{ canvas: CanvasFile & { data: CanvasPayload } }>(`/api/canvases/${file.id}`);
            setCurrentCanvasId(data.canvas.id);
            setCanvasTitle(data.canvas.title);
            loadCanvasData(data.canvas.data);
            setCloudMessage('已打开');
        } catch (error) {
            setCloudMessage(error instanceof Error ? error.message : '打开失败');
        } finally {
            setCloudBusy(false);
        }
    };

    const handleDeleteCloud = async (file: CanvasFile) => {
        if (!confirm(`删除「${file.title}」？`)) return;
        setCloudBusy(true);
        try {
            await apiJson(`/api/canvases/${file.id}`, { method: 'DELETE' });
            if (currentCanvasId === file.id) {
                setCurrentCanvasId(null);
            }
            setCloudMessage('已删除');
            await refreshFiles();
        } catch (error) {
            setCloudMessage(error instanceof Error ? error.message : '删除失败');
        } finally {
            setCloudBusy(false);
        }
    };

    // Auto-save canvas to localStorage

    // Auto-save canvas to localStorage
    // Auto-save disabled to always load default layout

    // Save to history whenever nodes or edges change
    useEffect(() => {
        const saveToHistory = () => {
            if (skipNextHistoryRef.current) {
                skipNextHistoryRef.current = false;
                return;
            }

            const newState = { nodes, edges };
            setHistory(prev => {
                const newHistory = prev.slice(0, historyIndexRef.current + 1);
                newHistory.push(newState);
                // Keep only last 50 states
                if (newHistory.length > 50) newHistory.shift();
                const nextIndex = Math.min(newHistory.length - 1, 49);
                historyIndexRef.current = nextIndex;
                setHistoryIndex(nextIndex);
                return newHistory;
            });
        };

        const timeoutId = setTimeout(saveToHistory, 300);
        return () => clearTimeout(timeoutId);
    }, [nodes, edges]);

    const undo = useCallback(() => {
        if (historyIndex > 0) {
            const prevState = history[historyIndex - 1];
            skipNextHistoryRef.current = true;
            setNodes(prevState.nodes);
            setEdges(prevState.edges);
            const nextIndex = historyIndex - 1;
            historyIndexRef.current = nextIndex;
            setHistoryIndex(nextIndex);
        }
    }, [historyIndex, history, setNodes, setEdges]);

    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            skipNextHistoryRef.current = true;
            setNodes(nextState.nodes);
            setEdges(nextState.edges);
            const nextIndex = historyIndex + 1;
            historyIndexRef.current = nextIndex;
            setHistoryIndex(nextIndex);
        }
    }, [historyIndex, history, setNodes, setEdges]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

            // Undo: Cmd+Z (Mac) or Ctrl+Z (Windows)
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey && !isInput) {
                e.preventDefault();
                undo();
                return;
            }

            // Redo: Cmd+Shift+Z (Mac) or Ctrl+Shift+Z (Windows)
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey && !isInput) {
                e.preventDefault();
                redo();
                return;
            }

            if (e.code === 'Space' && !e.repeat && !isInput) {
                setIsSpacePressed(true);
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                setIsSpacePressed(false);
            }
        };
        const handleBlur = () => setIsSpacePressed(false);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
        };
    }, [undo, redo]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges],
    );

    useEffect(() => {
        const handleCopy = (e: ClipboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'TEXTAREA' || target.isContentEditable) return;

            const selectedNodes = getNodes().filter(n => n.selected);
            if (selectedNodes.length === 0) return;

            const payload = {
                source: 'free-canvas',
                nodes: selectedNodes
            };
            navigator.clipboard.writeText(JSON.stringify(payload));
            e.preventDefault();
        };

        const handlePaste = (e: ClipboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'TEXTAREA' || target.isContentEditable) return;

            const items = e.clipboardData?.items;
            let imageHandled = false;
            if (items) {
                for (const item of items) {
                    if (item.type.indexOf('image') !== -1) {
                        const blob = item.getAsFile();
                        if (blob) {
                            const reader = new FileReader();
                            const img = new Image();
                            img.onload = () => {
                                const id = `img-${Date.now()}`;
                                let w = img.naturalWidth;
                                let h = img.naturalHeight;
                                const maxDim = 1000;
                                if (w > maxDim || h > maxDim) {
                                    const r = w / h;
                                    if (w > h) { w = maxDim; h = maxDim / r } else { h = maxDim; w = maxDim * r }
                                }
                                const newNode: Node = {
                                    id, type: 'image', position: { x: Math.random() * 100 + 100, y: Math.random() * 100 + 100 },
                                    data: { src: img.src }, width: w, height: h, style: { width: w, height: h }
                                };
                                setNodes((nds) => nds.concat(newNode));
                            };
                            reader.onload = () => {
                                if (typeof reader.result === 'string') {
                                    img.src = reader.result;
                                }
                            };
                            reader.readAsDataURL(blob);
                            imageHandled = true;
                        }
                    }
                }
            }
            if (imageHandled) return;

            const textData = e.clipboardData?.getData('text');
            if (textData) {
                try {
                    const parsed = JSON.parse(textData);
                    if ((parsed.source === 'free-canvas' || parsed.source === 'natural-canvas') && Array.isArray(parsed.nodes)) {
                        const newNodes = parsed.nodes.map((n: Node) => ({
                            ...n,
                            id: `${n.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            position: { x: n.position.x + 30, y: n.position.y + 30 },
                            selected: true,
                        }));

                        setNodes((nds) => [
                            ...nds.map(node => ({ ...node, selected: false })),
                            ...newNodes
                        ]);
                        e.preventDefault();
                        return;
                    }
                } catch {
                    // Not JSON, treat as plain text
                }

                // 粘贴纯文本时,自动创建文本节点
                if (textData.trim()) {
                    const id = `text-${Date.now()}`;
                    const newNode: Node = {
                        id,
                        type: 'text',
                        position: { x: Math.random() * 100 + 100, y: Math.random() * 100 + 100 },
                        data: { label: textData },
                        selected: true,
                        width: 300,
                        height: 150,
                        style: { width: 300, height: 150 },
                    };
                    setNodes((nds) => [
                        ...nds.map(node => ({ ...node, selected: false })),
                        newNode
                    ]);
                    e.preventDefault();
                }
            }
        };

        window.addEventListener('copy', handleCopy);
        window.addEventListener('paste', handlePaste);
        return () => {
            window.removeEventListener('copy', handleCopy);
            window.removeEventListener('paste', handlePaste);
        };
    }, [getNodes, setNodes]);

    const handleAddText = () => {
        const id = `text-${Date.now()}`;
        const newNode: Node = {
            id,
            type: 'text',
            position: { x: 100, y: 100 },
            data: { label: 'Text' },
            width: 300,
            height: 150,
            style: { width: 300, height: 150 },
        };
        setNodes((nds) => nds.concat(newNode));
        setToolMode('select');
    };

    const handleClear = () => {
        if (confirm('Clear canvas?')) {
            setNodes([]);
            setEdges([]);
        }
    };

    const onPaneClick = useCallback((event: React.MouseEvent) => {
        const now = Date.now();
        const timeDiff = now - lastClickTimeRef.current;

        if (timeDiff < 300) {
            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const id = `text-${Date.now()}`;
            const newNode: Node = {
                id,
                type: 'text',
                position,
                data: { label: 'Type here' },
                selected: true,
                width: 300,
                height: 150,
                style: { width: 300, height: 150 },
            };
            setNodes((nds) => nds.concat(newNode));
            setToolMode('select');
        }

        lastClickTimeRef.current = now;
    }, [screenToFlowPosition, setNodes]);

    const isHandActive = toolMode === 'hand' || isSpacePressed;
    const canDragNodes = toolMode === 'select' && !isSpacePressed;

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative' }} ref={canvasRef}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView

                nodesDraggable={canDragNodes}
                nodesConnectable={false}

                selectionOnDrag={!isHandActive}
                panOnDrag={isHandActive}
                panActivationKeyCode={toolMode === 'select' ? "Space" : undefined}

                selectionKeyCode="Shift"
                multiSelectionKeyCode="Shift"
                panOnScroll={false}
                zoomOnScroll={true}
                minZoom={0.1}
                maxZoom={4}
                zoomOnDoubleClick={false}
                onPaneClick={onPaneClick}
            >
                <Controls position="top-right" showInteractive={false} />
                <MiniMap position="bottom-right" style={{ height: 100, width: 150 }} className='!bg-gray-50' />
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />

                <ContextBar />

                <Panel position="top-left" className="!m-4">
                    <Toolbar
                        activeMode={isSpacePressed ? 'hand' : toolMode}
                        onSetMode={setToolMode}
                        onAddText={handleAddText}
                        onClear={handleClear}
                        onFitView={() => fitView({ duration: 800 })}
                        onUndo={undo}
                        onRedo={redo}
                        onSaveFile={handleSaveFile}
                        onOpenFile={() => fileInputRef.current?.click()}
                    />
                </Panel>

                {cloudAvailable && <Panel position="top-right" className="!m-4">
                    <div className="w-80 rounded-2xl border border-black/10 bg-white/90 p-3 text-sm text-zinc-800 shadow-2xl shadow-black/10 backdrop-blur-xl">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2 font-semibold">
                                <Cloud className="h-4 w-4" />
                                云端文件
                            </div>
                            {cloudBusy && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
                        </div>

                        {user ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-2 rounded-xl bg-zinc-100 px-3 py-2">
                                    <span className="truncate text-xs text-zinc-600">{user.email}</span>
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="rounded-lg p-1 text-zinc-500 hover:bg-white hover:text-zinc-950"
                                        title="退出登录"
                                    >
                                        <LogOut className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="flex gap-2">
                                    <input
                                        value={canvasTitle}
                                        onChange={(event) => setCanvasTitle(event.target.value)}
                                        className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 outline-none focus:border-zinc-500"
                                        placeholder="文件名"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSaveCloud}
                                        disabled={cloudBusy}
                                        className="inline-flex items-center gap-1 rounded-xl bg-zinc-950 px-3 py-2 text-white disabled:opacity-50"
                                        title="保存当前画布"
                                    >
                                        <Save className="h-4 w-4" />
                                        保存
                                    </button>
                                </div>

                                <div className="max-h-64 space-y-1 overflow-auto pr-1">
                                    {files.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-zinc-200 px-3 py-5 text-center text-xs text-zinc-500">
                                            还没有保存的画布
                                        </div>
                                    ) : files.map((file) => (
                                        <div
                                            key={file.id}
                                            className={`flex items-center gap-2 rounded-xl px-2 py-2 ${currentCanvasId === file.id ? 'bg-zinc-950 text-white' : 'hover:bg-zinc-100'}`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => handleOpenCloud(file)}
                                                className="min-w-0 flex-1 text-left"
                                            >
                                                <div className="truncate font-medium">{file.title}</div>
                                                <div className={`text-xs ${currentCanvasId === file.id ? 'text-zinc-300' : 'text-zinc-500'}`}>
                                                    {formatDate(file.updated_at)}
                                                </div>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteCloud(file)}
                                                className={`rounded-lg p-1 ${currentCanvasId === file.id ? 'text-zinc-300 hover:bg-white/10 hover:text-white' : 'text-zinc-400 hover:bg-red-50 hover:text-red-600'}`}
                                                title="删除"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {cloudMessage && <div className="text-xs text-zinc-500">{cloudMessage}</div>}
                            </div>
                        ) : (
                            <form className="space-y-2" onSubmit={handleAuthSubmit}>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 outline-none focus:border-zinc-500"
                                    placeholder="邮箱"
                                />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 outline-none focus:border-zinc-500"
                                    placeholder="密码"
                                />
                                {authError && <div className="text-xs text-red-600">{authError}</div>}
                                <button
                                    type="submit"
                                    disabled={cloudBusy}
                                    className="w-full rounded-xl bg-zinc-950 px-3 py-2 font-medium text-white disabled:opacity-50"
                                >
                                    {authMode === 'login' ? '登录' : '注册'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAuthError('');
                                        setAuthMode(authMode === 'login' ? 'register' : 'login');
                                    }}
                                    className="w-full rounded-xl px-3 py-2 text-xs text-zinc-500 hover:bg-zinc-100"
                                >
                                    {authMode === 'login' ? '没有账号？注册' : '已有账号？登录'}
                                </button>
                            </form>
                        )}
                    </div>
                </Panel>}

                {/* Hidden File Input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept=".json"
                    onChange={handleOpenFile}
                />
            </ReactFlow>
        </div>
    );
}

function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function CanvasEditor() {
    return (
        <ReactFlowProvider>
            <CanvasEditorContent />
        </ReactFlowProvider>
    );
}
