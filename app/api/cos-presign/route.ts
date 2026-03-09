import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { generateAudioPath } from '@/lib/audio-paths';

const cosClient = new S3Client({
  region: process.env.COS_REGION || 'ap-guangzhou',
  endpoint: process.env.COS_ENDPOINT || `https://cos.${process.env.COS_REGION || 'ap-guangzhou'}.myqcloud.com`,
  credentials: {
    accessKeyId: process.env.COS_SECRET_ID || '',
    secretAccessKey: process.env.COS_SECRET_KEY || '',
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const { videoId, subtitleId } = await request.json();
  if (!videoId || !subtitleId) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 });
  }

  const key = generateAudioPath(user.id, videoId, String(subtitleId));
  const bucket = process.env.COS_BUCKET || '';
  const audioDomain = process.env.NEXT_PUBLIC_AUDIO_DOMAIN || process.env.NEXT_PUBLIC_COS_DOMAIN || '';

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: 'audio/webm',
    ChecksumAlgorithm: undefined,
  });

  const rawUrl = await getSignedUrl(cosClient, command, {
    expiresIn: 300,
    unhoistableHeaders: new Set(['x-amz-checksum-algorithm', 'x-amz-sdk-checksum-algorithm']),
  });

  // 过滤掉 COS 不支持的 checksum 参数
  const urlObj = new URL(rawUrl);
  urlObj.searchParams.delete('x-amz-checksum-algorithm');
  urlObj.searchParams.delete('X-Amz-Sdk-Checksum-Algorithm');
  urlObj.searchParams.delete('x-amz-sdk-checksum-algorithm');
  const uploadUrl = urlObj.toString();
  const audioUrl = `${audioDomain}/${key}`;

  return NextResponse.json({ uploadUrl, audioUrl, key });
}
