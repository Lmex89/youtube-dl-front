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
      <div className="container">
        <h1 className="mt-4 mb-4">YouTube Video Downloader by Lmex89</h1>
        <div className="input-group mb-3">
          <input
            type="text"
            value={youtubeUrl}
            onChange={handleInputChange}
            className="form-control"
            placeholder="YouTube URL"
            aria-label="YouTube URL"
          />
          <OverlayTrigger
            trigger={showPopover ? 'click' : []}
            placement="right"
            overlay={popover}
            rootClose
            show={showPopover}
          >
            <Button variant="contained" onClick={handleDownload} color="success">
              Download
            </Button>
          </OverlayTrigger>
          <Button
            variant="outlined"
            disableElevation
            onClick={handleClean}
            color="secondary"
            startIcon={<DeleteIcon />}
          >
            Clean
          </Button>
        </div>

        {loading && (
          <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open>
            <CircularProgress color="inherit" />
          </Backdrop>
        )}

        {downloadUrl && url && (
          <div>
            <video controls>
              <source src={url} type="video/mp4" />
            </video>
            <a href={url} download>
              Click here to download the video
            </a>
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
