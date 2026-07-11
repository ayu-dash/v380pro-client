import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Video,
  RotateCcw,
  Image as ImageIcon,
  Settings,
  HardDrive,
  LogOut,
  PlusCircle,
  Scan,
  Volume2,
  VolumeX,
  Maximize,
  Sliders,
  Trash2,
  Search,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  Play,
  Download,
  AlertCircle,
  X,
  Menu
} from 'lucide-react';
import Hls from 'hls.js';

// Import Shadcn UI Components
import { Button } from './components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './components/ui/dialog';
import { Sheet } from './components/ui/sheet';

export default function App() {
  const [activeTab, setActiveTab] = useState('live');
  const [authenticated, setAuthenticated] = useState(null); // null means checking
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      const res = await fetch('/api/check-auth');
      const data = await res.json();
      setAuthenticated(data.authenticated);
      if (data.authenticated) {
        fetchCameras();
        fetchStorageInfo();
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
      }, 300000);
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
        body: JSON.stringify({ name: newCamName, url: newCamUrl, status: 'online' })
      });
      if (res.ok) {
        setNewCamName('');
        setNewCamUrl('');
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
  const loadSnapshots = async () => {
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
  };

  const handleDeleteSnapshot = async (e, file) => {
    e.stopPropagation();
    if (!confirm('Hapus foto ini?')) return;
    try {
      await fetch(`/api/snapshots/${snapshotCamId}/${file.name}`, { method: 'DELETE' });
      loadSnapshots();
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (activeTab === 'snapshots') {
      loadSnapshots();
    }
  }, [activeTab, snapshotCamId, snapshotDate]);

  useEffect(() => {
    if (activeTab === 'playback') {
      loadPlaybackFiles();
    }
  }, [activeTab, playbackCamId, playbackDate]);

  const loadPlaybackFiles = async () => {
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
  };

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
      const logs = await res.json();
      const parts = recFile.name.replace('.mp4', '').split('_');
      const startStr = `${parts[0]} ${parts[1].replace(/-/g, ':')}`;
      const segmentStart = new Date(startStr).getTime();
      const parsedLogs = logs.map(l => ({
        ...l,
        relSecs: (new Date(l.time).getTime() - segmentStart) / 1000
      })).filter(l => l.relSecs >= 0 && l.relSecs <= 300);
      setPlaybackDetections(parsedLogs);
    } catch (e) { }
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
    const active = playbackDetections.find(l => Math.abs(l.relSecs - currentSecs) < 1.5);
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

  const ZoomControlsOverlay = ({ scale, onChange, onReset }) => (
    <div 
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-zinc-900/90 border border-zinc-700 px-1 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xl" 
      onMouseDown={(e) => e.stopPropagation()} 
      onTouchStart={(e) => e.stopPropagation()}
    >
      <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-300 hover:text-white rounded-full" onClick={() => onChange(Math.max(1, scale - 0.5))}><span className="material-symbols-outlined text-[18px]">remove</span></Button>
      <span className="text-xs font-mono w-12 text-center text-zinc-200">{Math.round(scale * 100)}%</span>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-300 hover:text-white rounded-full" onClick={() => onChange(Math.min(5, scale + 0.5))}><span className="material-symbols-outlined text-[18px]">add</span></Button>
      <div className="w-px h-4 bg-zinc-700 mx-1" />
      <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white rounded-full" onClick={onReset}><span className="material-symbols-outlined text-[16px]">restart_alt</span></Button>
    </div>
  );

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

  const startHlsStream = (cam, videoElement, retryCount = 0) => {
    if (!videoElement) return;
    const hlsUrl = `http://${window.location.hostname}:8888/${cam.id}/index.m3u8`;
    if (hlsInstancesRef.current[cam.id]) {
      hlsInstancesRef.current[cam.id].destroy();
      delete hlsInstancesRef.current[cam.id];
    }
    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true, liveSyncDuration: 2 });
      hlsInstancesRef.current[cam.id] = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(videoElement);
      hls.on(Hls.Events.MANIFEST_PARSED, () => videoElement.play().catch(() => { }));
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          hls.destroy();
          delete hlsInstancesRef.current[cam.id];
          if (retryCount < 10) {
            setTimeout(() => {
              const currentVideo = document.getElementById(`video-${cam.id}`);
              if (currentVideo) startHlsStream(cam, currentVideo, retryCount + 1);
            }, 5000);
          }
        }
      });
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      videoElement.src = hlsUrl;
      videoElement.play().catch(() => { });
    }
  };

  useEffect(() => {
    if (activeTab === 'live' && cameras.length > 0) {
      cameras.forEach(cam => {
        const video = document.getElementById(`video-${cam.id}`);
        if (video) startHlsStream(cam, video);
      });
    }
    return () => {
      Object.keys(hlsInstancesRef.current).forEach(id => hlsInstancesRef.current[id].destroy());
      hlsInstancesRef.current = {};
    };
  }, [activeTab, cameras]);

  const onSwitchTab = (tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  }

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-3 pb-6 mb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-sm font-bold text-zinc-50 leading-none tracking-tight">V380Pro Web Client</h1>
        </div>
      </div>

      <nav className="space-y-1">
        <ul className="space-y-1">
          {[
            { id: 'live', icon: 'videocam', label: 'Live View' },
            { id: 'playback', icon: 'history', label: 'Playback' },
            { id: 'snapshots', icon: 'image', label: 'Snapshots' },
            { id: 'settings', icon: 'settings', label: 'Settings' }
          ].map((tab) => (
            <li
              key={tab.id}
              onClick={() => onSwitchTab(tab.id)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition text-sm font-medium ${activeTab === tab.id
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white'
                }`}
            >
              <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8 mb-4">
        <div className="flex justify-between text-xs text-zinc-400 mb-2">
          <span>Storage</span>
          <span className="font-mono">{storageInfo.percent}</span>
        </div>
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mb-1">
          <div className="h-full bg-zinc-300 rounded-full transition-all" style={{ width: storageInfo.percent }} />
        </div>
        <div className="text-[10px] text-zinc-500 text-right">{storageInfo.used} / {storageInfo.total}</div>
      </div>

      <div className="mt-6 flex-1 overflow-y-auto">
        <p className="text-xs font-semibold text-zinc-500 mb-2">Cameras</p>
        <div className="space-y-1 pr-1">
          {cameras.length === 0 ? (
            <div className="text-xs text-zinc-600">No cameras</div>
          ) : (
            cameras.map(c => (
              <div key={c.id} className="flex items-center justify-between p-2 rounded-md text-xs text-zinc-300 group">
                <span className="flex items-center gap-2 truncate">
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${c.status === 'online' ? 'bg-zinc-300' : 'bg-red-500'}`} />
                  {c.name}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-zinc-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-400 hover:text-white w-full rounded-md"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Logout
        </button>
      </div>
    </>
  );

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

  return (
    <div className="flex h-[100dvh] w-full bg-zinc-950 text-zinc-50 font-sans overflow-hidden">

      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <div className="flex flex-col h-full"><SidebarContent /></div>
      </Sheet>

      <aside className="w-[240px] border-r border-zinc-800 bg-zinc-950 flex-col p-6 shrink-0 hidden md:flex">
        <SidebarContent />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-zinc-950">
        <header className="flex items-center justify-between px-4 md:px-8 h-16 border-b border-zinc-800 shrink-0 sticky top-0 bg-zinc-950/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white">
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold capitalize">{activeTab}</h2>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">

          {/* LIVE VIEW */}
          {activeTab === 'live' && (
            <div className="camera-grid">
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
                          <video
                            id={`video-${cam.id}`}
                            crossOrigin="anonymous"
                            muted={isMuted}
                            autoPlay
                            playsInline
                            onPlaying={() => setLiveLoadingStates(prev => ({ ...prev, [cam.id]: false }))}
                            onWaiting={() => setLiveLoadingStates(prev => ({ ...prev, [cam.id]: true }))}
                            className="w-full h-full object-contain pointer-events-none"
                            style={{ transform: `scale(${zoom.scale}) translate(${zoom.x}px, ${zoom.y}px)` }}
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

                          <div className="absolute top-2 right-2 flex gap-1 z-20">
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

                          {detections.map((d, index) => {
                            const [x, y, w, h] = d.bbox;
                            return (
                              <div
                                key={index}
                                className="detection-box border-red-500 bg-red-500/10"
                                style={{
                                  left: `${(x / 640) * 100}%`, top: `${(y / 360) * 100}%`,
                                  width: `${(w / 640) * 100}%`, height: `${(h / 360) * 100}%`,
                                  transform: `scale(${zoom.scale}) translate(${zoom.x}px, ${zoom.y}px)`
                                }}
                              >
                                <span className="box-label bg-red-500">{d.class}</span>
                              </div>
                            );
                          })}
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
          )}

          {/* PLAYBACK VIEW */}
          {activeTab === 'playback' && (
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
                  <video id="playbackPlayer" controls onTimeUpdate={handlePlaybackTimeUpdate} className="w-full h-full object-contain" style={{ transform: `scale(${playbackZoom.scale}) translate(${playbackZoom.x}px, ${playbackZoom.y}px)` }} />
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
          )}

          {/* SNAPSHOTS VIEW */}
          {activeTab === 'snapshots' && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={snapshotCamId}
                  onChange={(e) => setSnapshotCamId(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-md text-sm outline-none flex-1"
                >
                  {cameras.length === 0 && <option value="">No cameras</option>}
                  {cameras.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Input type="date" value={snapshotDate} onChange={(e) => setSnapshotDate(e.target.value)} className="w-full sm:w-auto" />
                <Button onClick={loadSnapshots} variant="secondary">Refresh</Button>
              </div>

              {snapshotsLoading ? (
                <div className="text-center p-8 text-zinc-500">Memuat foto...</div>
              ) : snapshots.length === 0 ? (
                <div className="text-center p-8 text-zinc-500">Belum ada foto.</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {snapshots.map(snap => (
                    <Card key={snap.name} className="overflow-hidden bg-zinc-900 border-zinc-800 cursor-pointer hover:border-zinc-600 transition group relative" onClick={() => openSnapshotModal(snap.url)}>
                      <div className="aspect-video relative">
                        <img src={snap.url} className="w-full h-full object-cover" loading="lazy" />
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500/80 transition-opacity" onClick={(e) => handleDeleteSnapshot(e, snap)}>
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </Button>
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-zinc-400">{snap.time}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SETTINGS VIEW */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Add Camera</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input value={newCamName} onChange={e => setNewCamName(e.target.value)} placeholder="Camera Name" />
                  </div>
                  <div className="space-y-1">
                    <Label>RTSP URL</Label>
                    <Input value={newCamUrl} onChange={e => setNewCamUrl(e.target.value)} placeholder="rtsp://..." />
                  </div>
                  <Button onClick={handleAddCamera}>Add Camera</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Auto-Discovery</CardTitle>
                  <CardDescription>Scan local network for RTSP cameras</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="secondary" onClick={handleScan} disabled={scanning}>{scanning ? 'Scanning...' : 'Scan Network'}</Button>
                  <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                    {discoveredDevices.map((d, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border border-zinc-800 rounded-md bg-zinc-900 text-sm">
                        <span>{d.name || 'Unknown'} <span className="text-zinc-500 text-xs">({d.ip})</span></span>
                        <Button size="sm" variant="outline" onClick={() => { setNewCamUrl(`rtsp://admin:password@${d.ip}:554/live/ch00_1`); setNewCamName('New Camera'); }}>Use</Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

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

    </div>
  );
}
