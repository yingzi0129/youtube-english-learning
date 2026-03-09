import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadToCos } from '@/lib/cos';
import { generateAudioPath } from '@/lib/audio-paths';

export async function POST(request: NextRequest) {
  try {
    // 验证用户登录
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 获取表单数据
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const videoId = formData.get('videoId') as string;
    const subtitleId = formData.get('subtitleId') as string;
    const durationSeconds = formData.get('durationSeconds') as string;

    if (!audioFile || !videoId || !subtitleId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 生成带日期的文件路径（格式：audio/2026/02/18/userId/videoId/subtitleId.webm）
    const fileName = generateAudioPath(user.id, videoId, subtitleId);

    // 将文件转换为 Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 上传到 COS
    const publicUrl = await uploadToCos(fileName, buffer, 'audio/webm');

    // 保存到数据库
    const { error: dbError } = await supabase.from('speaking_practice').upsert(
      {
        user_id: user.id,
        video_id: videoId,
        subtitle_id: parseInt(subtitleId),
        audio_url: publicUrl,
        duration_seconds: parseFloat(durationSeconds),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,video_id,subtitle_id',
      }
    );

    if (dbError) {
      console.error('数据库写入失败:', dbError);
      // 数据库失败但 COS 已成功，仍返回 audioUrl 让前端可以播放
      return NextResponse.json({ success: true, audioUrl: publicUrl, warning: '数据库保存失败' });
    }

    return NextResponse.json({
      success: true,
      audioUrl: publicUrl,
    });
  } catch (error) {
    console.error('上传失败:', error);
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}
