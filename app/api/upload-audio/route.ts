import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadToCos } from '@/lib/cos';
import { generateAudioPath } from '@/lib/audio-paths';

export async function POST(request: NextRequest) {
  try {
    // 楠岃瘉鐢ㄦ埛鐧诲綍
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: '鏈櫥褰? }, { status: 401 });
    }

    // 鑾峰彇琛ㄥ崟鏁版嵁
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const videoId = formData.get('videoId') as string;
    const subtitleId = formData.get('subtitleId') as string;
    const durationSeconds = formData.get('durationSeconds') as string;

    if (!audioFile || !videoId || !subtitleId) {
      return NextResponse.json({ error: '缂哄皯蹇呰鍙傛暟' }, { status: 400 });
    }

    // 鐢熸垚甯︽棩鏈熺殑鏂囦欢璺緞锛堟牸寮忥細audio/2026/02/18/userId/videoId/subtitleId.webm锛?
    const fileName = generateAudioPath(user.id, videoId, subtitleId);

    // 灏嗘枃浠惰浆鎹负 Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 上传到 COS
    const publicUrl = await uploadToCos(fileName, buffer, 'audio/webm');

    // 淇濆瓨鍒版暟鎹簱
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
      return NextResponse.json({ error: '淇濆瓨鍒版暟鎹簱澶辫触' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      audioUrl: publicUrl,
    });
  } catch (error) {
    console.error('涓婁紶澶辫触:', error);
    return NextResponse.json({ error: '涓婁紶澶辫触' }, { status: 500 });
  }
}
