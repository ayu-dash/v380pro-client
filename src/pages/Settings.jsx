import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export default function Settings() {
  const {
    newCamName, setNewCamName,
    newCamUrl, setNewCamUrl,
    scanning,
    discoveredDevices,
    handleAddCamera, handleScan
  } = useOutletContext();

  return (
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
  );
}
