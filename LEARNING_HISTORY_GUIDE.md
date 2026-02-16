# 学习记录功能使用说明

## 功能概述

学习记录功能可以追踪用户的视频观看历史和进度，用户可以：
- 查看所有观看过的视频
- 查看每个视频的观看进度（百分比）
- 查看最后观看时间
- 点击视频继续从上次位置观看

## 需要执行的步骤

### 1. 在 Supabase 中创建数据库表

在 Supabase SQL Editor 中依次执行以下 SQL 文件：

```sql
-- 第一步：创建观看历史表
-- 执行文件：database/tables/create-watch-history-table.sql
```

```sql
-- 第二步：设置 RLS 策略
-- 执行文件：database/policies/watch-history-rls-policies.sql
```

### 2. 在视频播放页面集成观看进度追踪

当你创建视频播放页面时，需要集成观看进度追踪功能。

#### 示例代码：

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { updateWatchProgress, getWatchProgress } from '@/lib/watchProgress';

export default function VideoPlayerPage({ params }: { params: { id: string } }) {
  const videoId = params.id;
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);

  // 获取 URL 参数中的起始时间（从学习记录跳转过来）
  const startTime = searchParams.get('t');

  useEffect(() => {
    // 加载视频时，获取上次观看进度
    const loadProgress = async () => {
      if (startTime) {
        // 如果 URL 中有起始时间参数，使用该时间
        if (videoRef.current) {
          videoRef.current.currentTime = parseInt(startTime);
        }
      } else {
        // 否则，从数据库获取上次观看进度
        const progress = await getWatchProgress(videoId);
        if (videoRef.current && progress > 0) {
          videoRef.current.currentTime = progress;
        }
      }
    };

    loadProgress();
  }, [videoId, startTime]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // 每 5 秒保存一次观看进度
    const interval = setInterval(() => {
      if (video.currentTime > 0 && video.duration > 0) {
        updateWatchProgress(videoId, video.currentTime, video.duration);
      }
    }, 5000);

    // 视频暂停或结束时也保存进度
    const handlePause = () => {
      if (video.currentTime > 0 && video.duration > 0) {
        updateWatchProgress(videoId, video.currentTime, video.duration);
      }
    };

    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handlePause);

    return () => {
      clearInterval(interval);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handlePause);
      // 组件卸载时保存进度
      if (video.currentTime > 0 && video.duration > 0) {
        updateWatchProgress(videoId, video.currentTime, video.duration);
      }
    };
  }, [videoId]);

  return (
    <div>
      <video
        ref={videoRef}
        controls
        className="w-full"
      >
        <source src="your-video-url" type="video/mp4" />
      </video>
    </div>
  );
}
```

### 3. 功能说明

#### 已完成的功能：

1. ✅ 数据库表设计（watch_history）
2. ✅ RLS 安全策略
3. ✅ 学习记录页面（/learning-history）
4. ✅ Header 组件的"学习记录"按钮跳转
5. ✅ 观看进度工具函数（updateWatchProgress, getWatchProgress）

#### 待集成的功能：

1. ⏳ 视频播放页面（需要你创建）
2. ⏳ 在视频播放页面中集成观看进度追踪
3. ⏳ 从学习记录页面跳转到视频播放页面（带进度参数）

### 4. 测试功能

完成数据库设置后：

1. 点击 Header 的"学习记录"按钮
2. 如果没有观看记录，会显示空状态
3. 当你创建视频播放页面并集成观看进度追踪后，观看视频会自动记录
4. 再次进入学习记录页面，可以看到观看历史
5. 点击历史记录中的视频，可以跳转到视频播放页面（需要你实现跳转逻辑）

## 数据库表结构

### watch_history 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户ID |
| video_id | UUID | 视频ID |
| progress_seconds | INTEGER | 观看进度（秒） |
| duration_seconds | INTEGER | 视频总时长（秒） |
| progress_percentage | DECIMAL | 观看进度百分比（自动计算） |
| last_watched_at | TIMESTAMPTZ | 最后观看时间 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

## API 函数

### updateWatchProgress

更新视频观看进度。

```typescript
updateWatchProgress(videoId: string, progressSeconds: number, durationSeconds: number)
```

### getWatchProgress

获取视频的观看进度。

```typescript
getWatchProgress(videoId: string): Promise<number>
```

## 注意事项

1. 观看进度每 5 秒自动保存一次
2. 视频暂停或结束时也会保存进度
3. 每个用户每个视频只有一条观看记录（使用 upsert）
4. 进度百分比由数据库自动计算
5. 学习记录按最后观看时间倒序排列
