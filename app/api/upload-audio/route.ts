import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as qiniu from 'qiniu';
import * as https from 'https';

// 七牛云配置
const QINIU_ACCESS_KEY = process.env.QINIU_ACCESS_KEY || '';
const QINIU_SECRET_KEY = process.env.QINIU_SECRET_KEY || '';
const QINIU_BUCKET = process.env.QINIU_BUCKET || '';
const QINIU_DOMAIN = process.env.NEXT_PUBLIC_QINIU_DOMAIN || '';

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

    // 生成固定的文件名（不使用时间戳，七牛云会自动覆盖同名文件）
    const fileName = `${user.id}/${videoId}/${subtitleId}.webm`;

    // 生成上传凭证（允许覆盖同名文件）
    const mac = new qiniu.auth.digest.Mac(QINIU_ACCESS_KEY, QINIU_SECRET_KEY);
    const options = {
      scope: `${QINIU_BUCKET}:${fileName}`, // 指定文件名，允许覆盖
      expires: 3600,
    };
    const putPolicy = new qiniu.rs.PutPolicy(options);
    const uploadToken = putPolicy.uploadToken(mac);

    // 将文件转换为 Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 上传到七牛云
    const config = new qiniu.conf.Config({
      zone: qiniu.zone.Zone_z2, // 华南区域
    });
    const formUploader = new qiniu.form_up.FormUploader(config);
    const putExtra = new qiniu.form_up.PutExtra();

    // 使用 Promise 包装上传操作
    const uploadResult = await new Promise<{ key: string }>((resolve, reject) => {
      formUploader.put(uploadToken, fileName, buffer, putExtra, (err, body, info) => {
        if (err) {
          reject(err);
          return;
        }
        if (info.statusCode === 200) {
          resolve(body);
        } else {
          reject(new Error(`上传失败: ${info.statusCode}`));
        }
      });
    });

    const publicUrl = `${QINIU_DOMAIN}/${uploadResult.key}`;

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
      return NextResponse.json({ error: '保存到数据库失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      audioUrl: publicUrl,
    });
  } catch (error) {
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}
