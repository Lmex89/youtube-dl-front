# YouTube Video Downloader Frontend

A modern, responsive web interface for downloading YouTube videos. Built with **React 18** and **Material-UI**, this frontend application validates YouTube URLs, communicates with a backend API to process video downloads, and provides an intuitive user experience with real-time feedback.

![React](https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react)
![MUI](https://img.shields.io/badge/MUI-v5-007FFF?logo=mui)
![License](https://img.shields.io/badge/License-MIT-green.svg)

---

## Table of Contents

- [Features](#features)
- [Demo](#demo)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Development](#development)
- [Production Build](#production-build)
- [Docker Deployment](#docker-deployment)
- [API Integration](#api-integration)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [Browser Support](#browser-support)

---

## Features

- **Multi-Platform URL Validation**: Smart regex-based validation accepting YouTube, Facebook, and TikTok video URLs
- **Clean URL Sanitization**: Automatically extracts and normalizes video IDs from messy URLs
- **Output Profiles**: Choose between Standard MP4 (default), WhatsApp Video (≤16 MiB), and Audio Only (M4A)
- **Real-time Progress Tracking**: Polls backend every ~1.5 seconds (with jitter) for real progress (0-100%)
- **Resilient Polling**: Transient timeouts, network errors, 429s, and 5xx responses retry with backoff instead of failing the job
- **Deterministic Progress Bar**: Shows actual download percentage with MUI LinearProgress component
- **Configurable Timeouts**: 60s submit, 10s per poll, 5min file download, 15min total polling budget
- **State Persistence**: Versioned localStorage record resumes downloads on page refresh within the 15-minute budget
- **Cancel / Retry**: Stop polling or resubmit at any time; stuck jobs offer a retry action
- **Profile-Aware Preview**: `<video>` for MP4 profiles and `<audio>` for M4A, streamed from the download endpoint
- **Profile-Aware Save**: Explicit "Save" button downloads the blob with progress and the correct `.mp4`/`.m4a` filename
- **Mobile-First Dark Theme**: Cinematic dark radial UI with Google Fonts (Outfit + DM Sans), glassmorphism panels, and GitHub footer links
- **Responsive Design**: Mobile-first CSS with breakpoints at 600px and 1024px, stacked buttons on mobile with 48px touch targets
- **Accessible UI**: Inline validation with `role="alert"`, radiogroup profile cards, live progress announcements, visible focus, and reduced-motion support
- **Docker Support**: Multi-stage Dockerfile with health checks and nginx serving

### Output Profiles

| Profile | Label | Output | MIME | Notes |
|---------|-------|--------|------|-------|
| `standard_video` | Standard MP4 | `.mp4` | `video/mp4` | Default; best quality |
| `whatsapp_video` | WhatsApp Video | `.mp4` | `video/mp4` | Re-encoded for WhatsApp Cloud API, ≤16 MiB |
| `audio_m4a` | Audio Only | `.m4a` | `audio/mp4` | Audio-only extraction |

### Supported URL Formats

#### YouTube
```
https://www.youtube.com/watch?v=VIDEO_ID
https://youtu.be/VIDEO_ID
https://youtube.com/shorts/VIDEO_ID
https://www.youtube.com/embed/VIDEO_ID
```

#### Facebook
```
https://www.facebook.com/watch?v=VIDEO_ID
https://fb.watch/VIDEO_ID
```

#### TikTok
```
https://www.tiktok.com/@user/video/VIDEO_ID
https://vm.tiktok.com/VIDEO_ID
```

---

## Demo

The application provides a simple, focused interface:

1. **Input Field**: Enter any valid YouTube, Facebook, or TikTok URL
2. **Profile Selector**: Pick Standard MP4, WhatsApp Video, or Audio Only
3. **Download Button**: Validates URL and initiates backend processing (disabled during a job or 429 cooldown)
4. **Progress Card**: Live phase text and percentage (0-100%) with a cancel action
5. **Result Card**: Profile-aware `<video>` or `<audio>` preview plus a Save button with download progress
6. **Error / Timeout Cards**: Clear messages with retry for failed jobs, missing records, and 15-minute timeouts
7. **Clear Button**: Clears the form and resets the state

---

## Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | React 18 (Create React App) | UI component library |
| **Language** | JavaScript (ES6+) | Application logic |
| **Styling** | Material-UI v5 + custom CSS + Google Fonts | Component styling, typography, and responsive layout (Bootstrap CSS remains imported but is not used by the app) |
| **HTTP Client** | Axios | API communication |
| **Build Tool** | react-scripts 5.0.1 | Development and production builds |
| **Icons** | @mui/icons-material | UI iconography |
| **Testing** | Jest + React Testing Library | Unit and integration testing |

### Key Components

| Component | Library | Purpose |
|-----------|---------|---------|
| `ThemeProvider` | MUI | Dark theme configuration |
| `LinearProgress` | MUI | Deterministic progress bars (job and file save) |
| `Button` | MUI | Action buttons with variants |
| Profile radio cards | Native inputs + CSS | Accessible output-profile selection with `fieldset`/`legend` |
| Status / result cards | React + CSS | Progress, success, error, and timeout states with inline `role="alert"` messaging |

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 18.x or higher (recommended: 22.x)
- **Yarn**: Version 1.22.x or higher
- **Docker** (optional): For containerized deployment
- **Docker Compose** (optional): For orchestrated deployment

### Verify Installation

```bash
node --version    # Should be v18+ or v22+
yarn --version    # Should be 1.22+
docker --version  # Optional, for containerized deployment
```

---

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd youtube-dl-front
```

### 2. Install Dependencies

This project uses **Yarn** as its package manager:

```bash
yarn install
```

The installation will download all required packages including:
- React 18 and React DOM
- Material-UI core, icons, and styles
- Axios for HTTP requests
- Bootstrap and react-bootstrap (legacy, not used by the current UI)
- Testing utilities

---

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Backend API URL (REQUIRED - must use REACT_APP_ prefix)
REACT_APP_API_URL=https://your-api.example.com

# Node environment (optional)
NODE_ENV=production
```

> **Important**: Create React App requires all environment variables to use the `REACT_APP_` prefix. Variables without this prefix will be ignored.

### Default Configuration

If no environment variables are set, the application defaults to:
- **API URL**: `http://localhost:8000`
- **Environment**: Based on `NODE_ENV`

---

## Development

### Start Development Server

```bash
yarn start
```

This command:
- Starts the development server on [http://localhost:3000](http://localhost:3000)
- Enables hot module replacement (HMR) for instant updates
- Opens your default browser automatically
- Watches for file changes and reloads automatically

### Available Scripts

| Command | Description |
|---------|-------------|
| `yarn start` | Start development server with hot reload |
| `yarn build` | Create optimized production build |
| `yarn test` | Run tests in interactive watch mode |
| `yarn test --coverage` | Run tests with coverage report |
| `yarn eject` | Eject from Create React App (irreversible) |

### Development Mode Features

When running in development mode (`NODE_ENV=development`):
- Environment variables are logged to console
- React StrictMode is enabled for detecting potential problems
- Source maps are generated for debugging
- Web Vitals metrics are logged

---

## Production Build

### Create Production Build

```bash
yarn build
```

This creates an optimized production build in the `build/` directory:
- Minified JavaScript and CSS
- Optimized images and assets
- Content hashed filenames for cache busting
- Source maps for debugging (if configured)

### Serve Production Build Locally

```bash
npx serve -s build -l 3000
```

---

## Docker Deployment

### Overview

The project includes a multi-stage Dockerfile that:
1. **Build Stage**: Uses Node.js 22 Alpine to compile the React app
2. **Runtime Stage**: Uses nginx unprivileged Alpine to serve static files

### Docker Configuration Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build definition |
| `docker-compose.yaml` | Service orchestration |
| `docker/nginx/default.conf` | Nginx server configuration |

### Quick Start with Docker

```bash
# Build and start with docker-compose
docker compose build
docker compose up -d
```

The application will be available at [http://localhost:3012](http://localhost:3012).

### Docker Commands

```bash
# Build the image
docker compose build

# Start services in background
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Rebuild and restart
docker compose up -d --build
```

### Docker Configuration Details

#### Build Arguments

The Dockerfile accepts `REACT_APP_API_URL` as a build argument:

```yaml
# docker-compose.yaml
services:
  web-youtube:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - REACT_APP_API_URL=https://your-api.example.com
```

> **Note**: Environment variables must be set at build time for Create React App, not runtime.

#### Nginx Configuration

The nginx server:
- Listens on port 3000
- Serves static files from `/usr/share/nginx/html`
- Provides a `/health` endpoint for container health checks
- Handles client-side routing with `try_files`

#### Health Checks

The container includes a health check that pings the `/health` endpoint every 30 seconds.

---

## API Integration

The frontend communicates with a backend API to process YouTube downloads using an **async polling-based progress tracking** system.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/yt/videos-uploaded/` | Submit URL for processing (returns 202 with codecurl ID) |
| GET | `/api/v1/yt/videos/<codecurl_id>` | Poll for download status and progress (0-100%) |
| GET | `/api/v1/yt/videos-uploaded/` | List all completed downloads |
| GET | `/api/v1/yt/videos-uploaded/<videouploaded_id>` | Download processed video file |

### Request Flow (Async with Progress Tracking)

1. **URL Submission** (POST)
   ```javascript
   POST /api/v1/yt/videos-uploaded/
   Content-Type: application/json
   
   {
     "url": "https://www.youtube.com/watch?v=VIDEO_ID",
     "output_profile": "standard_video"
   }
   ```
   
   Response (202 Accepted):
   ```json
   {
     "id": "codecurl-uuid",
     "status": "pending",
     "url": "https://...",
     "output_profile": "standard_video"
   }
   ```
   
   `output_profile` is optional and defaults to `standard_video`; the UI always sends the selected profile.

2. **Progress Polling** (GET)
   ```javascript
   GET /api/v1/yt/videos/<codecurl_id>
   ```
   
   Response:
   ```json
   {
     "id": "codecurl-uuid",
     "url": "https://...",
     "output_profile": "standard_video",
     "status": 2,           // 1=SUCCESS, 2=PENDING, 3=ERROR
     "progress": 45.7,      // 0.0-100.0 (real yt-dlp progress)
     "created_at": "...",
     "updated_at": "...",
     "visible": true
   }
   ```
   
   - Polls every ~1.5 seconds (plus up to 300ms jitter)
   - Updates progress bar with real percentage and profile-aware phase text
   - Stops when status=1 (SUCCESS) or status=3 (ERROR)
   - Transient failures (timeout, network, 429, 5xx) set a notice and retry; 429 doubles the interval up to 10s

3. **Fetch Completed Video** (GET)
   ```javascript
   GET /api/v1/yt/videos-uploaded/
   ```
   
   - Filters results to find the `VideosUploaded` record whose `codecurl` matches the job id
   - Retries the lookup once after 1.5s when the record is not visible yet
   - Retrieves `VideosUploaded.id` for preview and file download

4. **File Preview / Download** (GET)
   ```javascript
   GET /api/v1/yt/videos-uploaded/<videouploaded_id>
   ```
   
   - Preview streams the endpoint directly in `<video>` (MP4) or `<audio>` (M4A)
   - Saving downloads the blob with axios `onDownloadProgress` and the profile extension

### Timeout Configuration

| Operation | Timeout | Behavior |
|-----------|---------|----------|
| POST videos-uploaded/ | 60 seconds | Error card; 429 starts a 60s submit cooldown |
| GET videos/<id> (poll) | 10 seconds per request | Retry with backoff |
| Total polling duration | 15 minutes | "Taking too long" card with retry |
| GET videos-uploaded/ (list) | 10 seconds | Retry, then error |
| GET videos-uploaded/<id> (blob) | 5 minutes | Error shown inside the result card |

### State Persistence

- Pending jobs are saved to `localStorage` under the versioned key `youtube_dl_pending_download:v2` as `{ version, jobId, profile, sourceUrl, startedAt }`
- Automatically resumes polling on page refresh while within the 15-minute budget
- The legacy `youtube_dl_pending_download` key is removed on mount
- Cleared on success, terminal error, timeout, or cancel; all storage access is wrapped in try/catch

### Analytics

`src/analytics.js` pushes events to `window.dataLayer` (a no-op until an analytics provider is added):

- `download_submitted { profile }`
- `download_finished { profile, seconds }`
- `download_failed { profile, status }`
- `download_cancelled`, `download_timed_out`

### Error Handling

The application handles various error scenarios:
- **Invalid URLs**: Inline validation error next to the input (`role="alert"`, `aria-invalid`)
- **400 Bad Request**: Shows the backend error plus the list of allowed profiles
- **Rate Limit (429)**: Submit shows a ~60s cooldown and disables the button; polling backs off instead
- **Timeout / Network**: Keeps the job alive, shows a retry notice, and respects the 15-minute budget
- **Download Failures**: Shows a failure card with a retry action (status=3 or terminal HTTP errors)
- **Stuck Jobs**: After 15 minutes the UI stops polling and offers a retry

---

## Project Structure

```
youtube-dl-front/
├── public/                     # Static assets
│   ├── index.html             # HTML template
│   ├── manifest.json          # PWA manifest
│   ├── favicon.ico            # Favicon
│   └── logo*.png              # App icons
├── src/                       # Source code
│   ├── api/
│   │   ├── downloads.js      # API client + error normalization
│   │   └── downloads.test.js # API client tests
│   ├── hooks/
│   │   ├── useDownloadJob.js     # Submit/poll/resolve/save state machine
│   │   └── useDownloadJob.test.js
│   ├── App.js                # Main application component
│   ├── App.css               # Application styles
│   ├── App.test.js           # UI integration tests
│   ├── downloadProfiles.js   # Output profile metadata + helpers
│   ├── downloadProfiles.test.js
│   ├── analytics.js          # dataLayer analytics adapter
│   ├── index.js              # Application entry point
│   ├── index.css             # Global styles (focus, reduced motion)
│   ├── config.js             # Configuration management
│   ├── App_old.jsx           # Legacy file (do not edit)
│   └── reportWebVitals.js    # Performance monitoring
├── docker/                    # Docker configuration
│   └── nginx/
│       └── default.conf       # Nginx server config
├── .env                       # Environment variables
├── .gitignore                # Git ignore rules
├── Dockerfile                # Docker build definition
├── docker-compose.yaml       # Docker Compose configuration
├── package.json              # Project dependencies
├── yarn.lock                 # Yarn lock file
└── README.md                 # Project documentation
```

### Source Code Organization

| File | Responsibility |
|------|---------------|
| `src/index.js` | React application bootstrap, imports Bootstrap CSS |
| `src/App.js` | URL validation, profile selection, and rendering of progress/result/error states |
| `src/api/downloads.js` | `submitDownload`, `getJob`, `findUpload`, `downloadFile`, `buildDownloadUrl`, and `DownloadApiError` normalization |
| `src/hooks/useDownloadJob.js` | Download state machine: submit → poll → resolve → preview/save, cancel/retry, 15-minute budget, v2 persistence |
| `src/downloadProfiles.js` | Profile labels, extensions, MIME types, preview type, progress phrasing, file names |
| `src/analytics.js` | `trackDownloadEvent` pushes to `window.dataLayer` |
| `src/config.js` | Environment variable handling with fallbacks |
| `src/App.css` | Custom CSS styles |
| `src/reportWebVitals.js` | Web Vitals performance tracking |

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API base URL | `https://api.example.com` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |

### Build-Time vs Runtime

> **Critical**: Create React App embeds environment variables at **build time**, not runtime. This means:
> - You must set `REACT_APP_API_URL` before running `yarn build` or `docker build`
> - Changing the API URL requires a rebuild
> - Docker containers cannot change the API URL at runtime

### Environment-Specific Configuration

#### Development
```env
REACT_APP_API_URL=http://localhost:8000
NODE_ENV=development
```

#### Production (Docker)
```env
REACT_APP_API_URL=https://your-production-api.com
NODE_ENV=production
```

---

## Troubleshooting

### Common Issues

#### 1. Tests Failing to Parse Axios

**Problem**: `SyntaxError: Cannot use import statement outside a module` pointing at `node_modules/axios/index.js`.

**Cause**: Axios 1.4 ships an ESM `main` entry that Jest 27 (CRA 5) cannot parse.

**Solution**: `package.json` maps axios to its CJS build through the CRA-supported Jest override:
```json
"jest": {
  "moduleNameMapper": {
    "^axios$": "<rootDir>/node_modules/axios/dist/node/axios.cjs"
  }
}
```
Keep this mapping when changing test configuration. Run the suite with `CI=true yarn test --watchAll=false`.

#### 2. API Not Found

**Problem**: Application shows network errors when trying to download.

**Solutions**:
- Verify `REACT_APP_API_URL` is set correctly in `.env`
- Ensure the backend API is running and accessible
- Check browser console for CORS errors
- Verify network connectivity from browser to API

#### 3. Docker Build Fails

**Problem**: Docker build fails with "Cannot find module" errors.

**Solutions**:
- Ensure `yarn.lock` is committed to version control
- Run `yarn install` locally before building
- Check that `docker-compose.yaml` has correct build args

#### 4. Environment Variables Not Working

**Problem**: App uses default `localhost:8000` instead of configured API URL.

**Solutions**:
- Ensure variable uses `REACT_APP_` prefix
- Restart development server after changing `.env`
- For Docker, rebuild the image with new build args
- Check browser console for environment variable logs (in development)

### Debug Mode

Enable debug logging by setting `NODE_ENV=development`:

```bash
# Development mode automatically logs config
yarn start

# Or explicitly set
NODE_ENV=development yarn start
```

This will log environment variables and configuration to the browser console.

---

## Browser Support

This application supports modern browsers:

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 80+ |
| Firefox | 75+ |
| Safari | 13+ |
| Edge | 80+ |

### Polyfills

No additional polyfills are required as Create React App includes the necessary Babel transformations for supported browsers.

---

## Development Notes

### Code Style

- This project uses **JavaScript** (not TypeScript)
- No custom ESLint/Prettier configuration - uses Create React App defaults
- No routing - single-page application with one main view

### Legacy Files

- `src/App_old.jsx`: Stale legacy file, do not edit or reference

### Performance Considerations

- Previews stream the download endpoint directly; only explicit saves fetch the blob, then revoke the object URL after 60s
- Polling schedules the next request only after the previous one settles, so slow responses never stack up
- Busy phases disable the form to prevent duplicate requests
- All timers and in-flight requests are aborted on unmount/cancel (Strict Mode safe)
- Web Vitals monitoring is enabled for performance tracking

### Security

- URL validation prevents arbitrary URL submissions
- All API calls use HTTPS in production
- localStorage stores only job id, profile, source URL, and timestamp (no tokens or file contents)

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is open source and available under the MIT License.

---

## Support

For issues, questions, or contributions, please open an issue in the repository.

---

**Built with ❤️ by Lmex89**
