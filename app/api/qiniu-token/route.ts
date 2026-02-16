import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as qiniu from 'qiniu';

// 七牛云配置（从环境变量读取）
const QINIU_ACCESS_KEY = process.env.QINIU_ACCESS_KEY || '';
const QINIU_SECRET_KEY = process.env.QINIU_SECRET_KEY || '';
const QINIU_BUCKET = process.env.QINIU_BUCKET || '';

export async function GET() {
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

    // 生成上传凭证
    const mac = new qiniu.auth.digest.Mac(QINIU_ACCESS_KEY, QINIU_SECRET_KEY);
    const options = {
      scope: QINIU_BUCKET,
      expires: 3600, // 1小时有效期
    };
    const putPolicy = new qiniu.rs.PutPolicy(options);
    const uploadToken = putPolicy.uploadToken(mac);

    return NextResponse.json({
      token: uploadToken,
      bucket: QINIU_BUCKET,
    });
  } catch (error) {
    return NextResponse.json({ error: '生成上传凭证失败' }, { status: 500 });
  }
}
