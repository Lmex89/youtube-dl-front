# Async job processing with HTTP polling

The download flow uses asynchronous job processing: the frontend submits a URL, receives a job ID, then polls the server every ~1.5 seconds for progress updates until completion. This was chosen over WebSocket or Server-Sent Events.

## Context

Video downloads can take minutes to complete. The frontend needs real-time progress updates to show the user what's happening. The backend processes downloads asynchronously, so the frontend must wait for completion.

## Decision

Use HTTP polling with exponential backoff and jitter instead of WebSocket or Server-Sent Events. Poll every 1.5 seconds with up to 300ms jitter, doubling the interval on 429 responses (up to 10s max), with a 15-minute total timeout budget.

## Rationale

- **Simplicity**: No WebSocket infrastructure, connection management, or reconnection logic needed. Works with any HTTP backend and CDN.
- **Reliability**: HTTP requests are stateless and idempotent. Failed polls retry naturally without complex state management.
- **Backend agnostic**: The backend doesn't need to maintain persistent connections or implement WebSocket handlers. Any REST API works.
- **Sufficient for use case**: Downloads are user-initiated and infrequent. The polling overhead is negligible compared to the download duration.

## Trade-offs

- **Latency**: Progress updates lag by up to 1.5s. Acceptable for multi-minute downloads.
- **Server load**: More HTTP requests than WebSocket. Mitigated by jitter, backoff, and the 15-minute timeout.
- **Bandwidth**: Slightly more data transferred. Negligible for JSON status updates.

WebSocket would reduce latency and server load but adds complexity (connection lifecycle, reconnection, backend infrastructure). Not justified for this use case.
