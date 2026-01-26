import React, { memo, useRef } from 'react';
import { Handle, Position, NodeProps, NodeResizer, useReactFlow, ResizeParams } from '@xyflow/react';

const ImageNode = ({ id, data, selected }: NodeProps) => {
    const { getNodes, setNodes } = useReactFlow();

    const initialNodesData = useRef<Map<string, { x: number, y: number, w: number, h: number }>>(new Map());
    const startSizeRef = useRef<{ x: number, y: number, w: number, h: number } | null>(null);

    const onResizeStart = (event: any, params: ResizeParams) => {
        const nodes = getNodes();
        initialNodesData.current.clear();

        nodes.forEach((n) => {
            if (n.selected) {
                const w = n.measured?.width ?? n.width ?? 0;
                const h = n.measured?.height ?? n.height ?? 0;
                const x = n.position.x;
                const y = n.position.y;
                if (w > 0 && h > 0) {
                    initialNodesData.current.set(n.id, { x, y, w, h });
                }
            }
        });

        const currentNode = nodes.find(n => n.id === id);
        if (currentNode) {
            startSizeRef.current = {
                x: currentNode.position.x,
                y: currentNode.position.y,
                w: params.width,
                h: params.height
            };
        }
    };

    const onResize = (event: any, params: ResizeParams) => {
        if (!startSizeRef.current || initialNodesData.current.size === 0) return;

        const start = startSizeRef.current;

        const scaleX = start.w !== 0 ? params.width / start.w : 1;
        const scaleY = start.h !== 0 ? params.height / start.h : 1;

        // Anchor calculation
        const epsilon = 0.5;
        const isLeftFixed = Math.abs(params.x - start.x) < epsilon;
        const isTopFixed = Math.abs(params.y - start.y) < epsilon;

        const anchorX = isLeftFixed ? start.x : start.x + start.w;
        const anchorY = isTopFixed ? start.y : start.y + start.h;

        setNodes((nds) =>
            nds.map((n) => {
                if (n.id === id) return n;

                if (initialNodesData.current.has(n.id)) {
                    const init = initialNodesData.current.get(n.id)!;

                    const newW = init.w * scaleX;
                    const newH = init.h * scaleY;
                    const newX = anchorX + (init.x - anchorX) * scaleX;
                    const newY = anchorY + (init.y - anchorY) * scaleY;

                    return {
                        ...n,
                        position: { x: newX, y: newY },
                        style: {
                            ...n.style,
                            width: newW, // Sync top style
                            height: newH,
                        },
                        width: newW, // Sync data width
                        height: newH,
                    };
                }
                return n;
            })
        );
    };

    return (
        <div className="relative group/node w-full h-full">
            <NodeResizer
                color="#0a7ea4"
                isVisible={selected}
                minWidth={20}
                minHeight={20}
                // Force Aspect Ratio Lock to prevent cropping/distortion
                keepAspectRatio={true}
                lineStyle={{ border: 'none' }}
                handleStyle={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    border: '1.5px solid white',
                    backgroundColor: '#0a7ea4',
                    opacity: 1
                }}
                onResizeStart={onResizeStart}
                onResize={onResize}
            />

            {/* Visual Image Container */}
            <div className={`relative w-full h-full rounded-lg overflow-hidden transition-all duration-75 block ${selected ? 'ring-1 ring-blue-500 ring-offset-1' : 'group-hover/node:ring-1 group-hover/node:ring-blue-500/30'}`}>
                {data.src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={data.src as string}
                        alt="Pasted"
                        // Use object-fill because we force aspect ratio on the container, so fill ensures it fits perfectly without cropping (cover)
                        // or letterboxing (contain).
                        className="w-full h-full object-fill pointer-events-none select-none block"
                    />
                ) : (
                    <div className="w-full h-full p-4 bg-gray-50 text-gray-400 text-xs text-center flex items-center justify-center">Image</div>
                )}
            </div>

        </div>
    );
};

export default memo(ImageNode);
