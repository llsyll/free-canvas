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

import '@xyflow/react/dist/style.css';
import ImageNode from './CustomNodes/ImageNode';
import TextNode from './CustomNodes/TextNode';
import Toolbar, { ToolMode } from './Toolbar';
import ContextBar from './ContextBar';

const nodeTypes = {
    image: ImageNode,
    text: TextNode,
};

const defaultNodes: Node[] = [
    {
        "id": "text-1769418346266-n3hl1hwpv",
        "type": "text",
        "position": {
            "x": -35.68644956075127,
            "y": -2.4333495118292916
        },
        "data": {
            "label": " _____                 ____                          \n|  ___| __ ___  ___   / ___|__ _ _ ____   ____ _ ___ \n| |_ | '__/ _ \\/ _ \\ | |   / _` | '_ \\ \\ / / _` / __|\n|  _|| | |  __/  __/ | |__| (_| | | | \\ V / (_| \\__ \\\n|_|  |_|  \\___|\\___|  \\____\\__,_|_| |_|\\_/ \\__,_|___/",
            "textStyle": {
                "fontFamily": "var(--font-geist-mono), monospace",
                "textAlign": "center",
                "lineHeight": 1,
                "fontSize": 28.594435138854063
            }
        },
        "selected": false,
        "width": 1008,
        "height": 170,
        "style": {
            "width": 300,
            "height": 150
        },
        "measured": {
            "width": 1008,
            "height": 170
        },
        "resizing": false,
        "dragging": false
    },
    {
        "id": "text-1769419301996",
        "type": "text",
        "position": {
            "x": 22.02931004730175,
            "y": 171.3843623453821
        },
        "data": {
            "label": "By-pixelwave",
            "textStyle": {
                "textAlign": "center",
                "fontFamily": "var(--font-geist-mono), monospace",
                "fontSize": 21
            }
        },
        "width": 893,
        "height": 60,
        "style": {
            "width": 300,
            "height": 150
        },
        "measured": {
            "width": 893,
            "height": 60
        },
        "selected": false,
        "dragging": false,
        "resizing": false
    },
    {
        "id": "text-1769419374374-wzyzg5slp",
        "type": "text",
        "position": {
            "x": 790.3740355447549,
            "y": -10.509056383375096
        },
        "data": {
            "label": "v-1.0",
            "textStyle": {
                "textAlign": "center",
                "fontFamily": "var(--font-geist-mono), monospace",
                "fontSize": 21
            }
        },
        "width": 190,
        "height": 60,
        "style": {
            "width": 300,
            "height": 150
        },
        "measured": {
            "width": 190,
            "height": 60
        },
        "selected": false,
        "dragging": false,
        "resizing": false
    },
    {
        "id": "text-1769419488212",
        "type": "text",
        "position": {
            "x": -4.338042341815708,
            "y": 238.43585718217577
        },
        "data": {
            "label": "................................................................................................................................................\n...................................................................=............................................................................\n.................................................................::.............................................................................\n................................................................:=..............................................................................\n...............................................................:................................................................................\n................................................................................................................................................\n................................................................................................................................................\n................................................................................................................................................\n.............................................................:..................................................................................\n................................................................................................................................................\n................................................................................................................................................\n...........................................................-....................................................................................\n.........................................................:......................................................................................\n................................................................................................................................................\n................................................................................................................................................\n...............+:....-:::-=.................................................................................................................:...\n...........=........:::::::::::.==..............................................................................................................\n........:+..............::.:........::=-=-:..=-.................................................................................................\n..-.........:......:........................::+*................................................................................................\n.........::-==+====-:.........:......:.......:::+%*=............................................................................................\n.....::-+**+++===+++#-...............:::.:.....::-:-+##*:.:.................................................................:::.................\n::::---=++*+=++*+***+#=.........:.:.++*++..+..........::-+*.......................................................:---===----:..................\n:.::-==+*+=**#*+==+*#**............:=#+==%*%%++#%#:....:.-=@.................................................:..==::-==-==-:::..................\n:::-==**=*#*+=**####-..:.::..........=*%*%*##%%#%###***#:...*+.............:.........:.....................:-****:--===----:::::..........:..:..\n:--=+*+*#*+*###*#........-..+:=......-=*%:.####%%######%%+-:.-%......::.......==...........:==+*=..........-+####**=---==+++=+=---::--------=:::\n-=++**+***####%............=-=*+-.......:+%**###-%+#%**##*.*=:+#...:...:=***##%#%%#**#...*..*#=....::.....-=####****++++=+====:::::------==+==+=\n+++*+***######.....................:--....:-=#%%:.-%%**##@..+=-=%....=+=-:............-***+*+.....:-*=.:--*###*######*#*****====++==+++++*+*++++\n****######*%...........................:::.:::=%-..+#%#*%%#.:.:=:.......................++#....:-+##***#**+#**#****#%+=#@%*+===++=+=++*+**#*****\n**########...............................:=.-**+*-..-%%**#%-..........................=:.....-***####*##****####*#+............--++*****+#+=--:-\n*#######..................................-+*#=.=*...#*@*#@:.......................-=-.-..=+###:..:*#+#####****#................................\n*###%=....................................=+=:-**....:%%+#*@......................#-..=..-+%-:*%:..:-#:..:=*+#:.................................\n##=................................................................................+-.=+#%-.:+##*#%*::=#+=+.....................................\n....................................................................................-.-*%:+*##+.:.-*#...........................................\n....................................................................................::=*#::-#:.-+#*#............................................\n....................................................................................:+#*+.=+*..-*##*............................................\n......................................................................................:*=.*#...:..:%............................................\n.....................................................................................:.++.-#....=.+:............................................\n.....................................................................................=*#:++.....................................................\n................................................................................................................................................\n................................................................................................................................................\n................................................................................................................................................\n................................................................................................................................................\n................................................................................................................................................\n................................................................................................................................................\n................................................................................................................................................\n................................................................................................................................................\n................................................................................................................................................\n........................................................................................................................:.......................\n..:..:-.........................................................................................................................................\n----::::::..:...................................................................................................................................\n::::::-:=----:::.:=--:..........................................................................................................................\n:.:::..:--.----=====+:::..................................................................................................................:.....................\n-.::::::.....::::----==---......................................................................................................................\n:.::::-=::---:.:---:-=------=:::..:.............................................................................................................\n:::.:-=----::-:::::::---------:=:-::..:.........................................................................................................",
            "textStyle": {
                "fontFamily": "var(--font-geist-mono), monospace",
                "lineHeight": 1.1,
                "fontSize": 11
            }
        },
        "selected": false,
        "width": 951,
        "height": 502,
        "style": {
            "width": 300,
            "height": 150
        },
        "measured": {
            "width": 951,
            "height": 502
        },
        "dragging": false,
        "resizing": false
    }
];

