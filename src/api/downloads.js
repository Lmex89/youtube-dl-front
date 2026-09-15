import axios from 'axios';
import config from '../config';

export const API_TIMEOUTS = {
  submit: 60000,
  poll: 10000,
  list: 10000,
  download: 300000,
};

export class DownloadApiError extends Error {
  constructor({ kind, status = null, message, detail = null, allowed = null }) {
    super(message);
    this.name = 'DownloadApiError';
    this.kind = kind;
    this.status = status;
    this.detail = detail;
    this.allowed = allowed;
  }
}

function isCanceled(error) {
  return Boolean(
    axios.isCancel(error) ||
      error?.code === 'ERR_CANCELED' ||
      error?.name === 'CanceledError' ||
      error?.name === 'AbortError'
  );
}

async function readResponsePayload(data) {
  if (data && typeof data.text === 'function') {
    try {
      const text = await data.text();
      return text ? JSON.parse(text) : {};
    } catch (error) {
      return {};
    }
  }
  return data && typeof data === 'object' ? data : {};
}

export async function normalizeApiError(error) {
  if (isCanceled(error)) {
    return new DownloadApiError({ kind: 'cancelled', message: 'Request cancelled' });
  }

  if (error?.response) {
    const payload = await readResponsePayload(error.response.data);
    const status = error.response.status;
    const message =
      typeof payload.error === 'string'
        ? payload.error
        : typeof payload.detail === 'string'
          ? payload.detail
          : `Request failed with status ${status}`;

    return new DownloadApiError({
      kind: 'http',
      status,
      message,
      detail: typeof payload.detail === 'string' ? payload.detail : null,
      allowed: Array.isArray(payload.allowed) ? payload.allowed : null,
    });
  }

  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
    return new DownloadApiError({ kind: 'timeout', message: 'The request timed out' });
  }

  return new DownloadApiError({ kind: 'network', message: error?.message || 'Network error' });
}

export async function submitDownload(url, outputProfile, { signal } = {}) {
  try {
    const response = await axios.post(
      `${config.API_URL}/api/v1/yt/videos-uploaded/`,
      { url, output_profile: outputProfile },
      { timeout: API_TIMEOUTS.submit, signal }
    );
    return response.data;
  } catch (error) {
    throw await normalizeApiError(error);
  }
}

export async function getJob(jobId, { signal } = {}) {
  try {
    const response = await axios.get(`${config.API_URL}/api/v1/yt/videos/${jobId}`, {
      timeout: API_TIMEOUTS.poll,
      signal,
    });
    return response.data;
  } catch (error) {
    throw await normalizeApiError(error);
  }
}

export async function findUpload(jobId, { signal } = {}) {
  try {
    const response = await axios.get(`${config.API_URL}/api/v1/yt/videos-uploaded/`, {
      timeout: API_TIMEOUTS.list,
      signal,
    });
    const items = Array.isArray(response.data) ? response.data : [];
    return items.find((item) => item.codecurl === jobId) || null;
  } catch (error) {
    throw await normalizeApiError(error);
  }
}

export function buildDownloadUrl(uploadId) {
  return `${config.API_URL}/api/v1/yt/videos-uploaded/${uploadId}`;
}

export async function downloadFile(uploadId, { onProgress, signal } = {}) {
  try {
    const response = await axios.get(buildDownloadUrl(uploadId), {
      responseType: 'blob',
      timeout: API_TIMEOUTS.download,
      signal,
      onDownloadProgress: (event) => {
        if (typeof onProgress !== 'function') return;
        if (event.total) {
          onProgress(Math.round((event.loaded * 100) / event.total));
        }
      },
    });
    return response;
  } catch (error) {
    throw await normalizeApiError(error);
  }
}
