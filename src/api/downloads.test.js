import axios from 'axios';
import {
  API_TIMEOUTS,
  DownloadApiError,
  downloadFile,
  findUpload,
  normalizeApiError,
  submitDownload,
} from './downloads';

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  return {
    ...actual,
    get: jest.fn(),
    post: jest.fn(),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

test('submitDownload posts the url and the selected output profile', async () => {
  axios.post.mockResolvedValue({ data: { id: 'job-1', output_profile: 'audio_m4a' } });

  await submitDownload('https://youtu.be/jNQXAC9IVRw', 'audio_m4a');

  expect(axios.post).toHaveBeenCalledWith(
    expect.stringContaining('/api/v1/yt/videos-uploaded/'),
    { url: 'https://youtu.be/jNQXAC9IVRw', output_profile: 'audio_m4a' },
    expect.objectContaining({ timeout: API_TIMEOUTS.submit })
  );
});

test('findUpload matches the record whose codecurl equals the job id', async () => {
  axios.get.mockResolvedValue({
    data: [
      { id: 'other', codecurl: 'job-other' },
      { id: 'upload-1', codecurl: 'job-1' },
    ],
  });

  await expect(findUpload('job-1')).resolves.toEqual({ id: 'upload-1', codecurl: 'job-1' });
  await expect(findUpload('missing')).resolves.toBeNull();
});

test('downloadFile requests a blob and reports progress', async () => {
  axios.get.mockImplementation((url, options) => {
    options.onDownloadProgress({ loaded: 50, total: 100 });
    return Promise.resolve({ data: 'binary', headers: { 'content-type': 'audio/mp4' } });
  });

  const onProgress = jest.fn();
  await downloadFile('upload-1', { onProgress });

  expect(onProgress).toHaveBeenCalledWith(50);
  expect(axios.get).toHaveBeenCalledWith(
    expect.stringContaining('/api/v1/yt/videos-uploaded/upload-1'),
    expect.objectContaining({ responseType: 'blob', timeout: API_TIMEOUTS.download })
  );
});

test('normalizeApiError preserves 400 details and allowed profiles', async () => {
  const normalized = await normalizeApiError({
    response: {
      status: 400,
      data: {
        error: 'unsupported output_profile',
        allowed: ['audio_m4a', 'standard_video', 'whatsapp_video'],
      },
    },
  });

  expect(normalized).toBeInstanceOf(DownloadApiError);
  expect(normalized.kind).toBe('http');
  expect(normalized.status).toBe(400);
  expect(normalized.message).toBe('unsupported output_profile');
  expect(normalized.allowed).toEqual(['audio_m4a', 'standard_video', 'whatsapp_video']);
});

test('normalizeApiError parses JSON error payloads delivered as blobs', async () => {
  const normalized = await normalizeApiError({
    response: {
      status: 404,
      data: { text: async () => '{"error":"file not found"}' },
    },
  });

  expect(normalized.status).toBe(404);
  expect(normalized.message).toBe('file not found');
});

test('normalizeApiError classifies timeouts and network failures', async () => {
  const timeout = await normalizeApiError({ code: 'ECONNABORTED', message: 'timeout of 10000ms exceeded' });
  expect(timeout.kind).toBe('timeout');

  const network = await normalizeApiError(new Error('Network Error'));
  expect(network.kind).toBe('network');
  expect(network.message).toBe('Network Error');
});

test('normalizeApiError classifies cancellations', async () => {
  const normalized = await normalizeApiError({ name: 'CanceledError', message: 'canceled' });
  expect(normalized.kind).toBe('cancelled');
});
