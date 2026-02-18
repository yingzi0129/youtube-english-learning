import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET = process.env.R2_BUCKET || 'yutobe-videos';
const R2_DOMAIN = process.env.NEXT_PUBLIC_R2_DOMAIN || '';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * 生成带日期的音频文件路径
 * @param userId 用户ID
 * @param videoId 视频ID
 * @param subtitleId 字幕ID
 * @returns 格式：audio/2026/02/18/userId/videoId/subtitleId.webm
 */
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

/**
 * 上传文件到 R2
 * @param key 文件路径
 * @param buffer 文件内容
 * @param contentType 文件类型
 * @returns 公开访问 URL
 */
export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await r2Client.send(command);
  return `${R2_DOMAIN}/${key}`;
}
