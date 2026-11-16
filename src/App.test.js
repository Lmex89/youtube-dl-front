import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { DownloadApiError, findUpload, getJob, submitDownload } from './api/downloads';
import { buildShareText, buildShareUrl } from './utils/share';

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

// --- Share utility tests ---

describe('buildShareText', () => {
  test('returns video text for video media type', () => {
    expect(buildShareText('video', 'My Video', 'https://example.com')).toBe(
      'Check out My Video https://example.com'
    );
  });

  test('returns audio text for audio media type', () => {
    expect(buildShareText('audio', 'My Song', 'https://example.com')).toBe(
      'Listen: My Song https://example.com'
    );
  });

  test('falls back to Downloaded media when title is empty', () => {
    expect(buildShareText('video', '', 'https://example.com')).toBe(
      'Check out Downloaded media https://example.com'
    );
  });
});

describe('buildShareUrl', () => {
  test('builds WhatsApp URL with encoded text', () => {
    const url = buildShareUrl('whatsapp', 'https://example.com', 'Check this out');
    expect(url).toContain('https://wa.me/?text=');
    expect(url).toContain(encodeURIComponent('Check this out'));
  });

  test('builds Facebook URL with encoded url', () => {
    const url = buildShareUrl('facebook', 'https://example.com', 'text');
    expect(url).toContain('https://www.facebook.com/sharer/sharer.php?u=');
    expect(url).toContain(encodeURIComponent('https://example.com'));
  });

  test('builds X/Twitter URL with encoded url and text', () => {
    const url = buildShareUrl('x', 'https://example.com', 'Hello world');
    expect(url).toContain('https://twitter.com/intent/tweet?');
    expect(url).toContain(encodeURIComponent('https://example.com'));
    expect(url).toContain(encodeURIComponent('Hello world'));
  });

  test('builds Telegram URL with encoded url and text', () => {
    const url = buildShareUrl('telegram', 'https://example.com', 'Hello world');
    expect(url).toContain('https://t.me/share/url?');
    expect(url).toContain(encodeURIComponent('https://example.com'));
    expect(url).toContain(encodeURIComponent('Hello world'));
  });
});

// --- Share UI integration tests ---

async function completeDownload() {
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
  await screen.findByText(/your file is ready/i);
}

describe('Share section', () => {
  beforeEach(() => {
    delete window.dataLayer;
    window.dataLayer = [];
  });

  test('shows share buttons after download completes (desktop)', async () => {
    // Desktop: no navigator.share
    const origShare = navigator.share;
    delete navigator.share;

    await completeDownload();

    expect(screen.getByLabelText('Share on WhatsApp')).toBeInTheDocument();
    expect(screen.getByLabelText('Share on Facebook')).toBeInTheDocument();
    expect(screen.getByLabelText('Share on X')).toBeInTheDocument();
    expect(screen.getByLabelText('Share on Telegram')).toBeInTheDocument();
    expect(screen.getByLabelText('Copy link')).toBeInTheDocument();

    navigator.share = origShare;
  });

  test('clicking WhatsApp opens share URL in new tab', async () => {
    const origShare = navigator.share;
    delete navigator.share;
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    await completeDownload();

    fireEvent.click(screen.getByLabelText('Share on WhatsApp'));

    expect(openSpy).toHaveBeenCalledTimes(1);
    const calledUrl = openSpy.mock.calls[0][0];
    expect(calledUrl).toContain('https://wa.me/?text=');
    expect(openSpy.mock.calls[0][2]).toContain('noopener');

    openSpy.mockRestore();
    navigator.share = origShare;
  });

  test('clicking Copy writes URL to clipboard and shows snackbar', async () => {
    const origShare = navigator.share;
    delete navigator.share;
    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: writeTextMock } });

    await completeDownload();

    fireEvent.click(screen.getByLabelText('Copy link'));

    await waitFor(() => expect(writeTextMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Link copied to clipboard')).toBeInTheDocument());

    navigator.share = origShare;
  });

  test('toggle switches between Share link and Share file', async () => {
    const origShare = navigator.share;
    delete navigator.share;

    await completeDownload();

    const linkTab = screen.getByRole('tab', { name: /share link/i });
    const fileTab = screen.getByRole('tab', { name: /share file/i });

    expect(linkTab).toHaveAttribute('aria-selected', 'true');
    expect(fileTab).toHaveAttribute('aria-selected', 'false');

    fireEvent.click(fileTab);

    expect(fileTab).toHaveAttribute('aria-selected', 'true');
    expect(linkTab).toHaveAttribute('aria-selected', 'false');

    // On desktop, file share mode disables platform buttons
    expect(screen.getByLabelText('Share on WhatsApp')).toBeDisabled();

    navigator.share = origShare;
  });

  test('analytics event fires on share click', async () => {
    const origShare = navigator.share;
    delete navigator.share;
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    await completeDownload();

    fireEvent.click(screen.getByLabelText('Share on Facebook'));

    expect(window.dataLayer).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ event: 'share_initiated', shareTarget: 'facebook', profile: 'standard_video' }),
      ])
    );

    openSpy.mockRestore();
    navigator.share = origShare;
  });

  test('analytics event fires on copy click', async () => {
    const origShare = navigator.share;
    delete navigator.share;
    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: writeTextMock } });

    await completeDownload();

    fireEvent.click(screen.getByLabelText('Copy link'));

    await waitFor(() => {
      expect(window.dataLayer).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ event: 'share_initiated', shareTarget: 'copy', profile: 'standard_video' }),
        ])
      );
    });

    navigator.share = origShare;
  });
});
