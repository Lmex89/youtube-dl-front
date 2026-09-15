import { act, renderHook, waitFor } from '@testing-library/react';
import { PHASES, useDownloadJob } from './useDownloadJob';
import { downloadFile, findUpload, getJob, submitDownload } from '../api/downloads';

jest.mock('../api/downloads', () => {
  const actual = jest.requireActual('../api/downloads');
  return {
    ...actual,
    submitDownload: jest.fn(),
    getJob: jest.fn(),
    findUpload: jest.fn(),
    downloadFile: jest.fn(),
  };
});

const STORAGE_KEY = 'youtube_dl_pending_download:v2';

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
});

test('runs submit, poll and resolve through to ready', async () => {
  submitDownload.mockResolvedValue({ id: 'job-1', status: 'pending', output_profile: 'standard_video' });
  getJob.mockResolvedValue({ id: 'job-1', status: 1, progress: 100, output_profile: 'standard_video' });
  findUpload.mockResolvedValue({ id: 'upload-1', codecurl: 'job-1' });

  const { result } = renderHook(() => useDownloadJob());

  await act(async () => {
    await result.current.startDownload('https://youtu.be/jNQXAC9IVRw', 'standard_video');
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  await waitFor(() => expect(result.current.phase).toBe(PHASES.READY));
  expect(result.current.upload).toEqual({ id: 'upload-1', codecurl: 'job-1' });
  expect(result.current.progress).toBe(100);
  expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
});

test('shows an error phase when the job reports status 3', async () => {
  submitDownload.mockResolvedValue({ id: 'job-2', status: 'pending', output_profile: 'standard_video' });
  getJob.mockResolvedValue({ id: 'job-2', status: 3, progress: 42, output_profile: 'standard_video' });

  const { result } = renderHook(() => useDownloadJob());

  await act(async () => {
    await result.current.startDownload('https://youtu.be/jNQXAC9IVRw', 'standard_video');
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  await waitFor(() => expect(result.current.phase).toBe(PHASES.ERROR));
  expect(result.current.error.status).toBe(3);
  expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
});

test('keeps polling while the job is pending and can be cancelled', async () => {
  submitDownload.mockResolvedValue({ id: 'job-3', status: 'pending', output_profile: 'whatsapp_video' });
  getJob.mockResolvedValue({ id: 'job-3', status: 2, progress: 25, output_profile: 'whatsapp_video' });

  const { result } = renderHook(() => useDownloadJob());

  await act(async () => {
    await result.current.startDownload('https://youtu.be/jNQXAC9IVRw', 'whatsapp_video');
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  await waitFor(() => expect(result.current.progress).toBe(25));
  expect(result.current.phase).toBe(PHASES.POLLING);
  expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();

  act(() => {
    result.current.cancelJob();
  });

  expect(result.current.phase).toBe(PHASES.IDLE);
  expect(result.current.notice).toBe('Download cancelled.');
  expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
});

test('resumes a persisted job that is still within the time budget', async () => {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: 2,
      jobId: 'job-4',
      profile: 'audio_m4a',
      sourceUrl: 'https://youtu.be/jNQXAC9IVRw',
      startedAt: Date.now() - 5000,
    })
  );
  getJob.mockResolvedValue({ id: 'job-4', status: 2, progress: 12, output_profile: 'audio_m4a' });

  const { result } = renderHook(() => useDownloadJob());

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  await waitFor(() => expect(getJob).toHaveBeenCalledWith('job-4', expect.anything()));
  expect(result.current.profile).toBe('audio_m4a');
  expect(result.current.sourceUrl).toBe('https://youtu.be/jNQXAC9IVRw');
});

test('discards a persisted job that exceeded the time budget', async () => {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: 2,
      jobId: 'job-5',
      profile: 'standard_video',
      sourceUrl: 'https://youtu.be/jNQXAC9IVRw',
      startedAt: Date.now() - 16 * 60 * 1000,
    })
  );

  const { result } = renderHook(() => useDownloadJob());

  await waitFor(() => expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull());
  expect(getJob).not.toHaveBeenCalled();
  expect(result.current.phase).toBe(PHASES.IDLE);
});

test('saveFile downloads the resolved upload and marks the phase as saved', async () => {
  submitDownload.mockResolvedValue({ id: 'job-6', status: 'pending', output_profile: 'audio_m4a' });
  getJob.mockResolvedValue({ id: 'job-6', status: 1, progress: 100, output_profile: 'audio_m4a' });
  findUpload.mockResolvedValue({ id: 'upload-6', codecurl: 'job-6' });
  downloadFile.mockResolvedValue({
    data: new Blob(['audio']),
    headers: { 'content-type': 'audio/mp4' },
  });
  const createObjectURL = jest.fn(() => 'blob:mock-url');
  const revokeObjectURL = jest.fn();
  window.URL.createObjectURL = createObjectURL;
  window.URL.revokeObjectURL = revokeObjectURL;
  const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

  const { result } = renderHook(() => useDownloadJob());

  await act(async () => {
    await result.current.startDownload('https://youtu.be/jNQXAC9IVRw', 'audio_m4a');
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  await waitFor(() => expect(result.current.phase).toBe(PHASES.READY));

  await act(async () => {
    await result.current.saveFile();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(downloadFile).toHaveBeenCalledWith('upload-6', expect.objectContaining({ signal: expect.anything() }));
  expect(createObjectURL).toHaveBeenCalled();
  expect(clickSpy).toHaveBeenCalled();
  expect(result.current.phase).toBe(PHASES.SAVED);
  expect(result.current.saveProgress).toBe(100);
});
