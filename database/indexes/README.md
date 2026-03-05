# 数据库性能优化索引

## 索引说明

这些索引用于加速常用查询，提升数据库性能。

## 如何应用索引

### 方法一：在 Supabase Dashboard 执行

1. 登录 Supabase Dashboard
2. 进入你的项目
3. 点击左侧菜单 "SQL Editor"
4. 复制 `create-performance-indexes.sql` 的内容
5. 粘贴到编辑器
6. 点击 "Run" 执行

### 方法二：使用 psql 命令行

```bash
psql -h your-supabase-host -U postgres -d postgres -f create-performance-indexes.sql
```

## 索引列表

### videos 表
- `idx_videos_published_at` - 按发布时间倒序查询
- `idx_videos_difficulty` - 按难度筛选
- `idx_videos_is_trial` - 试用视频筛选
- `idx_videos_is_deleted` - 软删除标记
- `idx_videos_creator_name` - 博主名称查询
- `idx_videos_trial_deleted_published` - 组合索引（最常用）

### subtitles 表
- `idx_subtitles_video_id` - 根据视频ID查询字幕
- `idx_subtitles_sequence` - 字幕排序

### watch_history 表
- `idx_watch_history_user_id` - 用户观看历史
- `idx_watch_history_video_id` - 视频观看记录
- `idx_watch_history_user_video` - 用户+视频组合查询
- `idx_watch_history_updated_at` - 最近观看时间排序

### profiles 表
- `idx_profiles_role` - 用户角色查询
- `idx_profiles_phone` - 手机号查询

### speaking_practice 表
- `idx_speaking_practice_user_id` - 用户的跟读练习记录
- `idx_speaking_practice_video_id` - 视频的跟读练习记录
- `idx_speaking_practice_user_video_subtitle` - 组合查询

### check_ins 表
- `idx_check_ins_user_id` - 用户打卡记录
- `idx_check_ins_check_in_date` - 打卡日期查询

## 性能提升预期

### 没有索引：
- 100 条数据：查询 50ms
- 1000 条数据：查询 500ms
- 10000 条数据：查询 5000ms

### 有索引后：
- 任何数据量：查询 10-50ms

## 验证索引

执行以下 SQL 查看所有索引：

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

## 注意事项

1. 索引会占用额外的存储空间（通常很小）
2. 索引会略微降低写入速度（影响可忽略）
3. 索引会大幅提升查询速度（10-100倍）
4. 使用 `IF NOT EXISTS` 确保重复执行不会报错

## 维护

索引创建后无需维护，PostgreSQL 会自动更新索引。
