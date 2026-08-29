# youtube-dl-front

## Core Rules

- **CodeGraph Mandatory**: Always use `codegraph` tools over native/own tools to query, explore, and understand the project codebase, symbols, and dependencies. Only fallback to native/own tools if the query is not satisfied by `codegraph`.
- **Documentation Maintenance**: Always update `AGENTS.md` and `README.md` based on new commits, features, or architectural changes to keep documentation synchronized and up to date.

## Commands (use yarn, not npm)

| Command | Action |
|---|---|
| `yarn start` | Dev server on :3000 |
| `yarn build` | Production build to `build/` |
| `yarn test` | Jest watch mode (CRA default) |
| `docker compose up -d` | Production container on :3012 |

## Architecture & Features

- **Stack**: React 18 (CRA), MUI v5, react-bootstrap, Axios. **No TypeScript, no routing.**
- **Entry**: `src/index.js` → `src/App.js`
- **Supported Platforms**: YouTube, Facebook, and TikTok URLs validated and sanitized via `validateAndCleanUrl` in `src/App.js`.
- **UI & Theme**: Mobile-first dark theme with cinematic radial gradients, Google Fonts (Outfit for headings, DM Sans for body), glassmorphism panels, and GitHub footer links. Responsive breakpoints at 600px (tablet) and 1024px (desktop).
- **Env**: `REACT_APP_API_URL` in `.env` (must use `REACT_APP_` prefix — CRA requirement). Falls back to `http://localhost:8000`.
- **Legacy**: `src/App_old.jsx` is stale — do not edit.

## Download Flow (Async with Progress Tracking)

The frontend uses a **polling-based progress tracking** system:

1. **POST** `/api/v1/yt/videos-uploaded/` → Returns `202` with `CodecUrls.id`
2. **Poll** `GET /api/v1/yt/videos/<codecurl_id>` every 2 seconds for status and progress (0-100%)
3. When `status=1` (SUCCESS), find `VideosUploaded` record by filtering `GET /api/v1/yt/videos-uploaded/`
4. **Download** file via `GET /api/v1/yt/videos-uploaded/<videouploaded_id>` with progress tracking

### Timeout Configuration

| Operation | Timeout | Behavior |
|-----------|---------|----------|
| POST videos-uploaded/ | 60s | Show error popover |
| GET videos/<id> (poll) | 10s per request | Skip to next poll |
| Total polling duration | 5 minutes | Show timeout error |
| GET videos-uploaded/ (list) | 10s | Show error |
| GET videos-uploaded/<id> (blob) | 5 minutes | Show timeout error |

### State Persistence

- Pending downloads are saved to `localStorage` with key `youtube_dl_pending_download`
- Automatically resumes polling on page refresh if within 5-minute timeout
- Cleared on success, error, or cancel

### Key Functions in App.js

- `pollProgress(codecUrlId, startTime)` - Polls backend for download progress
- `fetchCompletedVideo(codecUrlId)` - Finds VideosUploaded record after download completes
- `downloadVideoFile(videoUploadedId)` - Downloads file with progress tracking
- `handleCancel()` - Stops polling and clears state

## Quirks

- The default `App.test.js` checks for "learn react" text that no longer exists in the current `App.js` — test will fail. Update or remove if changing tests.
- No custom ESLint/Prettier config beyond CRA defaults. No CI pipeline.
- Docker build uses `nginxinc/nginx-unprivileged:1.27-alpine` (see `docker/nginx/default.conf`). `REACT_APP_API_URL` is passed as a build arg — update your `.env` before building.
- **Important**: The frontend expects the backend to provide real-time progress via `GET /api/v1/yt/videos/<id>` endpoint (status and progress fields).
