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

- **Stack**: React 18 (CRA), MUI v5, Axios. **No TypeScript, no routing.** (`react-bootstrap` / Bootstrap CSS is still installed but no longer used by `App.js`.)
- **Entry**: `src/index.js` → `src/App.js`
- **Supported Platforms**: YouTube, Facebook, and TikTok URLs validated and sanitized via `validateAndCleanUrl` in `src/App.js`.
- **Output Profiles**: `standard_video` (default), `whatsapp_video`, `audio_m4a` defined in `src/downloadProfiles.js` (labels, extensions, MIME, preview type, progress phrasing).
- **UI & Theme**: Mobile-first dark theme with cinematic radial gradients, Google Fonts (Outfit for headings, DM Sans for body), glassmorphism panels, and GitHub footer links. Responsive breakpoints at 600px (tablet) and 1024px (desktop). Profile radio cards collapse to one column on mobile.
- **Env**: `REACT_APP_API_URL` in `.env` (must use `REACT_APP_` prefix — CRA requirement). Falls back to `http://localhost:8000`.
- **Legacy**: `src/App_old.jsx` is stale — do not edit.

### Module Layout

| File | Responsibility |
|---|---|
| `src/api/downloads.js` | API client (`submitDownload`, `getJob`, `findUpload`, `downloadFile`, `buildDownloadUrl`) + `DownloadApiError` normalization (400/404/429/5xx, blob errors, timeout, cancellation) |
| `src/hooks/useDownloadJob.js` | Download state machine (`PHASES`), polling with jitter/backoff, 15-minute budget, cancel/retry/save, v2 localStorage resume |
| `src/downloadProfiles.js` | Profile metadata, `getOutputProfile`, `describeProgress`, `buildFileName` |
| `src/analytics.js` | `trackDownloadEvent` pushes to `window.dataLayer` (no-op unless a provider is added) |

## Download Flow (Async with Progress Tracking)

1. **POST** `/api/v1/yt/videos-uploaded/` with `{ url, output_profile }` → Returns `202` with `CodecUrls.id`
2. **Poll** `GET /api/v1/yt/videos/<codecurl_id>` every ~1.5s (+ jitter) for status and progress (0-100%). `status`: `1` success, `2` running, `3` error.
3. When `status=1`, find the `VideosUploaded` record by matching `codecurl` via `GET /api/v1/yt/videos-uploaded/` (retries once after 1.5s)
4. User explicitly saves via `GET /api/v1/yt/videos-uploaded/<videouploaded_id>` (blob with progress); preview streams the same URL in `<video>` or `<audio>` based on the profile

### Polling Behavior

- Base interval 1.5s with up to 300ms jitter; reset after every successful poll
- Transient failures (timeout, network, 429, 5xx) do **not** end the job — they set a notice and retry
- 429 doubles the interval up to a 10s cap
- Total budget is **15 minutes**, after which the UI shows a "taking too long" state with retry
- `AbortController` cancels in-flight requests on cancel/unmount; timers are cleared on unmount (Strict Mode safe)

### Timeout Configuration (`src/api/downloads.js`)

| Operation | Timeout | Behavior |
|-----------|---------|----------|
| POST videos-uploaded/ | 60s | Error card / cooldown on 429 |
| GET videos/<id> (poll) | 10s per request | Retry with backoff |
| Total polling duration | 15 minutes | "Taking too long" + retry |
| GET videos-uploaded/ (list) | 10s | Retry/fail |
| GET videos-uploaded/<id> (blob) | 5 minutes | Error shown in result card |

### State Persistence

- Pending jobs use a versioned key `youtube_dl_pending_download:v2` storing `{ version, jobId, profile, sourceUrl, startedAt }`
- Automatically resumes polling on refresh while within the 15-minute budget
- Legacy unversioned key `youtube_dl_pending_download` is removed on mount
- Cleared on success, terminal error, timeout, or cancel; safely wrapped in try/catch

### Analytics Events

`download_submitted { profile }`, `download_finished { profile, seconds }`, `download_failed { profile, status }`, plus `download_cancelled` and `download_timed_out`.

## Quirks

- `src/App.test.js` now covers the real UI (default profile, validation, video/audio previews, 400/429 handling). Do not restore the old CRA boilerplate test.
- **Jest + Axios**: Axios 1.4 ships an ESM `main` that Jest 27 cannot parse. `package.json` maps `^axios$` to `node_modules/axios/dist/node/axios.cjs` via the CRA-supported `jest.moduleNameMapper`. Keep that mapping when touching test config.
- No custom ESLint/Prettier config beyond CRA defaults. No CI pipeline.
- Docker build uses `nginxinc/nginx-unprivileged:1.27-alpine` (see `docker/nginx/default.conf`). `REACT_APP_API_URL` is passed as a build arg — update your `.env` before building.
- **Important**: The frontend expects the backend to provide real-time progress via `GET /api/v1/yt/videos/<id>` (status and progress fields) and the upload lookup via `GET /api/v1/yt/videos-uploaded/` matching `codecurl`.