function CanvasEditorContent() {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const { screenToFlowPosition, fitView, getNodes, setViewport } = useReactFlow();
    const canvasRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [toolMode, setToolMode] = useState<ToolMode>('select');
    const lastClickTimeRef = useRef<number>(0);

    const [isSpacePressed, setIsSpacePressed] = useState(false);

    // Undo/Redo state
    const [history, setHistory] = useState<{ nodes: Node[], edges: Edge[] }[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Always load default canvas on mount (no auto-save restore)
    useEffect(() => {
        setNodes(defaultNodes);
        // Center view after a short delay
        setTimeout(() => fitView({ duration: 800 }), 100);
    }, [setNodes, fitView]);

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
                    const newNodes = data.nodes.map((n: Node) => ({ ...n, selected: false }));
                    setNodes(newNodes);
                    setEdges(data.edges || []);
                    // Reset history
                    setHistory([]);
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

    // Auto-save canvas to localStorage

    // Auto-save canvas to localStorage
    // Auto-save disabled to always load default layout

    // Save to history whenever nodes or edges change
    useEffect(() => {
        const saveToHistory = () => {
            const newState = { nodes, edges };
            setHistory(prev => {
                const newHistory = prev.slice(0, historyIndex + 1);
                newHistory.push(newState);
                // Keep only last 50 states
                if (newHistory.length > 50) newHistory.shift();
                return newHistory;
            });
            setHistoryIndex(prev => Math.min(prev + 1, 49));
        };

        const timeoutId = setTimeout(saveToHistory, 300);
        return () => clearTimeout(timeoutId);
    }, [nodes, edges]);

    const undo = useCallback(() => {
        if (historyIndex > 0) {
            const prevState = history[historyIndex - 1];
            setNodes(prevState.nodes);
            setEdges(prevState.edges);
            setHistoryIndex(prev => prev - 1);
        }
    }, [historyIndex, history, setNodes, setEdges]);

    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            setNodes(nextState.nodes);
            setEdges(nextState.edges);
            setHistoryIndex(prev => prev + 1);
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
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', () => setIsSpacePressed(false));
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', () => setIsSpacePressed(false));
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
                            const url = URL.createObjectURL(blob);
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
                                    data: { src: url }, width: w, height: h, style: { width: w, height: h }
                                };
                                setNodes((nds) => nds.concat(newNode));
                            };
                            img.src = url;
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
                } catch (err) {
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

export default function CanvasEditor() {
    return (
        <ReactFlowProvider>
            <CanvasEditorContent />
        </ReactFlowProvider>
    );
}
