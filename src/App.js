import React, { useState } from 'react';
import axios from 'axios';
import './App.css';
import { OverlayTrigger, Popover } from 'react-bootstrap';

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
    <div className="container">
      <h1 className="mt-4 mb-4">YouTube Video Downloader</h1>
      <div className="input-group mb-4">
        <input type="text" value={youtubeUrl} onChange={handleInputChange} />
        <OverlayTrigger trigger="click" placement="right" overlay={popover} rootClose>
        <button className="btn btn-primary" type="button" onClick={handleDownload}>
          Download
        </button>
      </OverlayTrigger>
        <button className="btn btn-secondary" type="button" onClick={handleClean}>
          Clean
        </button>
      </div>
      {loading && <div>Loading...</div>}
      {downloadUrl && url && (
        <div>
          <video controls>
            <source src={url} type="video/mp4" />
          </video>
          <a href={url} download>Click here to download the video</a>
        </div>
      )}
    </div>
  );
}

export default App;
