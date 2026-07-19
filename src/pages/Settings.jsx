import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Trash2 } from 'lucide-react';

export default function Settings() {
  const {
    cameras,
    newCamName, setNewCamName,
    newCamUrl, setNewCamUrl,
    newOnvifPort, setNewOnvifPort,
    newOnvifUser, setNewOnvifUser,
    newOnvifPass, setNewOnvifPass,
    scanning,
    discoveredDevices,
    handleAddCamera, handleScan, handleDeleteCamera
  } = useOutletContext();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
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
            <div className="border-t border-zinc-800 pt-4 mt-2">
              <p className="text-xs text-zinc-500 mb-3">ONVIF PTZ (optional)</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label>ONVIF Port</Label>
                  <Input type="number" value={newOnvifPort} onChange={e => setNewOnvifPort(e.target.value)} placeholder="8899" />
                </div>
                <div className="space-y-1">
                  <Label>ONVIF User</Label>
                  <Input value={newOnvifUser} onChange={e => setNewOnvifUser(e.target.value)} placeholder="admin" />
                </div>
                <div className="space-y-1">
                  <Label>ONVIF Pass</Label>
                  <Input type="password" value={newOnvifPass} onChange={e => setNewOnvifPass(e.target.value)} placeholder="password" />
                </div>
              </div>
            </div>
            <Button onClick={handleAddCamera}>Add Camera</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manage Cameras</CardTitle>
            <CardDescription>View and delete registered cameras</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {cameras.length === 0 ? (
                <p className="text-sm text-zinc-500">No cameras registered.</p>
              ) : (
                cameras.map(cam => (
                  <div key={cam.id} className="flex justify-between items-center p-3 border border-zinc-800 rounded-md bg-zinc-900 text-sm">
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-zinc-200 truncate">{cam.name}</span>
                      <span className="text-xs text-zinc-500 font-mono truncate">{cam.id}</span>
                    </div>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="text-zinc-400 hover:text-red-500 hover:bg-red-500/10 h-8 w-8" 
                      onClick={() => handleDeleteCamera(cam.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="flex flex-col h-full">
        <CardHeader>
          <CardTitle>Auto-Discovery</CardTitle>
          <CardDescription>Scan local network for RTSP cameras</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0">
          <Button variant="secondary" onClick={handleScan} disabled={scanning} className="w-full">
            {scanning ? 'Scanning...' : 'Scan Network'}
          </Button>
          <div className="mt-4 space-y-2 flex-1 overflow-y-auto max-h-[340px] pr-1">
            {discoveredDevices.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-4">No devices discovered yet. Click Scan.</p>
            ) : (
              discoveredDevices.map((d, index) => (
                <div key={index} className="flex justify-between items-center p-3 border border-zinc-800 rounded-md bg-zinc-900 text-sm">
                  <span>{d.name || 'Unknown'} <span className="text-zinc-500 text-xs">({d.ip})</span></span>
                  <Button size="sm" variant="outline" onClick={() => { setNewCamUrl(`rtsp://admin:password@${d.ip}:554/live/ch00_1`); setNewCamName('New Camera'); }}>Use</Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
