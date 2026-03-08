export function generateAudioPath(
  userId: string,
  videoId: string,
  subtitleId: string
): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `audio/${year}/${month}/${day}/${userId}/${videoId}/${subtitleId}.webm`;
}
