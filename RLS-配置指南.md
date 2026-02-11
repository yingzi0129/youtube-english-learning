# Supabase RLS 策略配置指南

## 第一步：登录 Supabase 控制台

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目：`youtube-english-learning`
3. 点击左侧菜单的 **SQL Editor**

## 第二步：执行 RLS 策略脚本

1. 在 SQL Editor 中，点击 **New query**
2. 复制 `supabase-rls-policies.sql` 文件的内容
3. 粘贴到 SQL Editor 中
4. 点击 **Run** 按钮执行脚本

## 第三步：验证 RLS 策略

执行脚本后，你应该看到类似以下的输出：

```
✓ ALTER TABLE
✓ CREATE POLICY (3 policies created)
```

## RLS 策略说明

### activation_codes 表的策略

**策略 1: 允许查询未使用的激活码**
- 作用：认证用户可以查询未使用的激活码
- 用途：用于注册时验证激活码是否有效
- 安全性：用户只能看到未使用的激活码，无法看到已使用的

**策略 2: 服务角色完全访问**
- 作用：service_role 可以完全访问所有数据
- 用途：用于管理和维护
- 安全性：只有服务器端使用 service_role key 才能访问

**策略 3: 允许标记激活码为已使用**
- 作用：认证用户可以更新激活码状态
- 用途：注册成功后标记激活码为已使用
- 安全性：只能将未使用的激活码标记为已使用，不能反向操作

## 第四步：测试 RLS 策略

### 测试 1：查询激活码

在 SQL Editor 中运行：

```sql
-- 这应该只返回未使用的激活码
SELECT * FROM activation_codes WHERE is_used = false;
```

### 测试 2：尝试查询已使用的激活码

```sql
-- 这应该返回空结果（因为 RLS 策略阻止了）
SELECT * FROM activation_codes WHERE is_used = true;
```

## 常见问题

### Q: 如果我需要修改策略怎么办？

A: 先删除旧策略，再创建新策略：

```sql
-- 删除策略
DROP POLICY "策略名称" ON activation_codes;

-- 创建新策略
CREATE POLICY "新策略名称" ON activation_codes ...
```

### Q: 如何查看当前的所有策略？

A: 运行以下查询：

```sql
SELECT * FROM pg_policies WHERE tablename = 'activation_codes';
```

### Q: 如果策略配置错误，应用无法正常工作怎么办？

A: 可以临时禁用 RLS 进行调试：

```sql
-- 禁用 RLS（仅用于调试）
ALTER TABLE activation_codes DISABLE ROW LEVEL SECURITY;

-- 调试完成后，重新启用
ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;
```

## 下一步

配置完成后，你的应用就可以安全地使用 anon key 了。所有数据访问都会受到 RLS 策略的保护。
