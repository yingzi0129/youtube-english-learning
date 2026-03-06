import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { CheckFavoritesRequest, CheckFavoritesResponse } from '@/lib/types/favorites';

// POST /api/favorites/check - 批量检查收藏状态
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
    const body: CheckFavoritesRequest = await request.json();
    const { type, ids } = body;

    if (!type || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: '参数错误' },
        { status: 400 }
      );
    }

    // 根据类型查询对应的字段
    let columnName: string;
    switch (type) {
      case 'video':
        columnName = 'video_id';
        break;
      case 'vocabulary':
        columnName = 'vocabulary_id';
        break;
      case 'subtitle_segment':
        columnName = 'subtitle_id';
        break;
      default:
        return NextResponse.json(
          { error: '无效的收藏类型' },
          { status: 400 }
        );
    }

    // 查询收藏状态
    const { data, error } = await supabase
      .from('favorites')
      .select(columnName)
      .eq('user_id', user.id)
      .eq('type', type)
      .in(columnName, ids);

    if (error) {
      console.error('检查收藏状态失败:', error);
      return NextResponse.json(
        { error: '检查收藏状态失败' },
        { status: 500 }
      );
    }

    // 构建响应对象
    const result: CheckFavoritesResponse = {};
    ids.forEach(id => {
      result[id] = false;
    });

    // 标记已收藏的项
    data?.forEach((item: any) => {
      const id = item[columnName];
      if (id) {
        result[id] = true;
      }
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('检查收藏状态异常:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
