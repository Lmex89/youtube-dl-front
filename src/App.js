import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import { OverlayTrigger, Popover } from 'react-bootstrap';
import Backdrop from '@mui/material/Backdrop';
import LinearProgress from '@mui/material/LinearProgress';
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';
import CancelIcon from '@mui/icons-material/Cancel';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import config from './config';

const POLLING_INTERVAL = 2000;
const POLLING_TIMEOUT = 300000;
const DOWNLOAD_TIMEOUT = 300000;
const PROCESS_TIMEOUT = 60000;
const STORAGE_KEY = 'youtube_dl_pending_download';

const darkTheme = createTheme({
  palette: { mode: 'dark' },
});

function App() {
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [url, setUrl] = useState(null);
  const [showPopover, setShowPopover] = useState(false);
  const [codecUrlId, setCodecUrlId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState(null);
  const pollingRef = useRef(null);
  const pollingStartTimeRef = useRef(null);

  useEffect(() => {
    const savedDownload = localStorage.getItem(STORAGE_KEY);
    if (savedDownload) {
      try {
        const { codecUrlId: savedId, startTime } = JSON.parse(savedDownload);
        if (savedId && startTime) {
          const elapsed = Date.now() - startTime;
          if (elapsed < POLLING_TIMEOUT) {
            setCodecUrlId(savedId);
            setLoading(true);
            setProgressMessage('Resuming download...');
            pollProgress(savedId, startTime);
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (err) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
    };
  }, []);

  const pollProgress = async (codecUrlId, startTime) => {
    try {
      const response = await axios.get(
        `${config.API_URL}/api/v1/yt/videos/${codecUrlId}`,
        { timeout: 10000 }
      );
      
      const { status, progress: progressValue } = response.data;
      
      setProgress(progressValue || 0);
      
      if (status === 1) {
        setProgressMessage('Download complete! Fetching video...');
        await fetchCompletedVideo(codecUrlId);
        return;
      } else if (status === 3) {
        setError('Download failed. Please try again.');
        setLoading(false);
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      
      setProgressMessage(`Downloading: ${progressValue.toFixed(1)}%`);
      
      if (Date.now() - startTime > POLLING_TIMEOUT) {
        throw new Error('TIMEOUT');
      }
      
      pollingRef.current = setTimeout(() => pollProgress(codecUrlId, startTime), POLLING_INTERVAL);
      
    } catch (err) {
      if (err.message === 'TIMEOUT' || err.code === 'ECONNABORTED') {
        setError('Request timed out. The backend may be overloaded. Please try again later.');
      } else {
        setError('Failed to check download status. Please try again.');
      }
      setLoading(false);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const fetchCompletedVideo = async (codecUrlId) => {
    try {
      const response = await axios.get(
        `${config.API_URL}/api/v1/yt/videos-uploaded/`,
        { timeout: 10000 }
      );
      
      const video = response.data.find(v => v.codecurl === codecUrlId);
      
      if (!video) {
        setError('Video processing completed but file not found. Please contact support.');
        setLoading(false);
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      
      setProgressMessage('Preparing download...');
      await downloadVideoFile(video.id);
      
    } catch (err) {
      setError('Failed to fetch completed video. Please try again.');
      setLoading(false);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const downloadVideoFile = async (videoUploadedId) => {
    try {
      const response = await axios.get(
        `${config.API_URL}/api/v1/yt/videos-uploaded/${videoUploadedId}`,
        {
          responseType: 'blob',
          timeout: DOWNLOAD_TIMEOUT,
          onDownloadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setProgress(percentCompleted);
              setProgressMessage(`Downloading file: ${percentCompleted}%`);
            }
          }
        }
      );
      
      const blobUrl = window.URL.createObjectURL(
        new Blob([response.data], { type: 'application/octet-stream' })
      );
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `video_${videoUploadedId}.mp4`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setUrl(blobUrl);
      setDownloadUrl({ id: videoUploadedId });
      setLoading(false);
      setProgress(100);
      setProgressMessage('Download complete!');
      localStorage.removeItem(STORAGE_KEY);
      
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setError('Download timed out. Please try again.');
      } else {
        setError('Failed to download video file. Please try again.');
      }
      setLoading(false);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleInputChange = (event) => {
    setVideoUrl(event.target.value);
    setShowPopover(false);
  };

  // --- Regex to validate and sanitize YouTube, Facebook, and TikTok URLs ---
  const validateAndCleanUrl = (inputUrl) => {
    if (!inputUrl || typeof inputUrl !== 'string') return null;
    const trimmed = inputUrl.trim();
    if (!trimmed) return null;

    // YouTube validation & cleaning
    const youtubeRegex = /^(https?:\/\/)?((www|m|music)\.)?(youtube\.com\/(watch\?.*v=|embed\/|shorts\/|v\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
    const ytMatch = trimmed.match(youtubeRegex);
    if (ytMatch) {
      const videoId = ytMatch[6];
      return `https://www.youtube.com/watch?v=${videoId}`;
    }

    // Facebook validation
    const fbRegex = /^(https?:\/\/)?(((www|m|web)\.)?(facebook\.com|fb\.com)\/(.+|watch|reel|share|videos)|(www\.)?fb\.watch\/.+)/i;
    if (fbRegex.test(trimmed)) {
      return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    }

    // TikTok validation
    const ttRegex = /^(https?:\/\/)?(((www|m)\.)?tiktok\.com\/(@[\w.-]+\/(video|photo)\/\d+|t\/[a-zA-Z0-9_-]+|[a-zA-Z0-9_/-]+)|(vt|vm)\.tiktok\.com\/[a-zA-Z0-9_-]+)/i;
    if (ttRegex.test(trimmed)) {
      return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    }

    return null;
  };

  const popover = (
    <Popover id="popover-basic">
      <Popover.Body>
        {error || 'Please enter a valid YouTube, Facebook, or TikTok video URL.'}
      </Popover.Body>
    </Popover>
  );

  const handleDownload = async () => {
    const cleanedUrl = validateAndCleanUrl(videoUrl);

    if (!cleanedUrl) {
      setShowPopover(true);
      return;
    }

    setLoading(true);
    setShowPopover(false);
    setError(null);
    setProgress(0);
    setProgressMessage('Processing video URL...');

    try {
      const response = await axios.post(
        `${config.API_URL}/api/v1/yt/videos-uploaded/`,
        { url: cleanedUrl },
        { timeout: PROCESS_TIMEOUT }
      );
      
      const newCodecUrlId = response.data.id;
      setCodecUrlId(newCodecUrlId);
      
      const startTime = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        codecUrlId: newCodecUrlId,
        startTime
      }));
      
      setProgressMessage('Starting download...');
      pollProgress(newCodecUrlId, startTime);
      
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setError('Request timed out. The backend may be busy. Please try again.');
      } else if (err.response?.status === 429) {
        setError('Rate limit exceeded. Please wait a moment and try again.');
      } else {
        setError('Failed to start download. Please check the URL and try again.');
      }
      setLoading(false);
    }
  };

  const handleClean = () => {
    setVideoUrl('');
    setDownloadUrl(null);
    setUrl('');
    setLoading(false);
    setShowPopover(false);
    setError(null);
    setProgress(0);
    setProgressMessage('');
    setCodecUrlId(null);
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleCancel = () => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
    setLoading(false);
    setError(null);
    setProgress(0);
    setProgressMessage('');
    setCodecUrlId(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="App">
        <div className="container">
          <h1>Video Downloader</h1>
          <div className="subtitle">Download your favorite YouTube, Facebook, or TikTok videos by entering the URL below</div>
          
          <div className="panel">
            <div className="input-group">
              <input
                type="text"
                value={videoUrl}
                onChange={handleInputChange}
                className="form-control"
                placeholder="Enter YouTube, Facebook, or TikTok URL..."
                aria-label="Video URL"
              />
              <OverlayTrigger
                trigger={showPopover || error ? 'click' : []}
                placement="bottom"
                overlay={popover}
                rootClose
                show={showPopover || !!error}
                onToggle={(nextShow) => {
                  if (!nextShow) {
                    setError(null);
                    setShowPopover(false);
                  }
                }}
              >
                <Button variant="contained" onClick={handleDownload}>
                  Download
                </Button>
              </OverlayTrigger>
              <Button
                variant="outlined"
                disableElevation
                onClick={handleClean}
                startIcon={<DeleteIcon />}
              >
                Clean
              </Button>
            </div>
          </div>

          {loading && (
            <Backdrop 
              sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} 
              open
            >
              <div className="backdrop-content">
                <LinearProgress 
                  variant={progress > 0 ? "determinate" : "indeterminate"}
                  value={progress} 
                  sx={{ 
                    width: '100%', 
                    mb: 2, 
                    height: 8, 
                    borderRadius: 4 
                  }}
                />
                <div className="backdrop-message">
                  {progressMessage || 'Processing...'}
                </div>
                {progress > 0 && (
                  <div className="backdrop-percentage">
                    {progress.toFixed(1)}%
                  </div>
                )}
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<CancelIcon />}
                  onClick={handleCancel}
                  className="backdrop-cancel-btn"
                >
                  Cancel Download
                </Button>
              </div>
            </Backdrop>
          )}

          {downloadUrl && url && (
            <div className="panel">
              <div className="video-container">
                <div className="video-id">
                  <span className="status">Video ID: <strong>{downloadUrl.id}</strong></span>
                </div>
                <video controls className="video-player">
                  <source src={url} type="video/mp4" />
                </video>
                <div className="download-link">
                  <a href={url} download>
                    Click here to download the video
                  </a>
                </div>
              </div>
            </div>
          )}

          <div className="footer">
            <div className="footer-links">
              <a href="https://github.com/Lmex89" target="_blank" rel="noopener noreferrer" className="footer-link">
                <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                <span>GitHub Profile</span>
              </a>
              <span className="footer-separator">|</span>
              <a href="https://github.com/Lmex89/youtube-dl-front" target="_blank" rel="noopener noreferrer" className="footer-link">
                <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>
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
