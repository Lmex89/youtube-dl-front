# youtube-dl-front

## Commands (use yarn, not npm)

| Command | Action |
|---|---|
| `yarn start` | Dev server on :3000 |
| `yarn build` | Production build to `build/` |
| `yarn test` | Jest watch mode (CRA default) |
| `docker compose up -d` | Production container on :3012 |

## Architecture

- **Stack**: React 18 (CRA), MUI v5, react-bootstrap, Axios. **No TypeScript, no routing.**
- **Entry**: `src/index.js` → `src/App.js`
- **Env**: `REACT_APP_API_URL` in `.env` (must use `REACT_APP_` prefix — CRA requirement). Falls back to `http://localhost:8000`.
- **Legacy**: `src/App_old.jsx` is stale — do not edit.

## Quirks

- The default `App.test.js` checks for "learn react" text that no longer exists in the current `App.js` — test will fail. Update or remove if changing tests.
- No custom ESLint/Prettier config beyond CRA defaults. No CI pipeline.
- Docker build uses `nginxinc/nginx-unprivileged:1.27-alpine` (see `docker/nginx/default.conf`). `REACT_APP_API_URL` is passed as a build arg — update your `.env` before building.
