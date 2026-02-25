'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface User {
  id: string;
  phone?: string | null;
  role: 'user' | 'admin';
  created_at: string;
  email?: string;
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<{ phone?: string; password: string; expiresAt: string } | null>(null);
  const [resetError, setResetError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('role', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      // 调用 API 路由更新角色（使用 service role）
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '更新失败');
      }

      // 刷新列表
      await fetchUsers();
      alert('角色更新成功');
    } catch (err: any) {
      alert('更新失败: ' + err.message);
    }
  };

  const handleResetPassword = async (user: User) => {
    if (!user?.id) return;

    const confirmed = window.confirm(
      `确定要重置手机号 ${user.phone || '-'} 的密码吗？\n重置后会生成一次性临时密码。`
    );
    if (!confirmed) return;

    setResetError('');
    setResettingId(user.id);

    try {
      const response = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '重置密码失败');
      }

      setResetResult({
        phone: user.phone,
        password: data.temporaryPassword,
        expiresAt: data.expiresAt,
      });
    } catch (err: any) {
      setResetError(err.message || '重置密码失败');
    } finally {
      setResettingId(null);
    }
  };

  const handleCopyPassword = async () => {
    if (!resetResult?.password) return;
    try {
      await navigator.clipboard.writeText(resetResult.password);
      alert('临时密码已复制');
    } catch (err) {
      alert('复制失败，请手动复制');
    }
  };

  const stats = {
    total: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    user: users.filter(u => u.role === 'user').length,
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">用户管理</h1>
        <p className="mt-2 text-gray-600">管理用户和权限</p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {resetError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">重置密码失败: {resetError}</p>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-600">总用户数</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-600">管理员</p>
          <p className="mt-2 text-3xl font-bold text-purple-600">{stats.admin}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-600">普通用户</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">{stats.user}</p>
        </div>
      </div>

      {/* 筛选 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          全部用户
        </button>
        <button
          onClick={() => setFilter('admin')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'admin'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          管理员
        </button>
        <button
          onClick={() => setFilter('user')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'user'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          普通用户
        </button>
      </div>

      {/* 用户列表 */}
      {loading ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <p className="text-gray-600">加载中...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无用户</h3>
          <p className="text-gray-600">还没有用户注册</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    用户ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    手机号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    角色
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    注册时间
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">
                      {user.id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {user.phone ? (
                        <button
                          type="button"
                          onClick={() => handleResetPassword(user)}
                          disabled={resettingId === user.id}
                          className="text-purple-600 hover:text-purple-700 font-medium disabled:opacity-60"
                          title="点击重置密码"
                        >
                          {resettingId === user.id ? '重置中...' : user.phone}
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role === 'admin' ? '管理员' : '普通用户'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(user.created_at).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user.id, e.target.value as 'user' | 'admin')}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="user">普通用户</option>
                        <option value="admin">管理员</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {resetResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-purple-100">
            <h3 className="text-lg font-semibold text-gray-900">临时密码已生成</h3>
            <p className="mt-2 text-sm text-gray-500">
              此密码仅显示一次，请立即复制并告知用户。
            </p>
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs text-gray-500 mb-1">手机号</div>
              <div className="text-sm font-medium text-gray-800">{resetResult.phone || '-'}</div>
              <div className="text-xs text-gray-500 mt-3 mb-1">临时密码</div>
              <div className="text-2xl font-mono tracking-widest text-purple-600">
                {resetResult.password}
              </div>
              <div className="mt-3 text-xs text-gray-500">
                有效期至：{new Date(resetResult.expiresAt).toLocaleString('zh-CN')}
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCopyPassword}
                className="px-4 py-2 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                复制密码
              </button>
              <button
                type="button"
                onClick={() => setResetResult(null)}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
