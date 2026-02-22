'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ContactInfo {
  id: string;
  title: string;
  content: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export default function ContactManagementPage() {
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactInfo | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    icon: '📞',
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('contact_info')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('获取联系方式错误:', error);
      alert('获取联系方式失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const supabase = createClient();

      if (editingContact) {
        // 更新
        const { error } = await supabase
          .from('contact_info')
          .update(formData)
          .eq('id', editingContact.id);

        if (error) throw error;
        alert('更新成功');
      } else {
        // 新增
        const { error } = await supabase
          .from('contact_info')
          .insert([formData]);

        if (error) throw error;
        alert('添加成功');
      }

      setShowModal(false);
      setEditingContact(null);
      setFormData({
        title: '',
        content: '',
        icon: '📞',
        is_active: true,
        sort_order: 0,
      });
      fetchContacts();
    } catch (error) {
      console.error('保存联系方式错误:', error);
      alert('保存失败');
    }
  };

  const handleEdit = (contact: ContactInfo) => {
    setEditingContact(contact);
    setFormData({
      title: contact.title,
      content: contact.content,
      icon: contact.icon,
      is_active: contact.is_active,
      sort_order: contact.sort_order,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条联系方式吗？')) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('contact_info')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('删除成功');
      fetchContacts();
    } catch (error) {
      console.error('删除联系方式错误:', error);
      alert('删除失败');
    }
  };

  const toggleActive = async (contact: ContactInfo) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('contact_info')
        .update({ is_active: !contact.is_active })
        .eq('id', contact.id);

      if (error) throw error;
      fetchContacts();
    } catch (error) {
      console.error('切换状态错误:', error);
      alert('操作失败');
    }
  };

  const openAddModal = () => {
    setEditingContact(null);
    setFormData({
      title: '',
      content: '',
      icon: '📞',
      is_active: true,
      sort_order: contacts.length,
    });
    setShowModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">联系方式管理</h1>
          <p className="text-gray-600 mt-1">管理网站的联系方式信息</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all"
        >
          + 添加联系方式
        </button>
      </div>

      {/* 联系方式列表 */}
      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">图标</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">标题</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">内容</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">排序</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {contacts.map((contact) => (
              <tr key={contact.id}>
                <td className="px-6 py-4 whitespace-nowrap text-2xl">{contact.icon}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {contact.title}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 max-w-md truncate">
                  {contact.content}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {contact.sort_order}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => toggleActive(contact)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      contact.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {contact.is_active ? '已启用' : '已禁用'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => handleEdit(contact)}
                    className="text-purple-600 hover:text-purple-900"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(contact.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {contacts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            暂无联系方式，点击上方按钮添加
          </div>
        )}
      </div>

      {/* 添加/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingContact ? '编辑联系方式' : '添加联系方式'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  图标（Emoji）
                </label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="📞"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标题
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="学习交流"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  内容
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder=""
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  排序顺序
                </label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  启用此联系方式
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingContact(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  {editingContact ? '更新' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
