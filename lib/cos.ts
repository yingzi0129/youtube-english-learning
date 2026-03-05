import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const COS_SECRET_ID = process.env.COS_SECRET_ID || '';
const COS_SECRET_KEY = process.env.COS_SECRET_KEY || '';
const COS_REGION = process.env.COS_REGION || '';
const COS_BUCKET = process.env.COS_BUCKET || '';
const COS_ENDPOINT =
  process.env.COS_ENDPOINT || (COS_REGION ? `https://cos.${COS_REGION}.myqcloud.com` : '');
const COS_DOMAIN = process.env.NEXT_PUBLIC_COS_DOMAIN || '';

const cosClient = new S3Client({
  region: COS_REGION || 'ap-guangzhou',
  endpoint: COS_ENDPOINT || undefined,
  credentials: {
    accessKeyId: COS_SECRET_ID,
    secretAccessKey: COS_SECRET_KEY,
  },
});

export async function uploadToCos(
  key: string,
  buffer: Buffer,
  contentType: string,
  options?: { cacheControl?: string }
): Promise<string> {
  if (!COS_BUCKET || !COS_DOMAIN) {
    throw new Error('COS 配置缺失：请检查 COS_BUCKET / NEXT_PUBLIC_COS_DOMAIN');
  }

  const command = new PutObjectCommand({
    Bucket: COS_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: options?.cacheControl,
  });

  await cosClient.send(command);
  return `${COS_DOMAIN}/${key}`;
}

export async function deleteFromCos(key: string): Promise<void> {
  if (!COS_BUCKET || !COS_SECRET_ID || !COS_SECRET_KEY || !COS_REGION) {
    throw new Error('COS 配置缺失，无法删除对象');
  }

  const command = new DeleteObjectCommand({
    Bucket: COS_BUCKET,
    Key: key,
  });

  await cosClient.send(command);
}
