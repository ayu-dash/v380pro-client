import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ZoomControlsOverlay } from '../components/ZoomControlsOverlay';

export default function Live() {
  const {
    cameras,
    liveMuteStates, setLiveMuteStates,
    liveZoomStates,
    liveDetections,
    liveFullscreen, setLiveFullscreen,
    liveLoadingStates, setLiveLoadingStates,
    activeManualRecordings,
    startPan, doPan, endPan, handleZoomChange,
    handleManualSnapshot, toggleManualRecording, openSettings,
    startHlsStream, destroyHlsStreams
  } = useOutletContext();

  useEffect(() => {
    if (cameras.length > 0) {
      cameras.forEach(cam => {
        const video = document.getElementById(`video-${cam.id}`);
        if (video) startHlsStream(cam, video);
      });
    }
    return () => {
      destroyHlsStreams();
    };
  }, [cameras, startHlsStream, destroyHlsStreams]);

  return (
    <div className="camera-grid h-full">
      {cameras.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-zinc-500">
          <p className="text-sm">No cameras available. Add one in settings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {cameras.map(cam => {
            const isMuted = liveMuteStates[cam.id] !== false;
            const zoom = liveZoomStates[cam.id] || { scale: 1, x: 0, y: 0 };
            const detections = liveDetections[cam.id] || [];
            const isFullscreen = liveFullscreen === cam.id;

            return (
              <Card key={cam.id} className={`overflow-hidden rounded-md border-zinc-800 ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}>
                <div
                  className="group relative bg-zinc-950 aspect-video w-full overflow-hidden cursor-move"
                  style={{ height: isFullscreen ? '100%' : 'auto' }}
                  onMouseDown={(e) => startPan(e, cam.id, 'live')}
                  onMouseMove={doPan}
                  onMouseUp={endPan}
                  onMouseLeave={endPan}
                  onTouchStart={(e) => startPan(e, cam.id, 'live')}
                  onTouchMove={doPan}
                  onTouchEnd={endPan}
                >
                  <div
                    className="w-full h-full relative"
                    style={{
                      transform: `scale(${zoom.scale}) translate(${zoom.x}px, ${zoom.y}px)`,
                      transformOrigin: 'center center'
                    }}
                  >
                    <video
                      id={`video-${cam.id}`}
                      crossOrigin="anonymous"
                      muted={isMuted}
                      autoPlay
                      playsInline
                      onPlaying={() => setLiveLoadingStates(prev => ({ ...prev, [cam.id]: false }))}
                      onWaiting={() => setLiveLoadingStates(prev => ({ ...prev, [cam.id]: true }))}
                      className="w-full h-full object-fill pointer-events-none"
                    />

                    {liveLoadingStates[cam.id] !== false && (
                      <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 z-10">
                        <div className="w-8 h-8 border-4 border-zinc-700 border-t-white rounded-full animate-spin" />
                      </div>
                    )}

                    {activeManualRecordings[cam.id] && (
                      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold shadow-lg animate-pulse">
                        <div className="h-2 w-2 bg-white rounded-full" />
                        REC
                      </div>
                    )}

                    {detections.map((d, index) => {
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

                  <div className="absolute top-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => handleManualSnapshot(cam.id)}>
                      <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                    </Button>
                    <Button variant="secondary" size="icon" className={`h-7 w-7 ${activeManualRecordings[cam.id] ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500' : ''}`} onClick={() => toggleManualRecording(cam.id)}>
                      <span className="material-symbols-outlined text-[16px]">{activeManualRecordings[cam.id] ? 'stop_circle' : 'radio_button_checked'}</span>
                    </Button>
                    <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => setLiveMuteStates(prev => ({ ...prev, [cam.id]: !isMuted }))}>
                      <span className="material-symbols-outlined text-[16px]">{isMuted ? 'volume_off' : 'volume_up'}</span>
                    </Button>
                    <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => setLiveFullscreen(isFullscreen ? null : cam.id)}>
                      {cam.id === liveFullscreen ? <span className="material-symbols-outlined text-[18px]">close_fullscreen</span> : <span className="material-symbols-outlined text-[18px]">fullscreen</span>}
                    </Button>
                    <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => openSettings(cam)}>
                      <span className="material-symbols-outlined text-[16px]">tune</span>
                    </Button>
                  </div>

                  <ZoomControlsOverlay
                    scale={zoom.scale}
                    onChange={(val) => handleZoomChange(cam.id, val, 'live')}
                    onReset={() => handleZoomChange(cam.id, 1, 'live')}
                  />
                </div>
                <div className="px-4 py-3 bg-zinc-900 border-t border-zinc-800 flex justify-between items-center">
                  <span className="text-sm font-medium">{cam.name}</span>
                  <span className="text-xs font-mono text-zinc-500">{cam.id}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
