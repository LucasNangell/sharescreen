function getLiveVideoTrack(stream) {
  return stream?.getVideoTracks?.().find((track) => track.readyState === 'live') || null;
}

function getVideoDimensions(videoEl, fallbackStream) {
  const fallbackTrack = getLiveVideoTrack(fallbackStream);
  const settings = fallbackTrack?.getSettings?.() || {};
  const width = videoEl?.videoWidth || settings.width || 1280;
  const height = videoEl?.videoHeight || settings.height || 720;
  return {
    width: Math.max(2, Math.floor(width)),
    height: Math.max(2, Math.floor(height))
  };
}

function createFallbackVideo(fallbackStream) {
  if (!getLiveVideoTrack(fallbackStream)) return null;
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.srcObject = fallbackStream;
  video.play().catch(() => {});
  return video;
}

function drawBadge(ctx, canvas, text) {
  const label = String(text || '').trim();
  if (!label) return;

  const fontSize = 11;
  const paddingX = 14;
  const paddingTop = 3;
  const paddingBottom = 5;
  const radius = 5;
  const maxWidth = Math.min(420, Math.round(canvas.width * 0.72));

  ctx.save();
  ctx.font = `400 ${fontSize}px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  let displayText = label;
  let textWidth = ctx.measureText(displayText).width;
  if (textWidth > maxWidth - paddingX * 2) {
    while (displayText.length > 1 && ctx.measureText(`${displayText}...`).width > maxWidth - paddingX * 2) {
      displayText = displayText.slice(0, -1);
    }
    displayText = `${displayText}...`;
    textWidth = ctx.measureText(displayText).width;
  }

  const width = Math.min(maxWidth, Math.ceil(textWidth + paddingX * 2));
  const height = fontSize * 1.35 + paddingTop + paddingBottom;
  const x = Math.round((canvas.width - width) / 2);
  const y = 0;
  const bottom = y + height;

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, bottom - radius);
  ctx.quadraticCurveTo(x + width, bottom, x + width - radius, bottom);
  ctx.lineTo(x + radius, bottom);
  ctx.quadraticCurveTo(x, bottom, x, bottom - radius);
  ctx.closePath();

  const gradient = ctx.createLinearGradient(0, y, 0, bottom);
  gradient.addColorStop(0, '#5a9fd4');
  gradient.addColorStop(0.55, '#2a6eb5');
  gradient.addColorStop(1, '#1e5a96');
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.strokeStyle = '#174a7a';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#fff';
  ctx.fillText(displayText, x + width / 2, y + height / 2);
  ctx.restore();
}

function drawVideoFrame(ctx, canvas, source) {
  if (!source || source.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return false;
  if (!source.videoWidth || !source.videoHeight) return false;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return true;
}

export const RecordingCompositor = {
  start({ videoEl, fallbackStream, badgeText, visible = true } = {}) {
    const sourceStream = videoEl?.srcObject instanceof MediaStream ? videoEl.srcObject : fallbackStream;
    const rawTrack = getLiveVideoTrack(sourceStream) || getLiveVideoTrack(fallbackStream);
    if (!rawTrack) return null;

    const canvas = document.createElement('canvas');
    const dims = getVideoDimensions(videoEl, fallbackStream || sourceStream);
    canvas.width = dims.width;
    canvas.height = dims.height;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx || typeof canvas.captureStream !== 'function') {
      console.warn('[RecordingCompositor] canvas.captureStream indisponivel; gravando video bruto');
      return {
        stream: new MediaStream([rawTrack]),
        stop() {}
      };
    }

    const fallbackVideo = createFallbackVideo(fallbackStream);
    let raf = 0;
    let stopped = false;

    const tick = () => {
      if (stopped) return;
      const drawn =
        drawVideoFrame(ctx, canvas, videoEl) ||
        drawVideoFrame(ctx, canvas, fallbackVideo);
      if (!drawn) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      if (visible) drawBadge(ctx, canvas, badgeText);
      raf = requestAnimationFrame(tick);
    };
    tick();

    const capturedStream = canvas.captureStream(30);

    return {
      stream: capturedStream,
      stop() {
        stopped = true;
        if (raf) cancelAnimationFrame(raf);
        for (const track of capturedStream.getTracks()) {
          track.stop();
        }
        if (fallbackVideo) {
          fallbackVideo.pause();
          fallbackVideo.srcObject = null;
        }
      }
    };
  }
};
