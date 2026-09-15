export function trackDownloadEvent(eventName, payload = {}) {
  if (!eventName) return;

  const event = { event: eventName, ...payload };

  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(event);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[analytics] failed to push event', eventName, error);
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.debug('[analytics]', eventName, payload);
  }
}
