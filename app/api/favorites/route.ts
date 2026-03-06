import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { CreateFavoriteRequest } from '@/lib/types/favorites';

// GET /api/favorites - 获取用户的收藏列表
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 验证用户登录
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // 可选：筛选类型
    const videoId = searchParams.get('video_id'); // 可选：筛选特定视频

    // 构建查询
    let query = supabase
      .from('favorites')
      .select(`
        *,
        video:videos!favorites_video_id_fkey(id, title, thumbnail_url, duration_minutes),
        vocabulary:vocabulary!favorites_vocabulary_id_fkey(id, text, phonetic, meaning, helper_sentence),
        subtitle:subtitles!favorites_subtitle_id_fkey(id, text_en, text_zh, start_time, end_time)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // 应用筛选条件
    if (type) {
      query = query.eq('type', type);
    }
    if (videoId) {
      query = query.eq('video_id', videoId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('获取收藏列表失败:', error);
      return NextResponse.json(
        { error: '获取收藏列表失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('获取收藏列表异常:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// POST /api/favorites - 添加收藏
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 验证用户登录
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    // 解析请求体
    const body: CreateFavoriteRequest = await request.json();
    const { type, video_id, vocabulary_id, subtitle_id, notes } = body;

    // 验证必填字段
    if (!type || !video_id) {
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      );
    }

    // 验证类型特定字段
    if (type === 'vocabulary' && !vocabulary_id) {
      return NextResponse.json(
        { error: '收藏单词/短语时必须提供 vocabulary_id' },
        { status: 400 }
      );
    }
    if (type === 'subtitle_segment' && !subtitle_id) {
      return NextResponse.json(
        { error: '收藏字幕段时必须提供 subtitle_id' },
        { status: 400 }
      );
    }

    // 插入收藏
    const { data, error } = await supabase
      .from('favorites')
      .insert({
        user_id: user.id,
        type,
        video_id,
        vocabulary_id: vocabulary_id || null,
        subtitle_id: subtitle_id || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      // 检查是否是重复收藏
      if (error.code === '23505') {
        return NextResponse.json(
          { error: '已经收藏过了' },
          { status: 409 }
        );
      }
      console.error('添加收藏失败:', error);
      return NextResponse.json(
        { error: '添加收藏失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('添加收藏异常:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
