import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DownloadApiError,
  downloadFile,
  findUpload,
  getJob,
  submitDownload,
} from '../api/downloads';
import { DEFAULT_OUTPUT_PROFILE, buildFileName, getOutputProfile } from '../downloadProfiles';
import { trackDownloadEvent } from '../analytics';

export const PHASES = {
  IDLE: 'idle',
  SUBMITTING: 'submitting',
  POLLING: 'polling',
  RESOLVING: 'resolving',
  READY: 'ready',
  DOWNLOADING: 'downloading',
  SAVED: 'saved',
  ERROR: 'error',
  TIMED_OUT: 'timed_out',
};

export const BUSY_PHASES = [
  PHASES.SUBMITTING,
  PHASES.POLLING,
  PHASES.RESOLVING,
  PHASES.DOWNLOADING,
];

const POLL_INTERVAL = 1500;
const POLL_INTERVAL_MAX = 10000;
const POLL_JITTER = 300;
const POLLING_TIMEOUT = 15 * 60 * 1000;
const SUBMIT_COOLDOWN = 60 * 1000;
const UPLOAD_LOOKUP_RETRY_DELAY = 1500;

const STORAGE_KEY = 'youtube_dl_pending_download:v2';
const LEGACY_STORAGE_KEY = 'youtube_dl_pending_download';

function createInitialState(overrides = {}) {
  return {
    phase: PHASES.IDLE,
    jobId: null,
    profile: DEFAULT_OUTPUT_PROFILE,
    sourceUrl: '',
    progress: 0,
    upload: null,
    error: null,
    notice: '',
    saveProgress: 0,
    submitCooldownUntil: 0,
    ...overrides,
  };
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function withJitter(ms) {
  return ms + Math.round(Math.random() * POLL_JITTER);
}

function readPersistedJob() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      parsed.version === 2 &&
      typeof parsed.jobId === 'string' &&
      Number.isFinite(parsed.startedAt)
    ) {
      return parsed;
    }
    return null;
  } catch (error) {
    return null;
  }
}

function writePersistedJob(run) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 2,
        jobId: run.jobId,
        profile: run.profile,
        sourceUrl: run.sourceUrl,
        startedAt: run.startedAt,
      })
    );
  } catch (error) {
    return;
  }
}

function clearPersistedJob() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    return;
  }
}

function discardLegacyJob() {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (error) {
    return;
  }
}

function toApiError(error) {
  if (error instanceof DownloadApiError) return error;
  return new DownloadApiError({
    kind: 'unknown',
    message: error?.message || 'The download failed unexpectedly',
  });
}

