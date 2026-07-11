# V380 Pro - Web Client

This is the Frontend user interface for the V380 Pro CCTV monitoring application. It is designed with a "Clean SaaS" aesthetic (Flat, Monochrome, Zinc-950 dark mode) emphasizing a professional and modern enterprise look without visual clutter.

## Features
- **Live View**: View real-time HLS streams from multiple cameras with Digital Zoom and Pan functionalities.
- **AI Alerts**: Receive real-time WebSocket notifications and visual indicators when the backend AI detects objects.
- **Manual Capture**: Instantly take snapshots or record video clips manually. *These are processed entirely client-side and saved directly to your local device downloads folder.*
- **Playback**: Browse and play 24/7 continuous video recording segments synced with AI-detected events.
- **Snapshots Gallery**: Browse high-resolution snapshots captured automatically during motion/AI events.

## Tech Stack
- **Framework**: React 18 (Vite)
- **Styling**: Tailwind CSS (Strictly monochromatic `zinc` palette)
- **UI Components**: Shadcn UI (Radix Primitives)
- **Media Player**: Hls.js
- **Icons**: Google Material Symbols (Outlined)

## Setup & Running

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Development Server**
   ```bash
   npm run dev
   ```
   *Note: This will start the Vite dev server on Port 5173. Ensure the backend server is also running.*

## Deployment
To build the application for production:
```bash
npm run build
```
The output will be placed in the `dist/` directory, ready to be served by any static file server (Nginx, Apache, Vercel, etc.).
