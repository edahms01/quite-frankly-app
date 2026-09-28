export function countdownTime(isoDate) {
  if (!isoDate) return null;
  const diffMs = new Date(isoDate).getTime() - Date.now();
  if (diffMs <= 0) return null;
  const totalMinutes = Math.ceil(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}
