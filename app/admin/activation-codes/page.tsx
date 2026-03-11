'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAdminToast } from '../components/AdminToastProvider';

interface ActivationCode {
  id: string;
  code: string;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
  note: string | null;
  phone?: string | null;
  tag: 'external' | 'internal';
}

export default function ActivationCodesPage() {
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [count, setCount] = useState(10);
  const [filter, setFilter] = useState<'all' | 'used' | 'unused'>('all');
  const [tagFilter, setTagFilter] = useState<'all' | 'external' | 'internal'>('all');
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState(false);
  const { showToast } = useAdminToast();

  useEffect(() => {
    fetchCodes();
  }, [filter, tagFilter]);

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

      if (tagFilter !== 'all') {
        query = query.eq('tag', tagFilter);
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
      const message = '生成数量必须在 1-100 之间';
      setError(message);
      showToast('error', message);
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
          tag: 'external',
        };
      });

      const { error: insertError } = await supabase
        .from('activation_codes')
        .insert(newCodes);

      if (insertError) throw insertError;

      // 刷新列表
      await fetchCodes();
      setCount(10);
      showToast('success', '激活码生成成功');
    } catch (err: any) {
      const message = err.message || '生成失败，请重试';
      setError(message);
      showToast('error', message);
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
    showToast('success', '激活码已复制到剪贴板');
  };

  const exportCodes = () => {
    const unusedExternalCodes = codes.filter(c => !c.is_used && c.tag === 'external');
    const text = unusedExternalCodes.map(c => c.code).join('\n');
    const blob = new Blob(['\ufeff' + text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activation-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', `已导出 ${unusedExternalCodes.length} 个外部未使用激活码`);
  };

  const toggleSelectCode = (codeId: string) => {
    const newSelected = new Set(selectedCodes);
    if (newSelected.has(codeId)) {
      newSelected.delete(codeId);
    } else {
      newSelected.add(codeId);
    }
    setSelectedCodes(newSelected);
  };

  const toggleSelectAll = () => {
    const unusedCodes = codes.filter(c => !c.is_used);
    if (selectedCodes.size === unusedCodes.length) {
      setSelectedCodes(new Set());
    } else {
      setSelectedCodes(new Set(unusedCodes.map(c => c.id)));
    }
  };

  const updateTags = async (tag: 'external' | 'internal') => {
    if (selectedCodes.size === 0) {
      showToast('error', '请先选择要修改的激活码');
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch('/api/admin/activation-codes/update-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codeIds: Array.from(selectedCodes),
          tag
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '更新失败');
      }

      showToast('success', `已更新 ${data.updatedCount} 个激活码标签`);
      setSelectedCodes(new Set());
      await fetchCodes();
    } catch (err: any) {
      showToast('error', err.message || '更新失败');
    } finally {
      setUpdating(false);
    }
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
        <div className="flex items-center gap-4">
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
          <div className="h-6 w-px bg-gray-300"></div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTagFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tagFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              全部标签
            </button>
            <button
              onClick={() => setTagFilter('external')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tagFilter === 'external'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              外部
            </button>
            <button
              onClick={() => setTagFilter('internal')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tagFilter === 'internal'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              内部
            </button>
          </div>
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

      {/* 批量操作 */}
      {selectedCodes.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-blue-800">
              已选择 {selectedCodes.size} 个激活码
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateTags('external')}
                disabled={updating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {updating ? '更新中...' : '标记为外部'}
              </button>
              <button
                onClick={() => updateTags('internal')}
                disabled={updating}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {updating ? '更新中...' : '标记为内部'}
              </button>
              <button
                onClick={() => setSelectedCodes(new Set())}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                取消选择
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={codes.filter(c => !c.is_used).length > 0 && selectedCodes.size === codes.filter(c => !c.is_used).length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    激活码
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    标签
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    绑定手机号
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    使用时间
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    创建时间
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    备注
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {codes.map((code) => (
                  <tr key={code.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {!code.is_used && (
                        <input
                          type="checkbox"
                          checked={selectedCodes.has(code.id)}
                          onChange={() => toggleSelectCode(code.id)}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                      )}
                    </td>
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
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        code.tag === 'external' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {code.tag === 'external' ? '外部' : '内部'}
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
