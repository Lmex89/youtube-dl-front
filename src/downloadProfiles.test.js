import {
  OUTPUT_PROFILE_VALUES,
  buildFileName,
  describeProgress,
  getOutputProfile,
} from './downloadProfiles';

test('exposes the three backend output profiles', () => {
  expect(OUTPUT_PROFILE_VALUES).toEqual(['standard_video', 'whatsapp_video', 'audio_m4a']);
});

test('defaults unknown profile values to standard video', () => {
  expect(getOutputProfile('does_not_exist').value).toBe('standard_video');
  expect(getOutputProfile(undefined).value).toBe('standard_video');
});

test('maps progress bands for the whatsapp profile', () => {
  expect(describeProgress('whatsapp_video', 10)).toBe('Downloading source video');
  expect(describeProgress('whatsapp_video', 80)).toBe('Optimizing for WhatsApp');
  expect(describeProgress('whatsapp_video', 95)).toBe('Finalizing file');
});

test('maps progress bands for the audio profile', () => {
  expect(describeProgress('audio_m4a', 50)).toBe('Downloading source video');
  expect(describeProgress('audio_m4a', 92)).toBe('Extracting audio');
});

test('maps progress bands for the standard profile', () => {
  expect(describeProgress('standard_video', 20)).toBe('Downloading source video');
  expect(describeProgress('standard_video', 100)).toBe('Finalizing file');
});

test('builds profile-aware file names', () => {
  expect(buildFileName('upload-1', 'standard_video')).toBe('upload-1.mp4');
  expect(buildFileName('upload-2', 'whatsapp_video')).toBe('upload-2.mp4');
  expect(buildFileName('upload-3', 'audio_m4a')).toBe('upload-3.m4a');
});
