export const DEFAULT_OUTPUT_PROFILE = 'standard_video';

export const OUTPUT_PROFILES = [
  {
    value: 'standard_video',
    label: 'Standard MP4',
    shortLabel: 'MP4',
    tagline: 'Recommended',
    description: 'Best quality for general playback and archiving.',
    extension: 'mp4',
    mimeType: 'video/mp4',
    mediaType: 'video',
  },
  {
    value: 'whatsapp_video',
    label: 'WhatsApp Video',
    shortLabel: 'WhatsApp',
    tagline: 'Up to 16 MiB',
    description: 'Re-encoded to fit the WhatsApp Cloud API size limit.',
    extension: 'mp4',
    mimeType: 'video/mp4',
    mediaType: 'video',
  },
  {
    value: 'audio_m4a',
    label: 'Audio Only',
    shortLabel: 'M4A',
    tagline: 'M4A audio',
    description: 'Extracts the audio track into a compact M4A file.',
    extension: 'm4a',
    mimeType: 'audio/mp4',
    mediaType: 'audio',
  },
];

export const OUTPUT_PROFILE_VALUES = OUTPUT_PROFILES.map((profile) => profile.value);

export function getOutputProfile(value) {
  return OUTPUT_PROFILES.find((profile) => profile.value === value) || OUTPUT_PROFILES[0];
}

export function describeProgress(profileValue, progress) {
  const profile = getOutputProfile(profileValue);
  const value = Number.isFinite(progress) ? progress : 0;

  if (profile.value === 'whatsapp_video') {
    if (value < 75) return 'Downloading source video';
    if (value < 90) return 'Optimizing for WhatsApp';
    return 'Finalizing file';
  }

  if (profile.value === 'audio_m4a') {
    if (value < 90) return 'Downloading source video';
    return 'Extracting audio';
  }

  if (value >= 100) return 'Finalizing file';
  return 'Downloading source video';
}

export function buildFileName(uploadId, profileValue) {
  const profile = getOutputProfile(profileValue);
  return `${uploadId || 'download'}.${profile.extension}`;
}