export function useDownloadJob() {
  const [state, setState] = useState(() => createInitialState());
  const stateRef = useRef(state);
  stateRef.current = state;

  const runRef = useRef(null);
  const timerRef = useRef(null);
  const requestRef = useRef(null);
  const mountedRef = useRef(true);

  const orchestration = useMemo(() => {
    function stopCurrentRequest() {
      if (requestRef.current) {
        requestRef.current.abort();
        requestRef.current = null;
      }
    }

    function clearTimer() {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    function detachRun() {
      clearTimer();
      stopCurrentRequest();
      runRef.current = null;
    }

    function isCurrentRun(run) {
      return mountedRef.current && runRef.current === run;
    }

    function finishRun() {
      clearTimer();
      stopCurrentRequest();
      runRef.current = null;
      clearPersistedJob();
    }

    function failRun(run, error) {
      if (!isCurrentRun(run)) return;
      finishRun();
      const normalized = toApiError(error);
      setState((prev) => ({
        ...prev,
        phase: PHASES.ERROR,
        error: normalized,
        notice: '',
      }));
      trackDownloadEvent('download_failed', {
        profile: run.profile,
        status: normalized.status || 0,
      });
    }

    function timeOutRun(run) {
      if (!isCurrentRun(run)) return;
      finishRun();
      setState((prev) => ({
        ...prev,
        phase: PHASES.TIMED_OUT,
        notice: '',
      }));
      trackDownloadEvent('download_timed_out', {
        profile: run.profile,
        elapsed_seconds: Math.round((Date.now() - run.startedAt) / 1000),
      });
    }

    function schedulePoll(run, delayMs) {
      if (!isCurrentRun(run)) return;
      clearTimer();
      timerRef.current = setTimeout(() => {
        pollOnce(run);
      }, delayMs);
    }

    async function resolveUpload(run) {
      if (!isCurrentRun(run)) return;
      setState((prev) => ({
        ...prev,
        phase: PHASES.RESOLVING,
        progress: 100,
        notice: 'Processing finished. Locating your file...',
      }));

      let upload = null;
      try {
        upload = await findUpload(run.jobId, { signal: requestRef.current?.signal });
        if (!upload && isCurrentRun(run)) {
          await delay(UPLOAD_LOOKUP_RETRY_DELAY);
          if (!isCurrentRun(run)) return;
          upload = await findUpload(run.jobId, { signal: requestRef.current?.signal });
        }
      } catch (error) {
        if (!isCurrentRun(run)) return;
        if (error?.kind === 'cancelled') return;
        failRun(run, error);
        return;
      }

      if (!isCurrentRun(run)) return;

      if (!upload) {
        failRun(
          run,
          new DownloadApiError({
            kind: 'http',
            status: 404,
            message: 'The download finished but the file record could not be found. Please try again.',
          })
        );
        return;
      }

      finishRun();
      setState((prev) => ({
        ...prev,
        phase: PHASES.READY,
        progress: 100,
        upload,
        notice: '',
      }));
      trackDownloadEvent('download_finished', {
        profile: run.profile,
        seconds: Math.round((Date.now() - run.startedAt) / 1000),
      });
    }

    async function pollOnce(run) {
      if (!isCurrentRun(run)) return;

      const controller = new AbortController();
      requestRef.current = controller;

      let job;
      try {
        job = await getJob(run.jobId, { signal: controller.signal });
      } catch (error) {
        if (!isCurrentRun(run)) return;
        if (error?.kind === 'cancelled') return;

        const transient =
          error?.kind === 'timeout' ||
          error?.kind === 'network' ||
          error?.status === 429 ||
          (Number.isFinite(error?.status) && error.status >= 500);

        if (!transient) {
          failRun(run, error);
          return;
        }

        if (Date.now() - run.startedAt >= POLLING_TIMEOUT) {
          timeOutRun(run);
          return;
        }

        if (error?.status === 429) {
          run.pollInterval = Math.min(Math.max(run.pollInterval, POLL_INTERVAL) * 2, POLL_INTERVAL_MAX);
          setState((prev) => ({
            ...prev,
            notice: 'The server is receiving many requests. Retrying shortly...',
          }));
        } else {
          setState((prev) => ({
            ...prev,
            notice: 'Connection hiccup. Retrying...',
          }));
        }

        schedulePoll(run, withJitter(run.pollInterval));
        return;
      }

      if (!isCurrentRun(run)) return;

      const progressValue = Number.isFinite(job?.progress) ? job.progress : 0;
      setState((prev) => ({
        ...prev,
        phase: PHASES.POLLING,
        profile: job?.output_profile || prev.profile,
        progress: Math.max(prev.progress, progressValue),
        notice: '',
      }));

      if (job?.status === 1) {
        await resolveUpload(run);
        return;
      }

      if (job?.status === 3) {
        failRun(
          run,
          new DownloadApiError({
            kind: 'job',
            status: 3,
            message: 'The server could not process this video. Please try again.',
          })
        );
        return;
      }

      if (Date.now() - run.startedAt >= POLLING_TIMEOUT) {
        timeOutRun(run);
        return;
      }

      run.pollInterval = POLL_INTERVAL;
      schedulePoll(run, withJitter(run.pollInterval));
    }

    function startRun({ jobId, profile, sourceUrl, startedAt }) {
      detachRun();
      const run = {
        jobId,
        profile,
        sourceUrl,
        startedAt: startedAt ?? Date.now(),
        pollInterval: POLL_INTERVAL,
      };
      runRef.current = run;
      writePersistedJob(run);
      setState(
        createInitialState({
          phase: PHASES.POLLING,
          jobId,
          profile,
          sourceUrl,
          notice: 'Starting download...',
        })
      );
      pollOnce(run);
    }

    async function startDownload(url, profile) {
      if (BUSY_PHASES.includes(stateRef.current.phase)) return;

      detachRun();
      const controller = new AbortController();
      requestRef.current = controller;
      const selectedProfile = getOutputProfile(profile).value;

      setState(
        createInitialState({
          phase: PHASES.SUBMITTING,
          profile: selectedProfile,
          sourceUrl: url,
          notice: 'Submitting your link...',
        })
      );

      try {
        const job = await submitDownload(url, selectedProfile, { signal: controller.signal });
        if (!mountedRef.current) return;
        const jobId = job?.id;
        if (!jobId) {
          throw new DownloadApiError({
            kind: 'http',
            status: 202,
            message: 'The server accepted the request but did not return a job id.',
          });
        }
        trackDownloadEvent('download_submitted', { profile: selectedProfile });
        startRun({ jobId, profile: selectedProfile, sourceUrl: url, startedAt: Date.now() });
      } catch (error) {
        if (!mountedRef.current) return;
        if (error?.kind === 'cancelled') return;

        if (error?.status === 429) {
          setState(
            createInitialState({
              phase: PHASES.IDLE,
              profile: selectedProfile,
              sourceUrl: url,
              error,
              submitCooldownUntil: Date.now() + SUBMIT_COOLDOWN,
            })
          );
          return;
        }

        setState(
          createInitialState({
            phase: PHASES.ERROR,
            profile: selectedProfile,
            sourceUrl: url,
            error: toApiError(error),
          })
        );
      } finally {
        if (requestRef.current === controller) {
          requestRef.current = null;
        }
      }
    }

    function cancelJob() {
      const run = runRef.current;
      const elapsed = run ? Math.round((Date.now() - run.startedAt) / 1000) : 0;
      const profile = run?.profile || stateRef.current.profile;

      detachRun();
      clearPersistedJob();
      setState(
        createInitialState({
          profile,
          sourceUrl: stateRef.current.sourceUrl,
          notice: 'Download cancelled.',
        })
      );

      if (run) {
        trackDownloadEvent('download_cancelled', { profile, elapsed_seconds: elapsed });
      }
    }

    async function saveFile() {
      const current = stateRef.current;
      if (!current.upload || current.phase === PHASES.DOWNLOADING) return;

      const profile = getOutputProfile(current.profile);
      setState((prev) => ({
        ...prev,
        phase: PHASES.DOWNLOADING,
        saveProgress: 0,
        error: null,
        notice: 'Saving file...',
      }));

      const controller = new AbortController();
      requestRef.current = controller;

      try {
        const response = await downloadFile(current.upload.id, {
          signal: controller.signal,
          onProgress: (value) => {
            if (!mountedRef.current) return;
            setState((prev) => ({ ...prev, saveProgress: value }));
          },
        });

        if (!mountedRef.current) return;

        const contentType = response?.headers?.['content-type'] || profile.mimeType;
        const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: contentType }));
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', buildFileName(current.upload.id, profile.value));
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);

        setState((prev) => ({
          ...prev,
          phase: PHASES.SAVED,
          saveProgress: 100,
          notice: '',
        }));
      } catch (error) {
        if (!mountedRef.current) return;
        if (error?.kind === 'cancelled') return;
        setState((prev) => ({
          ...prev,
          phase: PHASES.READY,
          saveProgress: 0,
          error: toApiError(error),
          notice: '',
        }));
      } finally {
        if (requestRef.current === controller) {
          requestRef.current = null;
        }
      }
    }

    function retry() {
      const current = stateRef.current;
      if (current.upload) {
        saveFile();
        return;
      }
      if (current.sourceUrl) {
        startDownload(current.sourceUrl, current.profile);
      }
    }

    function reset() {
      detachRun();
      clearPersistedJob();
      setState(createInitialState());
    }

    function resume() {
      discardLegacyJob();
      const stored = readPersistedJob();
      if (!stored) return;

      const elapsed = Date.now() - stored.startedAt;
      if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed >= POLLING_TIMEOUT) {
        clearPersistedJob();
        return;
      }

      const profile = getOutputProfile(stored.profile).value;
      const run = {
        jobId: stored.jobId,
        profile,
        sourceUrl: typeof stored.sourceUrl === 'string' ? stored.sourceUrl : '',
        startedAt: stored.startedAt,
        pollInterval: POLL_INTERVAL,
      };
      runRef.current = run;
      setState(
        createInitialState({
          phase: PHASES.POLLING,
          jobId: run.jobId,
          profile,
          sourceUrl: run.sourceUrl,
          notice: 'Resuming download...',
        })
      );
      pollOnce(run);
    }

    function suspend() {
      detachRun();
    }

    return { startDownload, cancelJob, saveFile, retry, reset, resume, suspend };
  }, []);

  const { startDownload, cancelJob, saveFile, retry, reset, resume, suspend } = orchestration;

  useEffect(() => {
    mountedRef.current = true;
    resume();
    return () => {
      mountedRef.current = false;
      suspend();
    };
  }, [resume, suspend]);

  return {
    ...state,
    isBusy: BUSY_PHASES.includes(state.phase),
    startDownload,
    cancelJob,
    saveFile,
    retry,
    reset,
  };
}
