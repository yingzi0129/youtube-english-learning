import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { createClient } from '@/lib/supabase/server';
import { isTrialUser } from '@/lib/auth/trial';

export const runtime = 'nodejs';

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const sanitizeFileName = (value: string) =>
  value.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim();

const buildFileName = (title: string) => {
  const safeTitle = sanitizeFileName(title || '视频');
  return `${safeTitle || '视频'}_字幕.docx`;
};

type RouteParams = { id: string } | Promise<{ id: string }>;

const resolveVideoId = async (request: NextRequest, params: RouteParams) => {
  const resolved = await Promise.resolve(params);
  if (resolved?.id) return resolved.id;

  const pathname = request.nextUrl?.pathname || '';
  const parts = pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('videos');
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  return '';
};

export async function GET(request: NextRequest, { params }: { params: RouteParams }) {
  try {
    const videoId = await resolveVideoId(request, params);
    if (!videoId) {
      return NextResponse.json({ error: '视频不存在' }, { status: 404 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const isTrial = isTrialUser(user);
    let videoQuery = supabase
      .from('videos')
      .select('id, title, is_trial')
      .eq('id', videoId)
      .eq('is_deleted', false);

    if (isTrial) {
      videoQuery = videoQuery.eq('is_trial', true);
    }

    const { data: video, error: videoError } = await videoQuery.single();
    if (videoError || !video) {
      return NextResponse.json({ error: '视频不存在' }, { status: 404 });
    }

    const { data: subtitles, error: subtitlesError } = await supabase
      .from('subtitles')
      .select('sequence, start_time, text_en, text_zh')
      .eq('video_id', videoId)
      .order('sequence', { ascending: true });

    if (subtitlesError) {
      return NextResponse.json({ error: '字幕获取失败' }, { status: 500 });
    }

    const children: Paragraph[] = [];
    if (!subtitles || subtitles.length === 0) {
      children.push(new Paragraph('暂无字幕'));
    } else {
      subtitles.forEach((subtitle, index) => {
        const timeLabel = formatTime(Number(subtitle.start_time) || 0);
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `${index + 1}. ${timeLabel}`, bold: true })],
          })
        );
        children.push(new Paragraph(`英文：${subtitle.text_en || ''}`));
        children.push(new Paragraph(`中文：${subtitle.text_zh || ''}`));
        children.push(new Paragraph(''));
      });
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const fileName = buildFileName(video.title || '视频');
    const encodedName = encodeURIComponent(fileName);

    const body = new Uint8Array(buffer);
    const response = new NextResponse(body);
    response.headers.set(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    response.headers.set(
      'Content-Disposition',
      `attachment; filename="subtitles.docx"; filename*=UTF-8''${encodedName}`
    );
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || '导出失败' }, { status: 500 });
  }
}
