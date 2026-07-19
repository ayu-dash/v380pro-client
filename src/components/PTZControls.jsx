import React, { useState, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Square, Gamepad2 } from 'lucide-react';

const SPEED = 0.5;

export default function PTZControls({ camId }) {
  const [show, setShow] = useState(false);
  const activeRef = useRef(null);

  const move = useCallback(async (x, y, zoom = 0) => {
    try {
      await fetch(`/api/ptz/${camId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x: x * SPEED, y: y * SPEED, zoom: zoom * SPEED })
      });
    } catch (e) { /* silent */ }
  }, [camId]);

  const stopMove = useCallback(async () => {
    activeRef.current = null;
    try {
      await fetch(`/api/ptz/${camId}/stop`, { method: 'POST' });
    } catch (e) { /* silent */ }
  }, [camId]);

  const handlePointerDown = useCallback((e, x, y, zoom = 0) => {
    e.preventDefault();
    e.stopPropagation();
    activeRef.current = { x, y, zoom };
    move(x, y, zoom);
  }, [move]);

  const handlePointerUp = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    stopMove();
  }, [stopMove]);

  if (!show) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="absolute bottom-3 right-3 z-20 bg-black/60 text-white hover:bg-black/80 hover:text-white h-8 w-8"
        onClick={() => setShow(true)}
      >
        <Gamepad2 className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="absolute bottom-3 right-3 z-20 select-none" onContextMenu={e => e.preventDefault()}>
      <div className="bg-black/70 backdrop-blur-sm rounded-lg p-2 flex flex-col items-center gap-1">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-zinc-700 hover:text-white"
            onPointerDown={e => handlePointerDown(e, 0, 1)}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-zinc-700 hover:text-white"
            onPointerDown={e => handlePointerDown(e, -1, 0)}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-zinc-700 hover:text-white"
            onPointerDown={e => { e.preventDefault(); e.stopPropagation(); stopMove(); }}
          >
            <Square className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-zinc-700 hover:text-white"
            onPointerDown={e => handlePointerDown(e, 1, 0)}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-zinc-700 hover:text-white"
            onPointerDown={e => handlePointerDown(e, 0, -1)}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-[10px] text-zinc-400 hover:text-white hover:bg-zinc-700 w-full mt-1 h-6"
          onClick={() => setShow(false)}
        >
          Hide
        </Button>
      </div>
    </div>
  );
}
