import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 验证用户登录
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 获取请求数据
    const { videoId, currentTime, duration } = await request.json();

    if (!videoId || currentTime === undefined || duration === undefined) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 保存观看进度
    const { error: upsertError } = await supabase
      .from('watch_history')
      .upsert(
        {
          user_id: user.id,
          video_id: videoId,
          progress_seconds: Math.floor(currentTime),
          duration_seconds: Math.floor(duration),
        },
        {
          onConflict: 'user_id,video_id',
        }
      );

    if (upsertError) {
      return NextResponse.json({ error: '保存失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}
