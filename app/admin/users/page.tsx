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
      // 璋冪敤 API 璺敱鏇存柊瑙掕壊锛堜娇鐢?service role锛?      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '鏇存柊澶辫触');
      }

      // 鍒锋柊鍒楄〃
      await fetchUsers();
      alert('瑙掕壊鏇存柊鎴愬姛');
    } catch (err: any) {
      alert('鏇存柊澶辫触: ' + err.message);
    }
  };

  const handleResetPassword = async (user: User) => {
    if (!user?.id) return;

    const confirmed = window.confirm(
      `纭畾瑕侀噸缃墜鏈哄彿 ${user.phone || '-'} 鐨勫瘑鐮佸悧锛焅n閲嶇疆鍚庝細鐢熸垚涓€娆℃€т复鏃跺瘑鐮併€俙
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
        throw new Error(data.error || '閲嶇疆瀵嗙爜澶辫触');
      }

      setResetResult({
        phone: user.phone ?? undefined,
        password: data.temporaryPassword,
        expiresAt: data.expiresAt,
      });
    } catch (err: any) {
      setResetError(err.message || '閲嶇疆瀵嗙爜澶辫触');
    } finally {
      setResettingId(null);
    }
  };

  const handleCopyPassword = async () => {
    if (!resetResult?.password) return;
    try {
      await navigator.clipboard.writeText(resetResult.password);
      alert('涓存椂瀵嗙爜宸插鍒?);
    } catch (err) {
      alert('澶嶅埗澶辫触锛岃鎵嬪姩澶嶅埗');
    }
  };

  const stats = {
    total: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    user: users.filter(u => u.role === 'user').length,
  };

  return (
    <div className="space-y-6">
      {/* 椤甸潰鏍囬 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">鐢ㄦ埛绠＄悊</h1>
        <p className="mt-2 text-gray-600">绠＄悊鐢ㄦ埛鍜屾潈闄?/p>
      </div>

      {/* 閿欒鎻愮ず */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {resetError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">閲嶇疆瀵嗙爜澶辫触: {resetError}</p>
        </div>
      )}

      {/* 缁熻鍗＄墖 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-600">鎬荤敤鎴锋暟</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-600">绠＄悊鍛?/p>
          <p className="mt-2 text-3xl font-bold text-purple-600">{stats.admin}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-600">鏅€氱敤鎴?/p>
          <p className="mt-2 text-3xl font-bold text-blue-600">{stats.user}</p>
        </div>
      </div>

      {/* 绛涢€?*/}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          鍏ㄩ儴鐢ㄦ埛
        </button>
        <button
          onClick={() => setFilter('admin')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'admin'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          绠＄悊鍛?        </button>
        <button
          onClick={() => setFilter('user')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'user'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          鏅€氱敤鎴?        </button>
      </div>

      {/* 鐢ㄦ埛鍒楄〃 */}
      {loading ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <p className="text-gray-600">鍔犺浇涓?..</p>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">鏆傛棤鐢ㄦ埛</h3>
          <p className="text-gray-600">杩樻病鏈夌敤鎴锋敞鍐?/p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    鐢ㄦ埛ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    鎵嬫満鍙?                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    瑙掕壊
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    娉ㄥ唽鏃堕棿
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    鎿嶄綔
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
                          title="鐐瑰嚮閲嶇疆瀵嗙爜"
                        >
                          {resettingId === user.id ? '閲嶇疆涓?..' : user.phone}
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
                        {user.role === 'admin' ? '绠＄悊鍛? : '鏅€氱敤鎴?}
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
                        <option value="user">鏅€氱敤鎴?/option>
                        <option value="admin">绠＄悊鍛?/option>
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
            <h3 className="text-lg font-semibold text-gray-900">涓存椂瀵嗙爜宸茬敓鎴?/h3>
            <p className="mt-2 text-sm text-gray-500">
              姝ゅ瘑鐮佷粎鏄剧ず涓€娆★紝璇风珛鍗冲鍒跺苟鍛婄煡鐢ㄦ埛銆?            </p>
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs text-gray-500 mb-1">鎵嬫満鍙?/div>
              <div className="text-sm font-medium text-gray-800">{resetResult.phone || '-'}</div>
              <div className="text-xs text-gray-500 mt-3 mb-1">涓存椂瀵嗙爜</div>
              <div className="text-2xl font-mono tracking-widest text-purple-600">
                {resetResult.password}
              </div>
              <div className="mt-3 text-xs text-gray-500">
                鏈夋晥鏈熻嚦锛歿new Date(resetResult.expiresAt).toLocaleString('zh-CN')}
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCopyPassword}
                className="px-4 py-2 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                澶嶅埗瀵嗙爜
              </button>
              <button
                type="button"
                onClick={() => setResetResult(null)}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"
              >
                瀹屾垚
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
