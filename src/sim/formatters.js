

export function formatTime(sec) {
  // return time in format m:ss.xxx (m - minutes, s - seconds, x - miliseconds)
  if (!Number.isFinite(sec)) {
    return '0:00.000';
  }

  const sign = sec < 0 ? '-' : '';
  const totalMs = Math.round(Math.abs(sec) * 1000);
  const minutes = Math.floor(totalMs / 60000);
  const seconds = (totalMs - minutes * 60000) / 1000;

  return `${sign}${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
}