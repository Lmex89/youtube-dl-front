import React, { useEffect, useState } from 'react';
import './App.css';
import LinearProgress from '@mui/material/LinearProgress';
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';
import CancelIcon from '@mui/icons-material/Cancel';
import DownloadIcon from '@mui/icons-material/Download';
import ReplayIcon from '@mui/icons-material/Replay';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { OUTPUT_PROFILES, getOutputProfile, describeProgress } from './downloadProfiles';
import { buildDownloadUrl } from './api/downloads';
import { PHASES, useDownloadJob } from './hooks/useDownloadJob';

const darkTheme = createTheme({
  palette: { mode: 'dark' },
});

const YOUTUBE_REGEX = /^(https?:\/\/)?((www|m|music)\.)?(youtube\.com\/(watch\?.*v=|embed\/|shorts\/|v\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
const FACEBOOK_REGEX = /^(https?:\/\/)?(((www|m|web)\.)?(facebook\.com|fb\.com)\/(.+|watch|reel|share|videos)|(www\.)?fb\.watch\/.+)/i;
const TIKTOK_REGEX = /^(https?:\/\/)?(((www|m)\.)?tiktok\.com\/(@[\w.-]+\/(video|photo)\/\d+|t\/[a-zA-Z0-9_-]+|[a-zA-Z0-9_/-]+)|(vt|vm)\.tiktok\.com\/[a-zA-Z0-9_-]+)/i;

export function validateAndCleanUrl(inputUrl) {
  if (!inputUrl || typeof inputUrl !== 'string') return null;
  const trimmed = inputUrl.trim();
  if (!trimmed) return null;

  const ytMatch = trimmed.match(YOUTUBE_REGEX);
  if (ytMatch) {
    const videoId = ytMatch[6];
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  if (FACEBOOK_REGEX.test(trimmed)) {
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }

  if (TIKTOK_REGEX.test(trimmed)) {
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }

  return null;
}

function App() {
  const [videoUrl, setVideoUrl] = useState('');
  const [urlError, setUrlError] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(OUTPUT_PROFILES[0].value);
  const [now, setNow] = useState(() => Date.now());

  const {
    phase,
    profile: activeProfile,
    progress,
    upload,
    error,
    notice,
    saveProgress,
    submitCooldownUntil,
    isBusy,
    startDownload,
    cancelJob,
    saveFile,
    retry,
    reset,
  } = useDownloadJob();

  const activeProfileConfig = getOutputProfile(activeProfile || selectedProfile);

  useEffect(() => {
    if (!submitCooldownUntil) return undefined;
    const tick = () => {
      const timestamp = Date.now();
      setNow(timestamp);
      if (timestamp >= submitCooldownUntil) {
        window.clearInterval(timer);
      }
    };
    setNow(Date.now());
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [submitCooldownUntil]);

  const cooldownSeconds = Math.max(0, Math.ceil((submitCooldownUntil - now) / 1000));
  const isCoolingDown = cooldownSeconds > 0;
  const isRateLimited = !isBusy && phase === PHASES.IDLE && error?.status === 429;

  const showProgress =
    phase === PHASES.SUBMITTING || phase === PHASES.POLLING || phase === PHASES.RESOLVING;

  const showResult =
    Boolean(upload) && (phase === PHASES.READY || phase === PHASES.DOWNLOADING || phase === PHASES.SAVED);

  const phaseLabel =
    phase === PHASES.SUBMITTING
      ? 'Submitting'
      : phase === PHASES.POLLING
        ? 'Processing'
        : phase === PHASES.RESOLVING
          ? 'Finishing up'
          : '';

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isBusy || isCoolingDown) return;

    const cleanedUrl = validateAndCleanUrl(videoUrl);
    if (!cleanedUrl) {
      setUrlError('Enter a valid YouTube, Facebook, or TikTok video URL.');
      return;
    }

    setUrlError(null);
    startDownload(cleanedUrl, selectedProfile);
  };

  const handleClear = () => {
    setVideoUrl('');
    setUrlError(null);
    reset();
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="App">
        <div className="container">
          <header className="app-header">
            <span className="app-kicker">Media Downloader</span>
            <h1>Video Downloader</h1>
            <p className="subtitle">
              Download YouTube, Facebook, or TikTok media as MP4 video, WhatsApp-ready video, or
              M4A audio.
            </p>
          </header>

          <main>
            <form className="panel download-form" onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label className="field-label" htmlFor="video-url">
                  Video URL
                </label>
                <input
                  id="video-url"
                  type="text"
                  value={videoUrl}
                  onChange={(event) => {
                    setVideoUrl(event.target.value);
                    if (urlError) setUrlError(null);
                  }}
                  className="form-control"
                  placeholder="https://www.youtube.com/watch?v=..."
                  autoComplete="off"
                  aria-invalid={urlError ? 'true' : undefined}
                  aria-describedby={urlError ? 'video-url-error' : undefined}
                />
                {urlError ? (
                  <p className="field-error" id="video-url-error" role="alert">
                    {urlError}
                  </p>
                ) : null}
              </div>

              <fieldset className="profile-fieldset" disabled={isBusy}>
                <legend className="field-label">Output format</legend>
                <div className="profile-grid">
                  {OUTPUT_PROFILES.map((profile) => {
                    const isSelected = selectedProfile === profile.value;
                    return (
                      <label
                        key={profile.value}
                        className={`profile-option${isSelected ? ' is-selected' : ''}`}
                      >
                        <input
                          className="profile-radio"
                          type="radio"
                          name="output-profile"
                          value={profile.value}
                          checked={isSelected}
                          onChange={() => setSelectedProfile(profile.value)}
                        />
                        <span className="profile-option-body">
                          <span className="profile-option-head">
                            <span className="profile-option-label">{profile.label}</span>
                            <span className="profile-option-tag">{profile.tagline}</span>
                          </span>
                          <span className="profile-option-description">{profile.description}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {isRateLimited ? (
                <p className="field-error" role="alert">
                  {error.message}. {cooldownSeconds > 0 ? `Try again in ${cooldownSeconds}s.` : ''}
                </p>
              ) : null}

              <div className="form-actions">
                <Button type="submit" variant="contained" disabled={isBusy || isCoolingDown}>
                  {isCoolingDown ? `Try again in ${cooldownSeconds}s` : 'Download'}
                </Button>
                <Button
                  type="button"
                  variant="outlined"
                  onClick={handleClear}
                  disabled={isBusy}
                  startIcon={<DeleteIcon />}
                >
                  Clear
                </Button>
              </div>
            </form>

            {showProgress ? (
              <section className="panel status-card" aria-label="Download progress">
                <div className="status-card-header">
                  <span className="status-chip">{activeProfileConfig.label}</span>
                  <span className="status-phase">{phaseLabel}</span>
                </div>
                <LinearProgress
                  variant={progress > 0 ? 'determinate' : 'indeterminate'}
                  value={progress}
                  aria-label={`Download progress for ${activeProfileConfig.label}`}
                  aria-valuetext={`${Math.round(progress)} percent`}
                  className="status-progress"
                />
                <div className="status-meta">
                  <span className="status-message">
                    {notice || describeProgress(activeProfile, progress)}
                  </span>
                  {progress > 0 ? (
                    <span className="status-percentage">{Math.round(progress)}%</span>
                  ) : null}
                </div>
                <div className="status-actions">
                  <Button variant="outlined" color="inherit" startIcon={<CancelIcon />} onClick={cancelJob}>
                    Cancel
                  </Button>
                </div>
              </section>
            ) : null}

            {showResult ? (
              <section className="panel result-card" aria-label="Download ready">
                <div className="result-header">
                  <CheckCircleIcon className="result-icon result-icon-success" aria-hidden="true" />
                  <div className="result-heading">
                    <h2 className="result-title">
                      {phase === PHASES.SAVED ? 'File saved' : 'Your file is ready'}
                    </h2>
                    <p className="result-subtitle">
                      {upload.title || 'Downloaded media'} &middot; {activeProfileConfig.label}
                    </p>
                  </div>
                </div>

                {error ? (
                  <p className="field-error" role="alert">
                    {error.message}
                  </p>
                ) : null}

                <div className="media-frame">
                  {activeProfileConfig.mediaType === 'audio' ? (
                    <audio
                      className="media-player"
                      controls
                      preload="metadata"
                      src={buildDownloadUrl(upload.id)}
                    >
                      Your browser does not support audio playback.
                    </audio>
                  ) : (
                    <video
                      className="media-player"
                      controls
                      preload="metadata"
                      src={buildDownloadUrl(upload.id)}
                    >
                      Your browser does not support video playback.
                    </video>
                  )}
                </div>

                <div className="result-meta">
                  <span className="result-meta-item">{upload.mime_type || activeProfileConfig.mimeType}</span>
                  <span className="result-meta-item">.{activeProfileConfig.extension}</span>
                  <span className="result-meta-item">{activeProfileConfig.shortLabel}</span>
                </div>

                {phase === PHASES.DOWNLOADING ? (
                  <div className="save-progress">
                    <LinearProgress
                      variant="determinate"
                      value={saveProgress}
                      aria-label="Saving file progress"
                      aria-valuetext={`${saveProgress} percent`}
                    />
                    <span className="status-message">{`Saving file: ${saveProgress}%`}</span>
                  </div>
                ) : null}

                <div className="result-actions">
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={saveFile}
                    disabled={phase === PHASES.DOWNLOADING}
                  >
                    {phase === PHASES.SAVED ? 'Save again' : `Save ${activeProfileConfig.label}`}
                  </Button>
                  <Button variant="outlined" onClick={handleClear}>
                    Download another
                  </Button>
                </div>
              </section>
            ) : null}

            {phase === PHASES.ERROR ? (
              <section className="panel status-card status-card-error" role="alert">
                <div className="status-card-header">
                  <ErrorOutlineIcon aria-hidden="true" />
                  <span className="status-phase">Download failed</span>
                </div>
                <p className="status-message">{error?.message || 'Something went wrong.'}</p>
                {error?.allowed?.length ? (
                  <p className="status-message">
                    Supported formats:{' '}
                    {error.allowed.map((value) => getOutputProfile(value).label).join(', ')}
                  </p>
                ) : null}
                {error?.detail && error.detail !== error.message ? (
                  <p className="status-detail">{error.detail}</p>
                ) : null}
                <div className="status-actions">
                  <Button variant="contained" startIcon={<ReplayIcon />} onClick={retry}>
                    Try again
                  </Button>
                  <Button variant="outlined" onClick={handleClear}>
                    Clear
                  </Button>
                </div>
              </section>
            ) : null}

            {phase === PHASES.TIMED_OUT ? (
              <section className="panel status-card status-card-warning" role="alert">
                <div className="status-card-header">
                  <ErrorOutlineIcon aria-hidden="true" />
                  <span className="status-phase">Taking too long</span>
                </div>
                <p className="status-message">
                  This job has been processing for more than 15 minutes. It may be stuck on the
                  server. You can try again.
                </p>
                <div className="status-actions">
                  <Button variant="contained" startIcon={<ReplayIcon />} onClick={retry}>
                    Try again
                  </Button>
                  <Button variant="outlined" onClick={handleClear}>
                    Clear
                  </Button>
                </div>
              </section>
            ) : null}
          </main>

          <div className="footer">
            <div className="footer-links">
              <a
                href="https://github.com/Lmex89"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
              >
                <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                <span>GitHub Profile</span>
              </a>
              <span className="footer-separator">|</span>
              <a
                href="https://github.com/Lmex89/youtube-dl-front"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
              >
                <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z" />
                </svg>
                <span>Repository</span>
              </a>
            </div>
            <div className="footer-text">Created by Lmex89</div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
