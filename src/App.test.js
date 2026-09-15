import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { DownloadApiError, findUpload, getJob, submitDownload } from './api/downloads';

jest.mock('./api/downloads', () => {
  const actual = jest.requireActual('./api/downloads');
  return {
    ...actual,
    submitDownload: jest.fn(),
    getJob: jest.fn(),
    findUpload: jest.fn(),
    downloadFile: jest.fn(),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
});

test('renders the downloader with Standard MP4 selected by default', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: /video downloader/i })).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: /standard mp4/i })).toBeChecked();
  expect(screen.getByRole('radio', { name: /whatsapp video/i })).not.toBeChecked();
  expect(screen.getByRole('radio', { name: /audio only/i })).not.toBeChecked();
});

test('shows a validation error for an invalid URL', () => {
  render(<App />);

  fireEvent.change(screen.getByLabelText(/video url/i), { target: { value: 'not a real url' } });
  fireEvent.click(screen.getByRole('button', { name: /^download$/i }));

  expect(screen.getByRole('alert')).toHaveTextContent(/valid YouTube, Facebook, or TikTok/i);
  expect(submitDownload).not.toHaveBeenCalled();
});

test('submits with the default profile and renders a video preview', async () => {
  submitDownload.mockResolvedValue({ id: 'job-1', status: 'pending', output_profile: 'standard_video' });
  getJob.mockResolvedValue({ id: 'job-1', status: 1, progress: 100, output_profile: 'standard_video' });
  findUpload.mockResolvedValue({
    id: 'upload-1',
    codecurl: 'job-1',
    mime_type: 'video/mp4',
    title: 'Me at the zoo',
    video: 'downloads/upload-1.mp4',
  });

  render(<App />);

  fireEvent.change(screen.getByLabelText(/video url/i), {
    target: { value: 'https://youtu.be/jNQXAC9IVRw' },
  });
  fireEvent.click(screen.getByRole('button', { name: /^download$/i }));

  expect(await screen.findByText(/your file is ready/i)).toBeInTheDocument();
  expect(submitDownload).toHaveBeenCalledWith(
    'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    'standard_video',
    expect.anything()
  );
  expect(document.querySelector('video')).toBeInTheDocument();
  expect(document.querySelector('audio')).not.toBeInTheDocument();
});

test('submits the audio profile and renders an audio preview', async () => {
  submitDownload.mockResolvedValue({ id: 'job-2', status: 'pending', output_profile: 'audio_m4a' });
  getJob.mockResolvedValue({ id: 'job-2', status: 1, progress: 100, output_profile: 'audio_m4a' });
  findUpload.mockResolvedValue({
    id: 'upload-2',
    codecurl: 'job-2',
    mime_type: 'audio/mp4',
    title: 'A song',
    video: 'downloads/upload-2.m4a',
  });

  render(<App />);

  fireEvent.click(screen.getByRole('radio', { name: /audio only/i }));
  fireEvent.change(screen.getByLabelText(/video url/i), {
    target: { value: 'https://www.youtube.com/watch?v=jNQXAC9IVRw' },
  });
  fireEvent.click(screen.getByRole('button', { name: /^download$/i }));

  expect(await screen.findByText(/your file is ready/i)).toBeInTheDocument();
  expect(submitDownload).toHaveBeenCalledWith(expect.any(String), 'audio_m4a', expect.anything());
  expect(document.querySelector('audio')).toBeInTheDocument();
  expect(document.querySelector('video')).not.toBeInTheDocument();
});

test('shows a failed state when the job errors', async () => {
  submitDownload.mockResolvedValue({ id: 'job-3', status: 'pending', output_profile: 'standard_video' });
  getJob.mockResolvedValue({ id: 'job-3', status: 3, progress: 42, output_profile: 'standard_video' });

  render(<App />);

  fireEvent.change(screen.getByLabelText(/video url/i), {
    target: { value: 'https://www.youtube.com/watch?v=jNQXAC9IVRw' },
  });
  fireEvent.click(screen.getByRole('button', { name: /^download$/i }));

  expect(await screen.findByText(/download failed/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
});

test('surfaces the backend error and allowed profiles on a 400 response', async () => {
  submitDownload.mockRejectedValue(
    new DownloadApiError({
      kind: 'http',
      status: 400,
      message: 'unsupported output_profile',
      allowed: ['audio_m4a', 'standard_video', 'whatsapp_video'],
    })
  );

  render(<App />);

  fireEvent.change(screen.getByLabelText(/video url/i), {
    target: { value: 'https://www.youtube.com/watch?v=jNQXAC9IVRw' },
  });
  fireEvent.click(screen.getByRole('button', { name: /^download$/i }));

  expect(await screen.findByText(/unsupported output_profile/i)).toBeInTheDocument();
  expect(screen.getByText(/Audio Only, Standard MP4, WhatsApp Video/)).toBeInTheDocument();
});

test('starts a cooldown when submit is rate limited', async () => {
  submitDownload.mockRejectedValue(
    new DownloadApiError({ kind: 'http', status: 429, message: 'rate limit exceeded' })
  );

  render(<App />);

  fireEvent.change(screen.getByLabelText(/video url/i), {
    target: { value: 'https://www.youtube.com/watch?v=jNQXAC9IVRw' },
  });
  fireEvent.click(screen.getByRole('button', { name: /^download$/i }));

  expect(await screen.findByText(/rate limit exceeded/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /try again in \d+s/i })).toBeDisabled();
});
