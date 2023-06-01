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

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [url, setUrl] = useState(null)

  const handleInputChange = (event) => {
    setYoutubeUrl(event.target.value);
  };

  const downloadFile = (videoId) => {
    console.log(videoId)
    axios
      .get(`https://intraytdlp.servicecloudlmex.co/api/v1/yt/videos-uploaded/${videoId}`, { responseType: 'blob' })
      .then((response) => {
        const downloadUrl1 = window.URL.createObjectURL(new Blob([response.data], {
          type: 'application/octet-stream',
        }));
        console.log("este es el objecto ", downloadUrl1)
        const link = document.createElement('a');
        link.href = downloadUrl1;
        console.log("link,", link.href)
        link.setAttribute('download', `video_${videoId}.mp4`);
        setUrl(link)
        setLoading(false)
        document.body.appendChild(link);
        link.click();
        link.remove()
        //document.body.removeChild(link);
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  };
  const popover = (
    <Popover id="popover-basic">
      <Popover.Body>Please enter a YouTube URL.</Popover.Body>
    </Popover>
  );

  const handleDownload = () => {
    if (youtubeUrl) {
      setLoading(true);
      axios
        .post('https://intraytdlp.servicecloudlmex.co/api/v1/yt/videos-uploaded/', { url: youtubeUrl })
        .then((response) => {
          console.log("url del resnpose ", response.data.id, downloadUrl);
          setDownloadUrl(response.data);
          downloadFile(response.data.id)
        })
        .catch((error) => {
          console.error('Error:', error);
          setLoading(false);
          setDownloadUrl('');
        });
    } else {

    }
  };

  const handleClean = () => {
    setYoutubeUrl('');
    setDownloadUrl('');
    setUrl('');
    setLoading(false)
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="container">
        <h1 className="mt-4 mb-4">YouTube Video Downloader</h1>
        <div className="input-group mb-3">
          <input type="text" value={youtubeUrl} onChange={handleInputChange} class="form-control" placeholder="Youtube Url" aria-label="Youtube Url" aria-describedby="basic-addon2" />
          <OverlayTrigger trigger="click" placement="right" overlay={popover} rootClose>
            {/* <button className="btn btn-primary" type="button" onClick={handleDownload}>
            Download
          </button> */}
            <Button variant="contained" onClick={handleDownload} color="success" >Download</Button>
          </OverlayTrigger>
          {/* <button className="btn btn-secondary" type="button" onClick={handleClean}>
          Clean
        </button> */}
          <Button variant="outlined" disableElevation onClick={handleClean} color="secondary" startIcon={<DeleteIcon />} >
            clean
          </Button>
        </div>
        {loading &&
          <Backdrop
            sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
            open
          >
            <CircularProgress color="inherit" />
          </Backdrop>
        }
        {downloadUrl && url && (
          <div>
            <video controls>
              <source src={url} type="video/mp4" />
            </video>
            <a href={url} download>Click here to download the video</a>
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
