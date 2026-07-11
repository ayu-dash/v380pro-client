import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export default function Snapshots() {
  const {
    cameras,
    snapshotCamId, setSnapshotCamId,
    snapshotDate, setSnapshotDate,
    snapshots,
    snapshotsLoading,
    loadSnapshots, handleDeleteSnapshot, openSnapshotModal
  } = useOutletContext();

  useEffect(() => {
    loadSnapshots();
  }, [snapshotCamId, snapshotDate, loadSnapshots]);

  return (
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
  );
}
