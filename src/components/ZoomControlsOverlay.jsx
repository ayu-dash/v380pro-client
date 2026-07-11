import React from 'react';
import { Button } from './ui/button';

export function ZoomControlsOverlay({ scale, onChange, onReset }) {
  return (
    <div 
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-zinc-900/90 border border-zinc-700 px-1 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xl" 
      onMouseDown={(e) => e.stopPropagation()} 
      onTouchStart={(e) => e.stopPropagation()}
    >
      <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-300 hover:text-white rounded-full" onClick={() => onChange(Math.max(1, scale - 0.5))}>
        <span className="material-symbols-outlined text-[18px]">remove</span>
      </Button>
      <span className="text-xs font-mono w-12 text-center text-zinc-200">{Math.round(scale * 100)}%</span>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-300 hover:text-white rounded-full" onClick={() => onChange(Math.min(5, scale + 0.5))}>
        <span className="material-symbols-outlined text-[18px]">add</span>
      </Button>
      <div className="w-px h-4 bg-zinc-700 mx-1" />
      <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white rounded-full" onClick={onReset}>
        <span className="material-symbols-outlined text-[16px]">restart_alt</span>
      </Button>
    </div>
  );
}
