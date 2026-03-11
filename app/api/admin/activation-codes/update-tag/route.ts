import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { codeIds, tag } = await request.json();

    if (!codeIds || !Array.isArray(codeIds) || codeIds.length === 0) {
      return NextResponse.json(
        { error: '请选择要修改的激活码' },
        { status: 400 }
      );
    }

    if (!tag || !['external', 'internal'].includes(tag)) {
      return NextResponse.json(
        { error: '标签值无效' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 检查用户权限
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    // 只允许修改未使用的激活码
    const { data: codes, error: fetchError } = await supabase
      .from('activation_codes')
      .select('id, is_used')
      .in('id', codeIds);

    if (fetchError) {
      throw fetchError;
    }

    const unusedCodeIds = codes
      ?.filter(code => !code.is_used)
      .map(code => code.id) || [];

    if (unusedCodeIds.length === 0) {
      return NextResponse.json(
        { error: '没有可修改的未使用激活码' },
        { status: 400 }
      );
    }

    // 批量更新标签
    const { data: updateData, error: updateError } = await supabase
      .from('activation_codes')
      .update({ tag })
      .in('id', unusedCodeIds)
      .select();

    if (updateError) {
      console.error('数据库更新错误:', updateError);
      throw updateError;
    }

    console.log('成功更新激活码标签:', {
      tag,
      count: updateData?.length || 0,
      ids: unusedCodeIds
    });

    return NextResponse.json({
      success: true,
      updatedCount: unusedCodeIds.length,
      skippedCount: codeIds.length - unusedCodeIds.length
    });
  } catch (error: any) {
    console.error('更新激活码标签失败:', error);
    return NextResponse.json(
      { error: error.message || '更新失败' },
      { status: 500 }
    );
  }
}
