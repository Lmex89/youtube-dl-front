import React, { useState } from 'react';
import axios from 'axios';
import './App.css';
import { OverlayTrigger, Popover } from 'react-bootstrap';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import config from './config';

const darkTheme = createTheme({
  palette: { mode: 'dark' },
});

function App() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [url, setUrl] = useState(null);
  const [showPopover, setShowPopover] = useState(false);

  const handleInputChange = (event) => {
    setYoutubeUrl(event.target.value);
    setShowPopover(false);
  };

  // --- Regex to validate and sanitize YouTube URL ---
  const validateAndCleanYouTubeUrl = (inputUrl) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/|shorts\/)?([a-zA-Z0-9_-]{11})(.*)?$/;
    const match = inputUrl.match(youtubeRegex);
    if (!match) return null;

    // Extract base URL + video ID
    const videoId = match[5];
    return `https://www.youtube.com/watch?v=${videoId}`;
  };

  const downloadFile = (videoId) => {
    axios
      .get(`${config.API_URL}/api/v1/yt/videos-uploaded/${videoId}`, {
        responseType: 'blob',
      })
      .then((response) => {
        const blobUrl = window.URL.createObjectURL(
          new Blob([response.data], { type: 'application/octet-stream' })
        );
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', `video_${videoId}.mp4`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        setUrl(blobUrl);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error:', error);
        setLoading(false);
      });
  };

  const popover = (
    <Popover id="popover-basic">
      <Popover.Body>Please enter a valid YouTube video URL.</Popover.Body>
    </Popover>
  );

  const handleDownload = () => {
    const cleanedUrl = validateAndCleanYouTubeUrl(youtubeUrl);

    if (!cleanedUrl) {
      setShowPopover(true);
      return;
    }

    setLoading(true);
    setShowPopover(false);

    axios
      .post(`${config.API_URL}/api/v1/yt/videos-uploaded/`, { url: cleanedUrl })
      .then((response) => {
        setDownloadUrl(response.data);
        downloadFile(response.data.id);
      })
      .catch((error) => {
        console.error('Error:', error);
        setLoading(false);
      });
  };

  const handleClean = () => {
    setYoutubeUrl('');
    setDownloadUrl('');
    setUrl('');
    setLoading(false);
    setShowPopover(false);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="App">
        <div className="container">
          <h1>YouTube Video Downloader</h1>
          <div className="subtitle">Download your favorite YouTube videos by entering the URL below</div>
          
          <div className="panel">
            <div className="input-group">
              <input
                type="text"
                value={youtubeUrl}
                onChange={handleInputChange}
                className="form-control"
                placeholder="Enter YouTube URL..."
                aria-label="YouTube URL"
              />
              <OverlayTrigger
                trigger={showPopover ? 'click' : []}
                placement="right"
                overlay={popover}
                rootClose
                show={showPopover}
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
            <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open>
              <CircularProgress color="inherit" />
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
