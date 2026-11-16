export function buildShareText(mediaType, title, url) {
  const safeTitle = title || 'Downloaded media';
  if (mediaType === 'audio') {
    return `Listen: ${safeTitle} ${url}`;
  }
  return `Check out ${safeTitle} ${url}`;
}

export function buildShareUrl(platform, url, text) {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  switch (platform) {
    case 'whatsapp':
      return `https://wa.me/?text=${encodedText}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    case 'x':
      return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
    case 'telegram':
      return `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
    default:
      return url;
  }
}
