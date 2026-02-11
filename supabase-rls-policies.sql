-- ============================================
-- RLS 策略配置脚本
-- 用于保护 Supabase 数据库的安全性
-- ============================================

-- 1. 启用 RLS（Row Level Security）
-- ============================================

-- 为 activation_codes 表启用 RLS
ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;

-- 2. activation_codes 表的策略
-- ============================================

-- 策略 1: 允许所有用户（包括匿名用户）查询未使用的激活码
-- 这是必需的，因为注册时用户还未认证
CREATE POLICY "允许查询未使用的激活码"
ON activation_codes
FOR SELECT
TO anon, authenticated
USING (is_used = false);

-- 策略 2: 允许所有用户更新激活码（标记为已使用）
-- 但只能更新未使用的激活码，且只能标记为已使用
-- 这是必需的，因为注册过程中需要标记激活码
CREATE POLICY "允许标记激活码为已使用"
ON activation_codes
FOR UPDATE
TO anon, authenticated
USING (is_used = false)
WITH CHECK (is_used = true AND used_by_user_id IS NOT NULL);

-- 3. 如果有自定义 users 表，配置其 RLS 策略
-- ============================================
-- 注意：如果你使用 Supabase Auth，可能不需要自定义 users 表
-- 如果有自定义 users 表，取消下面的注释

-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- -- 用户只能查看自己的数据
-- CREATE POLICY "用户只能查看自己的数据"
-- ON users
-- FOR SELECT
-- TO authenticated
-- USING (auth.uid() = id);

-- -- 用户只能更新自己的数据
-- CREATE POLICY "用户只能更新自己的数据"
-- ON users
-- FOR UPDATE
-- TO authenticated
-- USING (auth.uid() = id)
-- WITH CHECK (auth.uid() = id);

-- 4. 验证 RLS 策略
-- ============================================
-- 运行以下查询来验证 RLS 是否正确启用

-- 查看所有启用了 RLS 的表
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true;

-- 查看 activation_codes 表的所有策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'activation_codes';
