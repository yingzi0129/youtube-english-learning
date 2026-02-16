# 问题修复指南

## 问题1：手机号没有同步到profiles表

### 解决方案：
在Supabase SQL编辑器中执行 `database/fix-sync-profiles.sql` 文件。

这个脚本会：
1. 为所有已注册但没有profile的用户创建profile记录
2. 同步手机号从auth.users的metadata到profiles表
3. 显示同步结果供验证

### 验证方法：
执行后查看输出的表格，确认所有用户的phone字段都有值。

---

## 问题2：管理员访问/admin被重定向

### 可能的原因：
1. RLS策略阻止了middleware查询profiles表
2. 浏览器缓存了旧的session

### 解决步骤：

**步骤1：确认RPC函数已创建**
在Supabase SQL编辑器中执行以下查询，确认函数存在：
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_user_role', 'is_admin');
```

如果没有返回结果，说明RPC函数没有创建，需要重新执行 `database/profiles-rls-policies.sql`

**步骤2：测试RPC函数**
登录后，在Supabase SQL编辑器中执行：
```sql
SELECT get_user_role();
```
应该返回 'admin' 或 'user'

**步骤3：清除浏览器缓存和Cookie**
1. 退出登录
2. 清除浏览器的所有Cookie和缓存
3. 重新登录

**步骤4：检查控制台日志**
我在middleware中添加了日志输出，访问 /admin 时：
1. 打开浏览器开发者工具
2. 查看控制台（Console）
3. 访问 /admin 路由
4. 查看是否有 "检查管理员权限" 的日志输出

**步骤5：如果还是不行，手动测试**
在Supabase SQL编辑器中执行：
```sql
-- 查看你的用户ID和角色
SELECT
  p.id,
  p.phone,
  p.role,
  u.email
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.phone = '你的手机号';

-- 确认角色是admin
UPDATE profiles
SET role = 'admin'
WHERE phone = '你的手机号';
```

---

## 调试技巧

### 查看middleware日志
由于middleware运行在服务端，日志会输出到：
- 开发环境：终端（运行 npm run dev 的窗口）
- 生产环境：Vercel/服务器日志

### 临时禁用管理员检查（仅用于调试）
如果需要临时绕过检查进行调试，可以在 `lib/supabase/middleware.ts` 中注释掉管理员检查部分：
```typescript
// 检查管理员路由权限
if (user && request.nextUrl.pathname.startsWith('/admin')) {
  // 临时注释掉，允许所有登录用户访问
  // const { data: role } = await supabase.rpc('get_user_role')
  // if (!role || role !== 'admin') {
  //   const url = request.nextUrl.clone()
  //   url.pathname = '/'
  //   return NextResponse.redirect(url)
  // }
}
```

**注意：调试完成后记得恢复！**

---

## 常见问题

### Q: 执行SQL后还是没有手机号？
A: 检查注册时是否正确传递了手机号到user_metadata。查看 `app/api/auth/register/route.ts` 第64-67行。

### Q: RPC函数返回null？
A: 说明profiles表中没有该用户的记录，执行 `fix-sync-profiles.sql` 创建。

### Q: 还是被重定向？
A:
1. 确认你的用户ID和profiles表中的ID一致
2. 确认role字段确实是 'admin'（注意大小写）
3. 清除所有Cookie重新登录
4. 检查服务端日志输出

---

## 需要帮助？
如果按照以上步骤还是无法解决，请提供：
1. Supabase SQL编辑器中执行 `SELECT * FROM profiles WHERE role = 'admin'` 的结果
2. 浏览器控制台的错误信息
3. 服务端终端的日志输出
