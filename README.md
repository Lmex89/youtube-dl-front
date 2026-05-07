# youtube-dl-front

Frontend for downloading YouTube videos. Validates YouTube URLs, sends them to a backend API, and downloads the resulting video file.

Built with **React 18** (Create React App), **MUI v5**, **react-bootstrap**, and **Axios**. No TypeScript, no routing.

## Quick Start

```bash
yarn install
yarn start
```

Opens at [http://localhost:3000](http://localhost:3000).

## Scripts

| Command       | Description                       |
|---------------|-----------------------------------|
| `yarn start`  | Dev server with hot reload        |
| `yarn build`  | Production build to `build/`      |
| `yarn test`   | Run tests (Jest watch mode)       |

## Configuration

Set the backend API URL via `REACT_APP_API_URL` in `.env` (must use `REACT_APP_` prefix — CRA requirement):

```
REACT_APP_API_URL=https://your-api.example.com
```

Defaults to `http://localhost:8000`.

## Docker

```bash
docker compose up -d
```

Serves the production build on [http://localhost:3012](http://localhost:3012).

## API

The app communicates with a backend API at `{API_URL}/api/v1/yt/videos-uploaded/`:

1. **POST** `/api/v1/yt/videos-uploaded/` — Sends a cleaned YouTube URL, receives video metadata with an `id`.
2. **GET** `/api/v1/yt/videos-uploaded/{id}` — Downloads the video file as a blob.

## Architecture

| Layer        | Technology                            |
|-------------|---------------------------------------|
| Framework   | React 18 (Create React App)           |
| UI          | MUI v5 (dark theme) + react-bootstrap |
| HTTP        | Axios                                 |
| Entry point | `src/index.js` → `src/App.js`         |

- **Legacy**: `src/App_old.jsx` is stale — do not edit.
- **Env vars**: `REACT_APP_API_URL` in `.env` with fallback to `http://localhost:8000`.

## Notes

- The default `App.test.js` checks for "learn react" text that no longer exists — the test will fail.
- No custom ESLint/Prettier config beyond CRA defaults. No CI pipeline.
- Docker build uses `serve` to serve the static `build/` folder.
