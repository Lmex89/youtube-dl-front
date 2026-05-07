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

- **YouTube URL Validation**: Smart regex-based validation that accepts various YouTube URL formats (standard, shortened, embedded, and shorts URLs)
- **Clean URL Sanitization**: Automatically extracts and normalizes video IDs from messy URLs
- **Real-time Feedback**: Loading states with Material-UI backdrop and circular progress indicators
- **Video Preview**: In-app video player to preview downloaded content before saving
- **Dark Theme**: Modern dark UI using Material-UI's theming system
- **Responsive Design**: Bootstrap grid system ensures compatibility across devices
- **Error Handling**: User-friendly popover notifications for invalid inputs
- **Docker Support**: Multi-stage Dockerfile with health checks and nginx serving

### Supported YouTube URL Formats

```
https://www.youtube.com/watch?v=VIDEO_ID
https://youtu.be/VIDEO_ID
https://youtube.com/shorts/VIDEO_ID
https://www.youtube.com/embed/VIDEO_ID
```

---

## Demo

The application provides a simple, focused interface:

1. **Input Field**: Enter any valid YouTube URL
2. **Download Button**: Validates URL and initiates backend processing
3. **Clean Button**: Clears the form and resets the state
4. **Video Preview**: Watch the downloaded video before saving
5. **Download Link**: Save the video file locally

---

## Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | React 18 (Create React App) | UI component library |
| **Language** | JavaScript (ES6+) | Application logic |
| **Styling** | Material-UI v5 + Bootstrap 5 | Component styling and grid system |
| **HTTP Client** | Axios | API communication |
| **Build Tool** | react-scripts 5.0.1 | Development and production builds |
| **Icons** | @mui/icons-material | UI iconography |
| **Testing** | Jest + React Testing Library | Unit and integration testing |

### Key Components

| Component | Library | Purpose |
|-----------|---------|---------|
| `ThemeProvider` | MUI | Dark theme configuration |
| `Backdrop` | MUI | Loading overlay |
| `CircularProgress` | MUI | Loading spinner |
| `Button` | MUI | Action buttons with variants |
| `Popover` | react-bootstrap | Validation error messages |
| `OverlayTrigger` | react-bootstrap | Popover positioning |

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
- Bootstrap and react-bootstrap for styling
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

The frontend communicates with a backend API to process YouTube downloads.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/yt/videos-uploaded/` | Submit YouTube URL for processing |
| GET | `/api/v1/yt/videos-uploaded/{id}` | Download processed video file |

### Request Flow

1. **URL Submission** (POST)
   ```javascript
   POST /api/v1/yt/videos-uploaded/
   Content-Type: application/json
   
   {
     "url": "https://www.youtube.com/watch?v=VIDEO_ID"
   }
   ```
   
   Response:
   ```json
   {
     "id": "unique-video-id",
     "title": "Video Title",
     "url": "..."
   }
   ```

2. **File Download** (GET)
   ```javascript
   GET /api/v1/yt/videos-uploaded/{id}
   Response-Type: blob
   ```

### Error Handling

The application handles various error scenarios:
- **Invalid URLs**: Shows popover with validation message
- **Network Errors**: Logged to console, loading state cleared
- **API Errors**: Logged to console with error details

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
│   ├── App.js                # Main application component
│   ├── App.css               # Application styles
│   ├── index.js              # Application entry point
│   ├── index.css             # Global styles
│   ├── config.js             # Configuration management
│   ├── App_old.jsx           # Legacy file (do not edit)
│   ├── reportWebVitals.js    # Performance monitoring
│   └── App.test.js           # Test file (needs update)
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
| `src/App.js` | Main component with URL validation, API calls, and UI |
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

#### 1. Tests Failing

**Problem**: `App.test.js` fails with "learn react" not found error.

**Cause**: The default Create React App test checks for text that no longer exists in the updated UI.

**Solution**: Update the test or remove it if not needed:
```javascript
// src/App.test.js
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders YouTube downloader', () => {
  render(<App />);
  const titleElement = screen.getByText(/YouTube Video Downloader/i);
  expect(titleElement).toBeInTheDocument();
});
```

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

- Video downloads are handled as blobs to avoid memory issues
- Loading states prevent duplicate requests
- Web Vitals monitoring is enabled for performance tracking

### Security

- URL validation prevents arbitrary URL submissions
- All API calls use HTTPS in production
- No sensitive data stored in local storage or cookies

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
