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
import { ChevronDown, ChevronRight, Cloud, Loader2, LogOut, Save, Trash2 } from 'lucide-react';

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

type ChromeMode = 'normal' | 'fullscreen' | 'canvasOnly';
type CloudSaveOptions = {
    silent?: boolean;
    refreshFiles?: boolean;
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

function stripTransientNodeState(node: Node) {
    const stableNode = {
        ...node,
    } as Node & {
        dragging?: boolean;
        measured?: unknown;
        resizing?: boolean;
        positionAbsolute?: { x: number; y: number };
        selected?: boolean;
    };
    delete stableNode.selected;
    delete stableNode.dragging;
    delete stableNode.measured;
    delete stableNode.resizing;
    delete stableNode.positionAbsolute;
    return stableNode;
}

function buildCloudSnapshot(nodes: Node[], edges: Edge[], title: string) {
    return JSON.stringify({
        title: title.trim() || '未命名画布',
        nodes: nodes.map(stripTransientNodeState),
        edges,
    });
}

function hasMeaningfulCloudContent(nodes: Node[], edges: Edge[]) {
    return nodes.length > 0 || edges.length > 0;
}

function normalizeStackOrder(nodes: Node[]) {
    return nodes.map((node, index) => ({
        ...node,
        zIndex: index,
    }));
}

function moveSelectedNodes(nodes: Node[], direction: 'up' | 'down') {
    const next = [...nodes];

    if (direction === 'up') {
        for (let index = next.length - 2; index >= 0; index -= 1) {
            if (next[index].selected || !next[index + 1].selected) continue;
            [next[index], next[index + 1]] = [next[index + 1], next[index]];
        }
        return normalizeStackOrder(next);
    }

    for (let index = 1; index < next.length; index += 1) {
        if (!next[index].selected || next[index - 1].selected) continue;
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
    }
    return normalizeStackOrder(next);
}

function moveSelectionToEdge(nodes: Node[], edge: 'front' | 'back') {
    const selected: Node[] = [];
    const others: Node[] = [];

    nodes.forEach((node) => {
        if (node.selected) {
            selected.push(node);
        } else {
            others.push(node);
        }
    });

    return normalizeStackOrder(edge === 'front' ? [...others, ...selected] : [...selected, ...others]);
}

function alignSelectedNodes(nodes: Node[], alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') {
    const selected = nodes.filter((node) => node.selected);
    if (selected.length === 0) return nodes;

    const bounds = selected.reduce(
        (acc, node) => {
            const width = Number(node.width ?? node.measured?.width ?? 0);
            const height = Number(node.height ?? node.measured?.height ?? 0);
            const right = node.position.x + width;
            const bottom = node.position.y + height;

            return {
                minX: Math.min(acc.minX, node.position.x),
                minY: Math.min(acc.minY, node.position.y),
                maxX: Math.max(acc.maxX, right),
                maxY: Math.max(acc.maxY, bottom),
            };
        },
        { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY },
    );

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    return nodes.map((node) => {
        if (!node.selected) return node;

        const width = Number(node.width ?? node.measured?.width ?? 0);
        const height = Number(node.height ?? node.measured?.height ?? 0);
        const nextPosition = { ...node.position };

        if (alignment === 'left') nextPosition.x = bounds.minX;
        if (alignment === 'center') nextPosition.x = centerX - width / 2;
        if (alignment === 'right') nextPosition.x = bounds.maxX - width;
        if (alignment === 'top') nextPosition.y = bounds.minY;
        if (alignment === 'middle') nextPosition.y = centerY - height / 2;
        if (alignment === 'bottom') nextPosition.y = bounds.maxY - height;

        return {
            ...node,
            position: nextPosition,
        };
    });
}

function distributeSelectedNodes(nodes: Node[], axis: 'horizontal' | 'vertical') {
    const selected = nodes.filter((node) => node.selected);
    if (selected.length < 3) return nodes;

    const sorted = [...selected].sort((left, right) => (
        axis === 'horizontal'
            ? left.position.x - right.position.x
            : left.position.y - right.position.y
    ));

    const sizes = sorted.map((node) => ({
        width: Number(node.width ?? node.measured?.width ?? 0),
        height: Number(node.height ?? node.measured?.height ?? 0),
    }));

    if (axis === 'horizontal') {
        const minLeft = sorted[0].position.x;
        const maxRight = sorted.reduce((max, node, index) => {
            const width = sizes[index].width;
            return Math.max(max, node.position.x + width);
        }, Number.NEGATIVE_INFINITY);
        const totalWidth = sizes.reduce((sum, size) => sum + size.width, 0);
        const gap = (maxRight - minLeft - totalWidth) / (sorted.length - 1);

        const nextX = new Map<string, number>();
        let cursor = minLeft;
        sorted.forEach((node, index) => {
            nextX.set(node.id, cursor);
            cursor += sizes[index].width + gap;
        });

        return nodes.map((node) => (
            node.selected && nextX.has(node.id)
                ? { ...node, position: { ...node.position, x: nextX.get(node.id)! } }
                : node
        ));
    }

    const minTop = sorted[0].position.y;
    const maxBottom = sorted.reduce((max, node, index) => {
        const height = sizes[index].height;
        return Math.max(max, node.position.y + height);
    }, Number.NEGATIVE_INFINITY);
    const totalHeight = sizes.reduce((sum, size) => sum + size.height, 0);
    const gap = (maxBottom - minTop - totalHeight) / (sorted.length - 1);

    const nextY = new Map<string, number>();
    let cursor = minTop;
    sorted.forEach((node, index) => {
        nextY.set(node.id, cursor);
        cursor += sizes[index].height + gap;
    });

    return nodes.map((node) => (
        node.selected && nextY.has(node.id)
            ? { ...node, position: { ...node.position, y: nextY.get(node.id)! } }
            : node
    ));
}

function CanvasEditorContent() {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const { screenToFlowPosition, fitView, getNodes } = useReactFlow();
    const canvasRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cloudPanelRef = useRef<HTMLDivElement>(null);
    const fullscreenEnteredRef = useRef(false);
    const cloudAutosaveTimerRef = useRef<number | null>(null);
    const cloudAutosaveInFlightRef = useRef(false);
    const cloudAutosaveQueuedRef = useRef(false);
    const lastCloudSnapshotRef = useRef('');
    const saveCloudShortcutRef = useRef<() => void>(() => undefined);

    const [toolMode, setToolMode] = useState<ToolMode>('select');
    const [textInsertMode, setTextInsertMode] = useState(false);
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
    const [cloudSyncStatus, setCloudSyncStatus] = useState<'离线' | '未登录' | '待同步' | '同步中' | '已保存'>('未登录');
    const [cloudBusy, setCloudBusy] = useState(false);
    const [cloudAvailable, setCloudAvailable] = useState(false);
    const [cloudPanelOpen, setCloudPanelOpen] = useState(false);
    const [chromeMode, setChromeMode] = useState<ChromeMode>('normal');

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
                setCloudSyncStatus(data.user ? '已保存' : '未登录');
                if (data.user) return refreshFiles();
            })
            .catch(() => {
                setCloudAvailable(false);
                setUser(null);
                setCloudSyncStatus('离线');
            });
    }, [refreshFiles]);

    useEffect(() => {
        const handlePointerDown = (event: PointerEvent) => {
            if (!cloudPanelOpen) return;
            const target = event.target;
            if (!(target instanceof window.Node)) return;
            if (cloudPanelRef.current?.contains(target)) return;
            setCloudPanelOpen(false);
        };

        document.addEventListener('pointerdown', handlePointerDown);
        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [cloudPanelOpen]);

    // File I/O Handlers
    const handleSaveFile = useCallback(() => {
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
    }, [edges, nodes]);

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
                    const newNodes = normalizeStackOrder(data.nodes.map((n: Node) => ({
                        ...n,
                        selected: false,
                    })));
                    setNodes(newNodes);
                    setEdges(data.edges || []);
                    setCurrentCanvasId(null);
                    lastCloudSnapshotRef.current = '';
                    setCloudSyncStatus('待同步');
                    if (cloudAutosaveTimerRef.current) {
                        window.clearTimeout(cloudAutosaveTimerRef.current);
                        cloudAutosaveTimerRef.current = null;
                    }
                    cloudAutosaveQueuedRef.current = false;
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

    const loadCanvasData = useCallback((payload: CanvasPayload, title: string) => {
        const newNodes = normalizeStackOrder(payload.nodes.map((n: Node) => ({
            ...n,
            selected: false,
        })));
        setNodes(newNodes);
        setEdges(payload.edges || []);
        lastCloudSnapshotRef.current = buildCloudSnapshot(newNodes, payload.edges || [], title);
        setCloudSyncStatus('已保存');
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
            setCloudSyncStatus('已保存');
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
            setCloudPanelOpen(false);
            setCloudSyncStatus('未登录');
            lastCloudSnapshotRef.current = '';
            if (cloudAutosaveTimerRef.current) {
                window.clearTimeout(cloudAutosaveTimerRef.current);
                cloudAutosaveTimerRef.current = null;
            }
            cloudAutosaveInFlightRef.current = false;
            cloudAutosaveQueuedRef.current = false;
            setCloudBusy(false);
        }
    };

    const saveCloudCanvas = useCallback(async (options: CloudSaveOptions = {}) => {
        if (!user || !cloudAvailable) return false;

        setCloudSyncStatus('同步中');
        const title = canvasTitle.trim() || '未命名画布';
        try {
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
            lastCloudSnapshotRef.current = buildCloudSnapshot(nodes, edges, data.canvas.title);
            setCloudSyncStatus('已保存');

            if (options.refreshFiles !== false) {
                await refreshFiles();
            }

            if (!options.silent) {
                setCloudMessage('已保存');
            }

            return true;
        } catch (error) {
            setCloudSyncStatus('待同步');
            throw error;
        }
    }, [canvasTitle, cloudAvailable, currentCanvasId, edges, nodes, refreshFiles, user]);

    const handleSaveCloud = async () => {
        if (!user) return;
        setCloudMessage('');
        setCloudBusy(true);
        try {
            await saveCloudCanvas({ refreshFiles: true, silent: false });
        } catch (error) {
            setCloudMessage(error instanceof Error ? error.message : '保存失败');
        } finally {
            setCloudBusy(false);
        }
    };
    saveCloudShortcutRef.current = () => {
        void handleSaveCloud();
    };

    const handleOpenCloud = async (file: CanvasFile) => {
        setCloudMessage('');
        setCloudBusy(true);
        try {
            const data = await apiJson<{ canvas: CanvasFile & { data: CanvasPayload } }>(`/api/canvases/${file.id}`);
            setCurrentCanvasId(data.canvas.id);
            setCanvasTitle(data.canvas.title);
            loadCanvasData(data.canvas.data, data.canvas.title);
            setCloudSyncStatus('已保存');
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
                lastCloudSnapshotRef.current = '';
            }
            setCloudMessage('已删除');
            await refreshFiles();
        } catch (error) {
            setCloudMessage(error instanceof Error ? error.message : '删除失败');
        } finally {
            setCloudBusy(false);
        }
    };

    useEffect(() => {
        if (cloudSyncStatus === '同步中') {
            return;
        }
        if (!cloudAvailable) {
            setCloudSyncStatus('离线');
            return;
        }
        if (!user) {
            setCloudSyncStatus('未登录');
            return;
        }
        if (cloudBusy) {
            setCloudSyncStatus('同步中');
            return;
        }

        const snapshot = buildCloudSnapshot(nodes, edges, canvasTitle);
        setCloudSyncStatus(snapshot === lastCloudSnapshotRef.current ? '已保存' : '待同步');
    }, [canvasTitle, cloudAvailable, cloudBusy, cloudSyncStatus, edges, nodes, user]);

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

    const flushCloudAutosave = useCallback(async (): Promise<void> => {
        if (!user || !cloudAvailable || cloudBusy) return;

        const snapshot = buildCloudSnapshot(nodes, edges, canvasTitle);
        if (snapshot === lastCloudSnapshotRef.current) return;
        if (!hasMeaningfulCloudContent(nodes, edges) && !currentCanvasId) return;

        if (cloudAutosaveInFlightRef.current) {
            cloudAutosaveQueuedRef.current = true;
            return;
        }

        cloudAutosaveInFlightRef.current = true;
        try {
            await saveCloudCanvas({ silent: true, refreshFiles: false });
        } catch {
            // Keep autosave silent; a later change will retry.
        } finally {
            cloudAutosaveInFlightRef.current = false;
            if (cloudAutosaveQueuedRef.current) {
                cloudAutosaveQueuedRef.current = false;
                void flushCloudAutosave();
            }
        }
    }, [canvasTitle, cloudAvailable, cloudBusy, currentCanvasId, edges, nodes, saveCloudCanvas, user]);

    useEffect(() => {
        if (!user || !cloudAvailable || cloudBusy) return;
        if (!hasMeaningfulCloudContent(nodes, edges) && !currentCanvasId) return;

        const snapshot = buildCloudSnapshot(nodes, edges, canvasTitle);
        if (snapshot === lastCloudSnapshotRef.current) return;

        if (cloudAutosaveTimerRef.current) {
            window.clearTimeout(cloudAutosaveTimerRef.current);
        }

        cloudAutosaveTimerRef.current = window.setTimeout(() => {
            void flushCloudAutosave();
        }, 1200);

        return () => {
            if (cloudAutosaveTimerRef.current) {
                window.clearTimeout(cloudAutosaveTimerRef.current);
                cloudAutosaveTimerRef.current = null;
            }
        };
    }, [canvasTitle, cloudAvailable, cloudBusy, currentCanvasId, edges, flushCloudAutosave, nodes, user]);

    const exitFocusModes = useCallback(() => {
        setChromeMode('normal');
        fullscreenEnteredRef.current = false;
        if (document.fullscreenElement) {
            void document.exitFullscreen().catch(() => undefined);
        }
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            if (document.fullscreenElement) {
                fullscreenEnteredRef.current = true;
                return;
            }
            if (fullscreenEnteredRef.current && chromeMode === 'fullscreen') {
                fullscreenEnteredRef.current = false;
                setChromeMode('normal');
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [chromeMode]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges],
    );

    const addImageFileToCanvas = useCallback((file: File, position: { x: number; y: number }) => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        const img = new Image();
        img.onload = () => {
            const id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            let w = img.naturalWidth;
            let h = img.naturalHeight;
            const maxDim = 1000;
            if (w > maxDim || h > maxDim) {
                const r = w / h;
                if (w > h) {
                    w = maxDim;
                    h = maxDim / r;
                } else {
                    h = maxDim;
                    w = maxDim * r;
                }
            }
            const newNode: Node = {
                id,
                type: 'image',
                position,
                data: { src: img.src },
                selected: true,
                width: w,
                height: h,
                style: { width: w, height: h },
            };
            setNodes((nds) => [
                ...nds.map(node => ({ ...node, selected: false })),
                { ...newNode, zIndex: nds.length },
            ]);
        };
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                img.src = reader.result;
            }
        };
        reader.readAsDataURL(file);
    }, [setNodes]);

    const handleCanvasDragOver = useCallback((event: React.DragEvent) => {
        const hasImageFile = Array.from(event.dataTransfer.items).some((item) => item.kind === 'file' && item.type.startsWith('image/'));
        if (!hasImageFile) return;

        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }, []);

    const handleCanvasDrop = useCallback((event: React.DragEvent) => {
        const imageFiles = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith('image/'));
        if (imageFiles.length === 0) return;

        event.preventDefault();
        const position = screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
        });
        imageFiles.forEach((file, index) => {
            addImageFileToCanvas(file, {
                x: position.x + index * 24,
                y: position.y + index * 24,
            });
        });
        setToolMode('select');
    }, [addImageFileToCanvas, screenToFlowPosition]);

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
                            addImageFileToCanvas(blob, { x: Math.random() * 100 + 100, y: Math.random() * 100 + 100 });
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

                        setNodes((nds) => normalizeStackOrder([
                            ...nds.map(node => ({ ...node, selected: false })),
                            ...newNodes
                        ]));
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
                        data: { label: textData, boxMode: 'auto' },
                        selected: true,
                        width: 300,
                        height: 150,
                        style: { width: 300, height: 150 },
                    };
                    setNodes((nds) => normalizeStackOrder([
                        ...nds.map(node => ({ ...node, selected: false })),
                        newNode
                    ]));
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
    }, [addImageFileToCanvas, getNodes, setNodes]);

    const createTextNode = useCallback((position: { x: number; y: number }) => {
        const id = `text-${Date.now()}`;
        const newNode: Node = {
            id,
            type: 'text',
            position,
            data: { label: '', autoEdit: true, boxMode: 'auto' },
            width: 120,
            height: 56,
            style: { width: 120, height: 56 },
        };
        setNodes((nds) => normalizeStackOrder(nds.concat({ ...newNode, zIndex: nds.length })));
    }, [setNodes]);

    const handleAddText = useCallback(() => {
        setTextInsertMode((current) => !current);
        setToolMode('select');
    }, []);

    const handleClear = () => {
        if (confirm('Clear canvas?')) {
            setNodes([]);
            setEdges([]);
        }
    };

    const handleEnterFullscreen = useCallback(() => {
        setCloudPanelOpen(false);
        setTextInsertMode(false);
        if (chromeMode === 'fullscreen') {
            exitFocusModes();
            return;
        }

        setChromeMode('fullscreen');
        fullscreenEnteredRef.current = false;
        const fullscreenRequest = canvasRef.current?.requestFullscreen?.();
        if (fullscreenRequest) {
            void fullscreenRequest.catch(() => undefined);
        }
    }, [chromeMode, exitFocusModes]);

    const handleEnterCanvasOnly = useCallback(() => {
        setCloudPanelOpen(false);
        setTextInsertMode(false);
        if (chromeMode === 'canvasOnly') {
            setChromeMode('normal');
            return;
        }

        setNodes((nds) => nds.map((node) => ({ ...node, selected: false })));
        if (document.fullscreenElement) {
            void document.exitFullscreen().catch(() => undefined).finally(() => {
                setChromeMode('canvasOnly');
            });
            return;
        }
        setChromeMode('canvasOnly');
    }, [chromeMode, setNodes]);

    const handleAlignLeft = useCallback(() => {
        setNodes((current) => alignSelectedNodes(current, 'left'));
    }, [setNodes]);

    const handleAlignCenter = useCallback(() => {
        setNodes((current) => alignSelectedNodes(current, 'center'));
    }, [setNodes]);

    const handleAlignRight = useCallback(() => {
        setNodes((current) => alignSelectedNodes(current, 'right'));
    }, [setNodes]);

    const handleAlignTop = useCallback(() => {
        setNodes((current) => alignSelectedNodes(current, 'top'));
    }, [setNodes]);

    const handleAlignMiddle = useCallback(() => {
        setNodes((current) => alignSelectedNodes(current, 'middle'));
    }, [setNodes]);

    const handleAlignBottom = useCallback(() => {
        setNodes((current) => alignSelectedNodes(current, 'bottom'));
    }, [setNodes]);

    const handleDistributeHorizontal = useCallback(() => {
        setNodes((current) => distributeSelectedNodes(current, 'horizontal'));
    }, [setNodes]);

    const handleDistributeVertical = useCallback(() => {
        setNodes((current) => distributeSelectedNodes(current, 'vertical'));
    }, [setNodes]);

    const handleMoveDown = useCallback(() => {
        setNodes((current) => moveSelectedNodes(current, 'down'));
    }, [setNodes]);

    const handleMoveUp = useCallback(() => {
        setNodes((current) => moveSelectedNodes(current, 'up'));
    }, [setNodes]);

    const handleSendToBack = useCallback(() => {
        setNodes((current) => moveSelectionToEdge(current, 'back'));
    }, [setNodes]);

    const handleBringToFront = useCallback(() => {
        setNodes((current) => moveSelectionToEdge(current, 'front'));
    }, [setNodes]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

            if (e.key === 'Escape' && chromeMode !== 'normal') {
                e.preventDefault();
                exitFocusModes();
                return;
            }
            if (e.key === 'Escape' && cloudPanelOpen) {
                e.preventDefault();
                setCloudPanelOpen(false);
                return;
            }
            if (e.key === 'Escape' && textInsertMode) {
                e.preventDefault();
                setTextInsertMode(false);
                return;
            }

            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey && !isInput) {
                e.preventDefault();
                undo();
                return;
            }

            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey && !isInput) {
                e.preventDefault();
                redo();
                return;
            }

            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                if (user && cloudAvailable) {
                    saveCloudShortcutRef.current();
                } else {
                    setCloudPanelOpen(true);
                    setCloudMessage(cloudAvailable ? '请先登录后在线保存' : '云端不可用');
                }
                return;
            }

            if (!e.metaKey && !e.ctrlKey && !e.altKey && !isInput && e.key.toLowerCase() === 'v') {
                e.preventDefault();
                setCloudPanelOpen(false);
                setToolMode('select');
                return;
            }

            if (!e.metaKey && !e.ctrlKey && !e.altKey && !isInput && e.key.toLowerCase() === 'h') {
                e.preventDefault();
                setCloudPanelOpen(false);
                setToolMode('hand');
                return;
            }

            if (!e.metaKey && !e.ctrlKey && !e.altKey && !isInput && e.key.toLowerCase() === 't') {
                e.preventDefault();
                setCloudPanelOpen(false);
                setTextInsertMode(true);
                setToolMode('select');
                return;
            }

            if (!e.metaKey && !e.ctrlKey && !e.altKey && !isInput && e.key.toLowerCase() === 'f' && e.shiftKey) {
                e.preventDefault();
                setCloudPanelOpen(false);
                void handleEnterFullscreen();
                return;
            }

            if (!e.metaKey && !e.ctrlKey && !e.altKey && !isInput && e.key.toLowerCase() === 'f' && !e.shiftKey) {
                e.preventDefault();
                setCloudPanelOpen(false);
                void handleEnterCanvasOnly();
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
    }, [chromeMode, cloudAvailable, cloudPanelOpen, exitFocusModes, handleEnterCanvasOnly, handleEnterFullscreen, redo, textInsertMode, undo, user]);

    const onPaneClick = useCallback((event: React.MouseEvent) => {
        const now = Date.now();
        const timeDiff = now - lastClickTimeRef.current;

        if (textInsertMode) {
            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });
            createTextNode(position);
            setTextInsertMode(false);
            setToolMode('select');
            lastClickTimeRef.current = now;
            return;
        }

        if (timeDiff < 300) {
            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });
            createTextNode(position);
            setToolMode('select');
        }

        lastClickTimeRef.current = now;
    }, [createTextNode, screenToFlowPosition, textInsertMode]);

    const isHandActive = toolMode === 'hand' || isSpacePressed;
    const canDragNodes = toolMode === 'select' && !isSpacePressed;
    const isFullscreenMode = chromeMode === 'fullscreen';
    const isCanvasOnlyMode = chromeMode === 'canvasOnly';
    const isChromeHidden = chromeMode !== 'normal';
    const hasSelection = nodes.some((node) => node.selected);

    return (
        <div className={`relative h-screen w-screen bg-[#f6f6f3] ${isChromeHidden ? 'canvas-chrome-hidden' : ''} ${isCanvasOnlyMode ? 'canvas-content-only' : ''}`} ref={canvasRef}>
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
                elevateNodesOnSelect={false}
                zIndexMode="manual"
                panOnScroll={false}
                zoomOnScroll={true}
                minZoom={0.1}
                maxZoom={4}
                zoomOnDoubleClick={false}
                onPaneClick={onPaneClick}
                onDragOver={handleCanvasDragOver}
                onDrop={handleCanvasDrop}
            >
                {!isChromeHidden && <Controls position="bottom-left" showInteractive={false} />}
                {!isChromeHidden && <MiniMap position="bottom-right" style={{ height: 96, width: 144 }} />}
                {!isCanvasOnlyMode && <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#deded7" />}

                {!isChromeHidden && <ContextBar />}

                {!isChromeHidden && <Panel position="top-left" className="!m-4">
                    <Toolbar
                        activeMode={isSpacePressed ? 'hand' : toolMode}
                        textInsertMode={textInsertMode}
                        chromeMode={chromeMode}
                        onSetMode={setToolMode}
                        onAddText={handleAddText}
                        onClear={handleClear}
                        onFitView={() => fitView({ duration: 800 })}
                        onUndo={undo}
                        onRedo={redo}
                        onSaveFile={handleSaveFile}
                        onOpenFile={() => fileInputRef.current?.click()}
                        onEnterFullscreen={handleEnterFullscreen}
                        onEnterCanvasOnly={handleEnterCanvasOnly}
                        hasSelection={hasSelection}
                        onAlignLeft={handleAlignLeft}
                        onAlignCenter={handleAlignCenter}
                        onAlignRight={handleAlignRight}
                        onAlignTop={handleAlignTop}
                        onAlignMiddle={handleAlignMiddle}
                        onAlignBottom={handleAlignBottom}
                        onDistributeHorizontal={handleDistributeHorizontal}
                        onDistributeVertical={handleDistributeVertical}
                        onSendToBack={handleSendToBack}
                        onMoveDown={handleMoveDown}
                        onMoveUp={handleMoveUp}
                        onBringToFront={handleBringToFront}
                    />
                </Panel>}

                {!isChromeHidden && <Panel position="top-right" className="!m-4">
                    <div ref={cloudPanelRef} className="relative">
                        {!cloudPanelOpen ? (
                            <button
                                type="button"
                                onClick={() => setCloudPanelOpen(true)}
                                className="inline-flex h-11 w-fit min-w-[176px] items-center justify-between gap-3 rounded-full border border-zinc-200/90 bg-white/90 px-3.5 text-left text-zinc-800 shadow-[0_8px_24px_rgba(24,24,27,0.06)] backdrop-blur-xl whitespace-nowrap"
                                title="打开云端面板"
                            >
                                <span className="flex min-w-0 items-center gap-2">
                                    <Cloud className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.8} />
                                    <span className="min-w-0 truncate text-xs font-medium text-zinc-600">
                                        {user ? '已登录' : 'Cloud / 登录'}
                                    </span>
                                </span>
                                <span className="flex items-center gap-2">
                                    <span className="text-[11px] text-zinc-400">
                                        {cloudSyncStatus}
                                    </span>
                                    <ChevronRight className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.8} />
                                </span>
                            </button>
                        ) : (
                            <div className="w-[288px] rounded-lg border border-zinc-200/90 bg-white/90 p-2.5 text-sm text-zinc-800 shadow-[0_8px_24px_rgba(24,24,27,0.06)] backdrop-blur-xl">
                                <div className="mb-2 flex items-center justify-between px-1">
                                    <button
                                        type="button"
                                        onClick={() => setCloudPanelOpen(false)}
                                        className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500"
                                        title="收起云端面板"
                                    >
                                        <Cloud className="h-3.5 w-3.5" strokeWidth={1.8} />
                                        Cloud
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {cloudBusy && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
                                        <button
                                            type="button"
                                            onClick={() => setCloudPanelOpen(false)}
                                            className="rounded p-1 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-950"
                                            title="收起"
                                        >
                                            <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.8} />
                                        </button>
                                    </div>
                                </div>
                                {!cloudAvailable && (
                                    <div className="mb-2 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs leading-5 text-zinc-500">
                                        本地后端未连接；线上 Cloudflare 可注册登录和保存。
                                    </div>
                                )}

                                {user ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-2">
                                            <span className="truncate text-xs text-zinc-500">{user.email}</span>
                                            <button
                                                type="button"
                                                onClick={handleLogout}
                                                className="rounded p-1 text-zinc-400 hover:bg-white hover:text-zinc-950"
                                                title="退出登录"
                                            >
                                                <LogOut className="h-3.5 w-3.5" strokeWidth={1.8} />
                                            </button>
                                        </div>

                                        <div className="flex gap-1.5">
                                            <input
                                                value={canvasTitle}
                                                onChange={(event) => setCanvasTitle(event.target.value)}
                                                className="h-9 min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-2.5 text-sm outline-none focus:border-zinc-500"
                                                placeholder="文件名"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleSaveCloud}
                                                disabled={cloudBusy}
                                                className="inline-flex h-9 items-center gap-1 rounded-md bg-zinc-950 px-2.5 text-xs font-medium text-white disabled:opacity-50"
                                                title="保存当前画布"
                                            >
                                                <Save className="h-3.5 w-3.5" strokeWidth={1.8} />
                                                保存
                                            </button>
                                        </div>

                                        <div className="max-h-56 space-y-1 overflow-auto pr-1">
                                            {files.length === 0 ? (
                                                <div className="rounded-md border border-dashed border-zinc-200 px-3 py-5 text-center text-xs text-zinc-400">
                                                    还没有保存的画布
                                                </div>
                                            ) : files.map((file) => (
                                                <div
                                                    key={file.id}
                                                    className={`group flex items-center gap-2 rounded-md px-2 py-2 transition-colors ${currentCanvasId === file.id ? 'bg-zinc-950 text-white' : 'hover:bg-zinc-50'}`}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenCloud(file)}
                                                        className="min-w-0 flex-1 text-left"
                                                    >
                                                        <div className="truncate text-sm font-medium">{file.title}</div>
                                                        <div className={`text-xs ${currentCanvasId === file.id ? 'text-zinc-300' : 'text-zinc-500'}`}>
                                                            {formatDate(file.updated_at)}
                                                        </div>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteCloud(file)}
                                                        className={`rounded p-1 opacity-70 transition-opacity group-hover:opacity-100 ${currentCanvasId === file.id ? 'text-zinc-300 hover:bg-white/10 hover:text-white' : 'text-zinc-400 hover:bg-red-50 hover:text-red-600'}`}
                                                        title="删除"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        {cloudMessage && <div className="px-1 text-xs text-zinc-500">{cloudMessage}</div>}
                                    </div>
                                ) : (
                                    <form className="space-y-2" onSubmit={handleAuthSubmit}>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(event) => setEmail(event.target.value)}
                                            className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-sm outline-none focus:border-zinc-500"
                                            placeholder="邮箱"
                                        />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(event) => setPassword(event.target.value)}
                                            className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-sm outline-none focus:border-zinc-500"
                                            placeholder="密码"
                                        />
                                        {authError && <div className="text-xs text-red-600">{authError}</div>}
                                        <button
                                            type="submit"
                                            disabled={cloudBusy}
                                            className="h-9 w-full rounded-md bg-zinc-950 px-3 text-sm font-medium text-white disabled:opacity-50"
                                        >
                                            {authMode === 'login' ? '登录' : '注册'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAuthError('');
                                                setAuthMode(authMode === 'login' ? 'register' : 'login');
                                            }}
                                            className="h-8 w-full rounded-md px-3 text-xs text-zinc-500 hover:bg-zinc-50"
                                        >
                                            {authMode === 'login' ? '没有账号？注册' : '已有账号？登录'}
                                        </button>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>
                </Panel>}

                {isFullscreenMode && (
                    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[9999] -translate-x-1/2 rounded-md border border-zinc-200/80 bg-white/70 px-2.5 py-1.5 text-xs text-zinc-500 shadow-[0_8px_24px_rgba(24,24,27,0.05)] backdrop-blur-xl">
                        Esc 退出全屏专注
                    </div>
                )}

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
