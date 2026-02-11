-- ============================================
-- 安全的 RLS 策略配置（修复版）
-- ============================================

-- 1. 启用 RLS
-- ============================================
ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;

-- 2. 移除所有现有策略（如果有）
-- ============================================
DROP POLICY IF EXISTS "允许查询未使用的激活码" ON activation_codes;
DROP POLICY IF EXISTS "允许标记激活码为已使用" ON activation_codes;
DROP POLICY IF EXISTS "服务角色完全访问" ON activation_codes;

-- 3. 严格的 RLS 策略：不允许直接访问
-- ============================================
-- 不创建任何允许 anon 或 authenticated 直接访问的策略
-- 所有访问必须通过 Postgres 函数（RPC）

-- 4. 创建安全的 Postgres 函数
-- ============================================

-- 函数 1: 验证激活码是否有效
CREATE OR REPLACE FUNCTION verify_activation_code(code_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- 以函数所有者的权限运行，绕过 RLS
AS $$
DECLARE
  code_exists BOOLEAN;
BEGIN
  -- 检查激活码是否存在且未使用
  SELECT EXISTS(
    SELECT 1 FROM activation_codes
    WHERE code = code_input
    AND is_used = false
  ) INTO code_exists;

  RETURN code_exists;
END;
$$;

-- 函数 2: 标记激活码为已使用
CREATE OR REPLACE FUNCTION mark_activation_code_used(
  code_input TEXT,
  user_id_input UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- 以函数所有者的权限运行，绕过 RLS
AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  -- 只更新未使用的激活码
  UPDATE activation_codes
  SET
    is_used = true,
    used_by_user_id = user_id_input,
    used_at = NOW()
  WHERE code = code_input
  AND is_used = false;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  -- 返回是否成功更新
  RETURN rows_updated > 0;
END;
$$;

-- 5. 授予执行权限
-- ============================================
-- 允许 anon 和 authenticated 用户调用这些函数
GRANT EXECUTE ON FUNCTION verify_activation_code(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION mark_activation_code_used(TEXT, UUID) TO anon, authenticated;

-- 6. 验证配置
-- ============================================
-- 查看函数是否创建成功
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('verify_activation_code', 'mark_activation_code_used');
