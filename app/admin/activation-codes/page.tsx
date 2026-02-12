'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ActivationCode {
  id: string;
  code: string;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
  note: string | null;
  phone?: string | null;
}

export default function ActivationCodesPage() {
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [count, setCount] = useState(10);
  const [filter, setFilter] = useState<'all' | 'used' | 'unused'>('all');

  useEffect(() => {
    fetchCodes();
  }, [filter]);

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // 第一步：查询激活码
      let query = supabase
        .from('activation_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter === 'used') {
        query = query.eq('is_used', true);
      } else if (filter === 'unused') {
        query = query.eq('is_used', false);
      }

      const { data: codesData, error: codesError } = await query;

      if (codesError) throw codesError;

      // 第二步：获取所有已使用激活码的用户ID
      const usedByIds = codesData
        ?.filter(code => code.used_by_user_id)
        .map(code => code.used_by_user_id) || [];

      // 第三步：如果有已使用的激活码，查询对应的手机号
      let phoneMap: Record<string, string> = {};
      if (usedByIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, phone')
          .in('id', usedByIds);

        if (profilesData) {
          phoneMap = profilesData.reduce((acc, profile) => {
            acc[profile.id] = profile.phone;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // 第四步：合并数据
      const formattedData = (codesData || []).map(code => ({
        ...code,
        phone: code.used_by_user_id ? phoneMap[code.used_by_user_id] || null : null
      }));

      setCodes(formattedData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateCodes = async () => {
    if (count < 1 || count > 100) {
      setError('生成数量必须在1-100之间');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const supabase = createClient();

      // 生成激活码
      const newCodes = Array.from({ length: count }, () => {
        return {
          code: generateRandomCode(),
          is_used: false,
          created_by: 'admin',
          note: `批量生成 - ${new Date().toLocaleString('zh-CN')}`,
        };
      });

      const { error: insertError } = await supabase
        .from('activation_codes')
        .insert(newCodes);

      if (insertError) throw insertError;

      // 刷新列表
      await fetchCodes();
      setCount(10);
    } catch (err: any) {
      setError(err.message || '生成失败，请重试');
    } finally {
      setGenerating(false);
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('激活码已复制到剪贴板');
  };

  const exportCodes = () => {
    const unusedCodes = codes.filter(c => !c.is_used);
    const text = unusedCodes.map(c => c.code).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activation-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = {
    total: codes.length,
    used: codes.filter(c => c.is_used).length,
    unused: codes.filter(c => !c.is_used).length,
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">激活码管理</h1>
        <p className="mt-2 text-gray-600">生成和管理用户激活码</p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-600">总数</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-600">已使用</p>
          <p className="mt-2 text-3xl font-bold text-pink-600">{stats.used}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-600">未使用</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{stats.unused}</p>
        </div>
      </div>

      {/* 生成激活码 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">批量生成激活码</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              生成数量（1-100）
            </label>
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 0)}
              min="1"
              max="100"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={generateCodes}
            disabled={generating}
            className="mt-7 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? '生成中...' : '生成'}
          </button>
        </div>
      </div>

      {/* 筛选和导出 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setFilter('unused')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'unused'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            未使用
          </button>
          <button
            onClick={() => setFilter('used')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'used'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            已使用
          </button>
        </div>
        <button
          onClick={exportCodes}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          导出未使用
        </button>
      </div>

      {/* 激活码列表 */}
      {loading ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <p className="text-gray-600">加载中...</p>
        </div>
      ) : codes.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无激活码</h3>
          <p className="text-gray-600">开始生成激活码</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    激活码
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    绑定手机号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    使用时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    备注
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {codes.map((code) => (
                  <tr key={code.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono font-semibold text-gray-900">
                      {code.code}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        code.is_used ? 'bg-pink-100 text-pink-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {code.is_used ? '已使用' : '未使用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {code.phone || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {code.used_at ? new Date(code.used_at).toLocaleString('zh-CN') : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(code.created_at).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {code.note || '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      {!code.is_used && (
                        <button
                          onClick={() => copyCode(code.code)}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          复制
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
