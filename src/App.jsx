import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import {
  RefreshCw, X, Menu
} from 'lucide-react';
import Hls from 'hls.js';

// Import Shadcn UI Components
import { Button } from './components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './components/ui/dialog';
import { Sheet } from './components/ui/sheet';

// Import Layout & Pages
import Layout from './components/Layout';
const Live = React.lazy(() => import('./pages/Live'));
const Playback = React.lazy(() => import('./pages/Playback'));
const Snapshots = React.lazy(() => import('./pages/Snapshots'));
const Settings = React.lazy(() => import('./pages/Settings'));
import { ZoomControlsOverlay } from './components/ZoomControlsOverlay';

export default function App() {
    const [authenticated, setAuthenticated] = useState(null); // null means checking
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  
  const [cameras, setCameras] = useState([]);
  const [storageInfo, setStorageInfo] = useState({ total: '—', used: '—', free: '—', percent: '0%' });

  // Camera Settings Modal State
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [selectedCamSettings, setSelectedCamSettings] = useState(null);
  const [motionSens, setMotionSens] = useState(50);
  const [aiConf, setAiConf] = useState(60);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Live Tab State
  const [liveMuteStates, setLiveMuteStates] = useState({});
  const [liveZoomStates, setLiveZoomStates] = useState({});
  const [liveDetections, setLiveDetections] = useState({});
  const [liveFullscreen, setLiveFullscreen] = useState(null);
  const [liveLoadingStates, setLiveLoadingStates] = useState({});
  const [liveErrorStates, setLiveErrorStates] = useState({});

  // Playback Tab State
  const [playbackCamId, setPlaybackCamId] = useState('');
  const [playbackDate, setPlaybackDate] = useState('');
  const [recordings, setRecordings] = useState([]);
  const [activeRecording, setActiveRecording] = useState(null);
  const [playbackDetections, setPlaybackDetections] = useState([]);
  const [activePlaybackDetections, setActivePlaybackDetections] = useState([]);
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);
  const [playbackZoom, setPlaybackZoom] = useState({ scale: 1, x: 0, y: 0 });

  // Snapshots Tab State
  const [snapshotCamId, setSnapshotCamId] = useState('');
  const [snapshotDate, setSnapshotDate] = useState('');
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [activeSnapshotUrl, setActiveSnapshotUrl] = useState(null);
  const [snapshotZoom, setSnapshotZoom] = useState({ scale: 1, x: 0, y: 0 });

  // Manual Capture State
  const [activeManualRecordings, setActiveManualRecordings] = useState({});
  const mediaRecordersRef = useRef({});
  const recordedChunksRef = useRef({});

  // Settings Tab State
  const [newCamName, setNewCamName] = useState('');
  const [newCamUrl, setNewCamUrl] = useState('');
  const [newOnvifPort, setNewOnvifPort] = useState('8899');
  const [newOnvifUser, setNewOnvifUser] = useState('');
  const [newOnvifPass, setNewOnvifPass] = useState('');
  const [scanning, setScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState([]);

  // Pan interaction state
  const panStartRef = useRef({ x: 0, y: 0, active: false, currentX: 0, currentY: 0 });

  // WS for real-time detections
  const wsRef = useRef(null);
  const hlsInstancesRef = useRef({});

  const fetchCameras = async () => {
    try {
      const res = await fetch('/api/cameras');
      if (res.status === 401) {
        setAuthenticated(false);
        return;
      }
      const data = await res.json();
      setCameras(data);
      if (data.length > 0) {
        if (!playbackCamId) setPlaybackCamId(data[0].id);
        if (!snapshotCamId) setSnapshotCamId(data[0].id);
      }
    } catch (err) {
      console.error('Fetch cameras failed:', err);
    }
  };

  const fetchStorageInfo = async () => {
    try {
      const res = await fetch('/api/system/storage');
      if (!res.ok) return;
      const data = await res.json();
      setStorageInfo(data);
    } catch (err) {
      console.error('Failed to fetch storage info:', err);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const [authRes, camsRes, storageRes] = await Promise.all([
        fetch('/api/check-auth'),
        fetch('/api/cameras'),
        fetch('/api/system/storage')
      ]);
      const authData = await authRes.json();
      setAuthenticated(authData.authenticated);
      if (authData.authenticated) {
        if (camsRes.ok) {
          const cams = await camsRes.json();
          setCameras(cams);
          if (cams.length > 0) {
            if (!playbackCamId) setPlaybackCamId(cams[0].id);
            if (!snapshotCamId) setSnapshotCamId(cams[0].id);
          }
        }
        if (storageRes.ok) {
          setStorageInfo(await storageRes.json());
        }
      }
    } catch (err) {
      setAuthenticated(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (authenticated) {
      const interval = setInterval(() => {
        fetchCameras();
        fetchStorageInfo();
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [authenticated]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setPlaybackDate(today);
    setSnapshotDate(today);
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    const connectWS = () => {
      const wsUrl = `ws://${window.location.hostname}:3001`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'detection') {
            const camId = data.cameraId;
            setLiveDetections(prev => ({ ...prev, [camId]: data.detections }));
            setTimeout(() => {
              setLiveDetections(prev => {
                const updated = { ...prev };
                delete updated[camId];
                return updated;
              });
            }, 4000);
          }
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };
      ws.onclose = () => setTimeout(connectWS, 5000);
    };
    connectWS();
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [authenticated]);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoginError(false);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        setAuthenticated(true);
        setPassword('');
        fetchCameras();
        fetchStorageInfo();
      } else {
        setLoginError(true);
      }
    } catch (err) {
      setLoginError(true);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setAuthenticated(false);
    window.location.reload();
  };

  const handleAddCamera = async () => {
    if (!newCamName || !newCamUrl) return alert('Nama dan URL kamera harus diisi.');
    try {
      const res = await fetch('/api/cameras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCamName, url: newCamUrl, status: 'online',
          onvifPort: newOnvifPort, onvifUsername: newOnvifUser, onvifPassword: newOnvifPass
        })
      });
      if (res.ok) {
        setNewCamName('');
        setNewCamUrl('');
        setNewOnvifPort('8899');
        setNewOnvifUser('');
        setNewOnvifPass('');
        fetchCameras();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Gagal menambahkan kamera.');
      }
    } catch (err) {
      alert('Error connecting to server.');
    }
  };

  const handleDeleteCamera = async (id) => {
    if (!confirm('Hapus kamera ini?')) return;
    try {
      await fetch(`/api/cameras/${id}`, { method: 'DELETE' });
      fetchCameras();
    } catch (err) {
      alert('Gagal menghapus kamera.');
    }
  };

  const openSettings = (cam) => {
    setSelectedCamSettings(cam);
    setMotionSens(cam.motionSensitivity || 50);
    setAiConf(cam.aiConfidenceThreshold || 60);
    setSettingsModalOpen(true);
  };

  const handleSaveSettings = async () => {
    if (!selectedCamSettings) return;
    setIsSavingSettings(true);
    try {
      const res = await fetch(`/api/cameras/${selectedCamSettings.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motionSensitivity: motionSens, aiConfidenceThreshold: aiConf })
      });
      if (res.ok) {
        setSettingsModalOpen(false);
        fetchCameras();
      } else {
        alert('Gagal menyimpan pengaturan.');
      }
    } catch (e) {
      alert('Koneksi terputus.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    setDiscoveredDevices([]);
    try {
      const res = await fetch('/api/discover');
      const data = await res.json();
      setDiscoveredDevices(data);
    } catch (e) {
      alert('Pencarian kamera gagal.');
    } finally {
      setScanning(false);
    }
  };
  const loadSnapshots = useCallback(async () => {
    if (!snapshotCamId) return;
    setSnapshotsLoading(true);
    try {
      const url = snapshotDate ? `/api/snapshots/${snapshotCamId}?date=${snapshotDate}` : `/api/snapshots/${snapshotCamId}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to load");
      const data = await response.json();
      setSnapshots(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSnapshotsLoading(false);
    }
  }, [snapshotCamId, snapshotDate]);

  const handleDeleteSnapshot = async (e, file) => {
    e.stopPropagation();
    if (!confirm('Hapus foto ini?')) return;
    try {
      await fetch(`/api/snapshots/${snapshotCamId}/${file.name}`, { method: 'DELETE' });
      loadSnapshots();
    } catch (err) { console.error(err); }
  };



  const loadPlaybackFiles = useCallback(async () => {
    if (!playbackCamId) return;
    try {
      const response = await fetch(`/api/recordings/${playbackCamId}`);
      if (!response.ok) throw new Error("Failed to load");
      const data = await response.json();
      const filtered = playbackDate ? data.filter(f => f.name.startsWith(playbackDate)) : data;
      setRecordings(filtered);
      if (filtered.length > 0) handlePlayRecording(filtered[0]);
    } catch (err) {
      console.error(err);
    }
  }, [playbackCamId, playbackDate]);

  const handleDeletePlayback = async (e, file) => {
    e.stopPropagation();
    if (!confirm('Hapus rekaman ini?')) return;
    try {
      await fetch(`/api/recordings/${playbackCamId}/${file.name}`, { method: 'DELETE' });
      if (activeRecording?.name === file.name) setActiveRecording(null);
      loadPlaybackFiles();
    } catch (err) { console.error(err); }
  };

  const handlePlayRecording = async (recFile) => {
    setActiveRecording(recFile);
    setPlaybackLoading(true);
    setPlaybackError(false);
    setPlaybackZoom({ scale: 1, x: 0, y: 0 });

    const player = document.getElementById('playbackPlayer');
    if (player) {
      player.src = recFile.url;
      player.oncanplay = () => {
        setPlaybackLoading(false);
        player.play().catch(() => { });
      };
      player.onerror = () => {
        setPlaybackLoading(false);
        setPlaybackError(true);
      };
    }

    setPlaybackDetections([]);
    try {
      const res = await fetch(`/api/detections/${playbackCamId}`);
      if (!res.ok) {
        console.warn(`Detections fetch failed: ${res.status}`);
        return;
      }
      const logs = await res.json();
      const parts = recFile.name.replace('.mp4', '').split('_');
      const dateParts = parts[0].split('-');
      const timeParts = parts[1].split('-').map(Number);
      const segmentStart = new Date(
        parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]),
        timeParts[0], timeParts[1], timeParts[2] || 0
      ).getTime();
      const parsedLogs = logs.map(l => ({
        ...l,
        relSecs: (new Date(l.time).getTime() - segmentStart) / 1000
      })).filter(l => l.relSecs >= 0 && l.relSecs <= 300);
      setPlaybackDetections(parsedLogs);
    } catch (e) {
      console.error('Failed to load detections:', e);
    }
  };

  const seekToEvent = (secs) => {
    const player = document.getElementById('playbackPlayer');
    if (player) {
      player.currentTime = secs;
      player.play().catch(() => { });
    }
  };

  const handlePlaybackTimeUpdate = (e) => {
    const player = e.target;
    const currentSecs = player.currentTime;
    const active = playbackDetections.find(l => Math.abs(l.relSecs - currentSecs) < 5);
    if (active) {
      setActivePlaybackDetections(active.detections);
    } else {
      setActivePlaybackDetections([]);
    }
  };

  const handleZoomChange = (id, scale, type = 'live') => {
    const val = parseFloat(scale);
    const updateZoomState = (prev) => {
      const state = prev[id] || { scale: 1, x: 0, y: 0 };
      return { ...prev, [id]: { scale: val, x: val <= 1 ? 0 : state.x, y: val <= 1 ? 0 : state.y } };
    };

    if (type === 'live') setLiveZoomStates(updateZoomState);
    else if (type === 'playback') setPlaybackZoom(prev => ({ ...prev, scale: val }));
    else if (type === 'snapshot') setSnapshotZoom(prev => ({ ...prev, scale: val }));
  };

  const startPan = (e, id, type = 'live') => {
    let state = { scale: 1, x: 0, y: 0 };
    if (type === 'live') state = liveZoomStates[id] || { scale: 1, x: 0, y: 0 };
    else if (type === 'playback') state = playbackZoom;
    else if (type === 'snapshot') state = snapshotZoom;

    if (state.scale <= 1) return;
    const clientX = e.touches ? e.touches[0].clientX : e.pageX;
    const clientY = e.touches ? e.touches[0].clientY : e.pageY;
    panStartRef.current = { x: clientX - state.x, y: clientY - state.y, active: true, id, type };
  };

  const doPan = (e) => {
    const ref = panStartRef.current;
    if (!ref.active) return;
    if (e.cancelable) e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.pageX;
    const clientY = e.touches ? e.touches[0].clientY : e.pageY;
    const dx = clientX - ref.x;
    const dy = clientY - ref.y;

    if (ref.type === 'live') {
      setLiveZoomStates(prev => ({ ...prev, [ref.id]: { ...prev[ref.id], x: dx, y: dy } }));
    } else if (ref.type === 'playback') {
      setPlaybackZoom(prev => ({ ...prev, x: dx, y: dy }));
    } else if (ref.type === 'snapshot') {
      setSnapshotZoom(prev => ({ ...prev, x: dx, y: dy }));
    }
  };

  const endPan = () => {
    if (panStartRef.current) {
      panStartRef.current.active = false;
    }
  };


  const openSnapshotModal = (url) => { setActiveSnapshotUrl(url); setSnapshotZoom({ scale: 1, x: 0, y: 0 }); };

  // --- MANUAL ACTIONS ---
  const handleManualSnapshot = (camId) => {
    const video = document.getElementById(`video-${camId}`);
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `snapshot_${camId}_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;
    a.click();
  };

  const toggleManualRecording = (camId) => {
    const isRecording = activeManualRecordings[camId];
    if (isRecording) {
      const recorder = mediaRecordersRef.current[camId];
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      setActiveManualRecordings(prev => ({ ...prev, [camId]: false }));
    } else {
      const video = document.getElementById(`video-${camId}`);
      if (!video) return;
      let stream;
      if (video.captureStream) stream = video.captureStream();
      else if (video.mozCaptureStream) stream = video.mozCaptureStream();
      else return alert("Browser Anda tidak mendukung perekaman langsung.");

      const mime = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      recordedChunksRef.current[camId] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current[camId].push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current[camId], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = mime.includes('mp4') ? 'mp4' : 'webm';
        a.download = `record_${camId}_${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
      };

      recorder.start();
      mediaRecordersRef.current[camId] = recorder;
      setActiveManualRecordings(prev => ({ ...prev, [camId]: true }));
    }
  };
  // ----------------------


  const destroyHlsStreams = useCallback(() => {
    Object.keys(hlsInstancesRef.current).forEach(id => {
      if(hlsInstancesRef.current[id]) {
        hlsInstancesRef.current[id].destroy();
      }
    });
    hlsInstancesRef.current = {};
  }, []);

  const startHlsStream = useCallback((cam, videoElement) => {
    if (!videoElement) return;
    if (hlsInstancesRef.current[cam.id]) {
      hlsInstancesRef.current[cam.id].destroy();
      delete hlsInstancesRef.current[cam.id];
    }

    const hlsUrl = `http://${window.location.hostname}:8888/${cam.id}/index.m3u8`;
    let retryCount = 0;
    const MAX_RETRIES = 15;

    const connectHls = () => {
      setLiveErrorStates(prev => ({ ...prev, [cam.id]: false }));
      if (hlsInstancesRef.current[cam.id]) {
        hlsInstancesRef.current[cam.id].destroy();
        delete hlsInstancesRef.current[cam.id];
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        liveSyncDurationCount: 2,
        liveMaxLatencyDurationCount: 4,
        maxLiveSyncPlaybackRate: 1.5,
        manifestLoadingTimeOut: 3000,
        manifestLoadingMaxRetry: 0,
        levelLoadingTimeOut: 3000,
        levelLoadingMaxRetry: 0,
        fragLoadingTimeOut: 3000,
        fragLoadingMaxRetry: 0,
        startFragPrefetch: false,
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          hls.destroy();
          delete hlsInstancesRef.current[cam.id];
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            setTimeout(connectHls, 2000);
          } else {
            setLiveErrorStates(prev => ({ ...prev, [cam.id]: true }));
            setLiveLoadingStates(prev => ({ ...prev, [cam.id]: false }));
          }
        }
      });

      hls.loadSource(hlsUrl);
      hls.attachMedia(videoElement);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        retryCount = 0;
        setLiveErrorStates(prev => ({ ...prev, [cam.id]: false }));
        videoElement.play().catch(() => {});
      });

      hlsInstancesRef.current[cam.id] = hls;
    };

    if (Hls.isSupported()) {
      connectHls();
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      videoElement.src = hlsUrl;
      videoElement.play().catch(() => {});
    }
  }, []);

  
  if (authenticated === null) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-50">
        <RefreshCw className="h-6 w-6 animate-spin-custom text-zinc-500" />
      </div>
    );
  }

  if (authenticated === false) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 px-4">
        <Card className="w-full max-w-sm border-zinc-800">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Login</CardTitle>
            <CardDescription>Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <Label>Username</Label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full">Sign In</Button>
            </form>
            {loginError && (
              <p className="mt-4 text-xs text-red-500 text-center">Invalid credentials</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }


  const contextProps = {
    cameras,
    liveMuteStates, setLiveMuteStates,
    liveZoomStates, setLiveZoomStates,
    liveDetections, setLiveDetections,
    liveFullscreen, setLiveFullscreen,
    liveLoadingStates, setLiveLoadingStates,
    liveErrorStates, setLiveErrorStates,
    playbackCamId, setPlaybackCamId,
    playbackDate, setPlaybackDate,
    recordings, setRecordings,
    activeRecording, setActiveRecording,
    playbackDetections, setPlaybackDetections,
    activePlaybackDetections, setActivePlaybackDetections,
    playbackLoading, setPlaybackLoading,
    playbackError, setPlaybackError,
    playbackZoom, setPlaybackZoom,
    snapshotCamId, setSnapshotCamId,
    snapshotDate, setSnapshotDate,
    snapshots, setSnapshots,
    snapshotsLoading, setSnapshotsLoading,
    activeSnapshotUrl, setActiveSnapshotUrl,
    snapshotZoom, setSnapshotZoom,
    activeManualRecordings, setActiveManualRecordings,
    newCamName, setNewCamName,
    newCamUrl, setNewCamUrl,
    newOnvifPort, setNewOnvifPort,
    newOnvifUser, setNewOnvifUser,
    newOnvifPass, setNewOnvifPass,
    scanning, setScanning,
    discoveredDevices, setDiscoveredDevices,
    startPan, doPan, endPan, handleZoomChange,
    handleManualSnapshot, toggleManualRecording, openSettings,
    handleAddCamera, handleScan, handleSaveSettings, handleDeleteCamera,
    loadSnapshots, handleDeleteSnapshot, openSnapshotModal, loadPlaybackFiles, handleDeletePlayback, handlePlayRecording, seekToEvent, handlePlaybackTimeUpdate,
    startHlsStream, destroyHlsStreams
  };

  return (
    <BrowserRouter>
      <Suspense fallback={
        <div className="flex h-screen items-center justify-center bg-zinc-950">
          <RefreshCw className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      }>
      <Routes>
        <Route path="/" element={<Layout storageInfo={storageInfo} cameras={cameras} handleLogout={handleLogout} contextProps={contextProps} />}>
          <Route index element={<Live />} />
          <Route path="playback" element={<Playback />} />
          <Route path="snapshots" element={<Snapshots />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      </Suspense>

      <Dialog open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
        <DialogContent onClose={() => setSettingsModalOpen(false)}>
          <DialogHeader><DialogTitle>Camera Settings</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between"><Label>Motion Sensitivity</Label><span className="text-xs text-zinc-400">{motionSens}%</span></div>
              <input type="range" min="0" max="100" value={motionSens} onChange={(e) => setMotionSens(e.target.value)} className="w-full" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><Label>AI Confidence</Label><span className="text-xs text-zinc-400">{aiConf}%</span></div>
              <input type="range" min="0" max="100" value={aiConf} onChange={(e) => setAiConf(e.target.value)} className="w-full" />
            </div>
          </div>
          <Button onClick={handleSaveSettings} disabled={isSavingSettings} className="w-full">Save Changes</Button>
        </DialogContent>
      </Dialog>

      {activeSnapshotUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 p-4">
          <div className="relative w-full h-full max-w-5xl flex items-center justify-center">
            <button onClick={() => {setActiveSnapshotUrl(null); handleZoomChange('snap', 1, 'snapshot');}} className="absolute top-4 right-4 z-50 text-white bg-black/50 p-2 rounded-full hover:bg-red-500"><X className="h-6 w-6" /></button>
            <div 
               className="group relative w-full h-full flex items-center justify-center overflow-hidden cursor-move"
               onMouseDown={(e) => startPan(e, 'snap', 'snapshot')}
               onMouseMove={doPan}
               onMouseUp={endPan}
               onMouseLeave={endPan}
               onTouchStart={(e) => startPan(e, 'snap', 'snapshot')}
               onTouchMove={doPan}
               onTouchEnd={endPan}
            >
               <img src={activeSnapshotUrl} className="max-w-full max-h-[90vh] object-contain pointer-events-none" style={{ transform: `scale(${snapshotZoom.scale}) translate(${snapshotZoom.x}px, ${snapshotZoom.y}px)` }} />
               <ZoomControlsOverlay 
                 scale={snapshotZoom.scale} 
                 onChange={(val) => handleZoomChange('snap', val, 'snapshot')}
                 onReset={() => handleZoomChange('snap', 1, 'snapshot')}
               />
            </div>
          </div>
        </div>
      )}
    </BrowserRouter>
  );
}
