import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const { videoId, subtitleId, audioUrl, durationSeconds } = await request.json();
  if (!videoId || !subtitleId || !audioUrl) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 });
  }

  const { error: dbError } = await supabase.from('speaking_practice').upsert(
    {
      user_id: user.id,
      video_id: videoId,
      subtitle_id: parseInt(subtitleId),
      audio_url: audioUrl,
      duration_seconds: parseFloat(durationSeconds) || 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,video_id,subtitle_id' }
  );

  if (dbError) {
    console.error('数据库写入失败:', dbError);
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
