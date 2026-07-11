import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ZoomControlsOverlay } from '../components/ZoomControlsOverlay';

export default function Playback() {
  const {
    cameras,
    playbackCamId, setPlaybackCamId,
    playbackDate, setPlaybackDate,
    recordings,
    activeRecording,
    playbackDetections,
    activePlaybackDetections,
    playbackZoom,
    loadPlaybackFiles, handleDeletePlayback, handlePlayRecording, seekToEvent, handlePlaybackTimeUpdate,
    startPan, doPan, endPan, handleZoomChange
  } = useOutletContext();

  useEffect(() => {
    loadPlaybackFiles();
  }, [playbackCamId, playbackDate, loadPlaybackFiles]);

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={playbackCamId}
          onChange={(e) => setPlaybackCamId(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-md text-sm outline-none flex-1"
        >
          {cameras.length === 0 && <option value="">No cameras</option>}
          {cameras.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Input type="date" value={playbackDate} onChange={(e) => setPlaybackDate(e.target.value)} className="w-full sm:w-auto" />
        <Button onClick={loadPlaybackFiles}>Search</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <div 
          className="group bg-zinc-950 border border-zinc-800 rounded-md overflow-hidden aspect-video relative flex items-center justify-center cursor-move"
          onMouseDown={(e) => startPan(e, playbackCamId, 'playback')}
          onMouseMove={doPan}
          onMouseUp={endPan}
          onMouseLeave={endPan}
          onTouchStart={(e) => startPan(e, playbackCamId, 'playback')}
          onTouchMove={doPan}
          onTouchEnd={endPan}
        >
          <div
            className="w-full h-full relative"
            style={{
              transform: `scale(${playbackZoom.scale}) translate(${playbackZoom.x}px, ${playbackZoom.y}px)`,
              transformOrigin: 'center center'
            }}
          >
            <video 
              id="playbackPlayer" 
              controls 
              onTimeUpdate={handlePlaybackTimeUpdate} 
              className="w-full h-full object-fill" 
            />
            {activePlaybackDetections.map((d, index) => {
              const [x, y, w, h] = d.bbox;
              return (
                <div
                  key={index}
                  className="detection-box border-red-500 bg-red-500/10 absolute pointer-events-none"
                  style={{
                    left: `${(x / 640) * 100}%`, top: `${(y / 360) * 100}%`,
                    width: `${(w / 640) * 100}%`, height: `${(h / 360) * 100}%`
                  }}
                >
                  <span className="box-label bg-red-500 text-white text-[10px] px-1">{d.class}</span>
                </div>
              );
            })}
          </div>
          <ZoomControlsOverlay 
            scale={playbackZoom.scale}
            onChange={(val) => handleZoomChange(playbackCamId, val, 'playback')}
            onReset={() => handleZoomChange(playbackCamId, 1, 'playback')}
          />
        </div>

        <div className="space-y-2 mt-2 h-[calc(100vh-300px)] overflow-y-auto pr-2">
          {recordings.length === 0 ? (
            <p className="text-sm text-zinc-500">Tidak ada rekaman ditemukan.</p>
          ) : (
            recordings.map(file => (
              <div
                key={file.name}
                onClick={() => handlePlayRecording(file)}
                className={`flex items-center gap-3 p-2 rounded cursor-pointer transition ${activeRecording?.name === file.name ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">{file.name}</p>
                  <p className="text-xs text-zinc-500">{file.time}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-zinc-800" onClick={(e) => handleDeletePlayback(e, file)}>
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="col-span-full mt-4">
          <h4 className="text-sm font-semibold mb-3">Detection Events</h4>
          <div className="space-y-2">
            {playbackDetections.map((l, index) => {
              const mins = Math.floor(l.relSecs / 60).toString().padStart(2, '0');
              const secs = Math.floor(l.relSecs % 60).toString().padStart(2, '0');
              return (
                <div
                  key={index}
                  onClick={() => seekToEvent(l.relSecs)}
                  className="flex justify-between items-center p-2 bg-zinc-950 hover:bg-zinc-800 rounded border border-zinc-800 cursor-pointer text-xs"
                >
                  <span className="truncate">{l.detections.map(d => d.class).join(', ')}</span>
                  <span className="text-zinc-500">{mins}:{secs}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
