'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFavoritesStore } from '@/lib/stores/favorites-store';
import { Video, BookOpen, MessageSquare, Trash2, StickyNote, Download, FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import type { FavoriteType } from '@/lib/types/favorites';

export default function FavoritesPage() {
  const router = useRouter();
  const { favorites, loading, fetchFavorites, removeFavorite, updateFavoriteNotes } = useFavoritesStore();
  const [activeTab, setActiveTab] = useState<FavoriteType>('video');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');

  useEffect(() => {
    fetchFavorites(undefined, 'full');
  }, [fetchFavorites]);

  // 按类型筛选收藏
  const filteredFavorites = favorites.filter(f => f.type === activeTab);

  // 处理删除
  const handleDelete = async (id: string) => {
    if (confirm('确定要取消收藏吗？')) {
      await removeFavorite(id);
    }
  };

  // 处理备注编辑
  const handleSaveNotes = async (id: string) => {
    await updateFavoriteNotes(id, notesValue);
    setEditingNotes(null);
  };

  // 导出 Anki 卡片
  const handleExportAnki = () => {
    const vocabularyFavorites = favorites.filter(f => f.type === 'vocabulary' && f.vocabulary);

    if (vocabularyFavorites.length === 0) {
      alert('没有收藏的单词/短语');
      return;
    }

    // 生成 Anki 格式的 CSV
    const csvContent = [
      'Front,Back,Phonetic,Example',
      ...vocabularyFavorites.map(f => {
        const vocab = f.vocabulary!;
        return [
          vocab.text,
          vocab.meaning || '',
          vocab.phonetic || '',
          vocab.helper_sentence || '',
        ].map(field => `"${field.replace(/"/g, '""')}"`).join(',');
      })
    ].join('\n');

    // 下载文件
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `anki-vocabulary-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // 生成学习笔记
  const handleGenerateNotes = () => {
    const subtitleFavorites = favorites.filter(f => f.type === 'subtitle_segment' && f.subtitle);

    if (subtitleFavorites.length === 0) {
      alert('没有收藏的字幕段');
      return;
    }

    // 按视频分组
    const groupedByVideo: { [videoId: string]: typeof subtitleFavorites } = {};
    subtitleFavorites.forEach(f => {
      if (!groupedByVideo[f.video_id]) {
        groupedByVideo[f.video_id] = [];
      }
      groupedByVideo[f.video_id].push(f);
    });

    // 生成 Markdown 格式的笔记
    let markdown = '# 我的学习笔记\n\n';
    markdown += `生成时间：${new Date().toLocaleString('zh-CN')}\n\n`;

    Object.entries(groupedByVideo).forEach(([videoId, items]) => {
      const videoTitle = items[0].video?.title || '未知视频';
      markdown += `## ${videoTitle}\n\n`;

      items.forEach((item, index) => {
        const subtitle = item.subtitle!;
        const timeStr = `${Math.floor(subtitle.start_time / 60)}:${String(Math.floor(subtitle.start_time % 60)).padStart(2, '0')}`;

        markdown += `### 片段 ${index + 1} (${timeStr})\n\n`;
        if (subtitle.text_en) {
          markdown += `**英文：** ${subtitle.text_en}\n\n`;
        }
        if (subtitle.text_zh) {
          markdown += `**中文：** ${subtitle.text_zh}\n\n`;
        }
        if (item.notes) {
          markdown += `**笔记：** ${item.notes}\n\n`;
        }
        markdown += '---\n\n';
      });
    });

    // 下载文件
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `learning-notes-${new Date().toISOString().split('T')[0]}.md`;
    link.click();
  };

  if (loading && favorites.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* 顶部导航栏 */}
      <header className="bg-white/80 backdrop-blur-md border-b border-purple-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-gray-700 hover:text-purple-600 transition-colors"
              aria-label="返回首页"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">返回首页</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 标题 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">我的收藏</h1>
        </div>

        {/* 标签页 */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('video')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'video'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Video size={20} />
            视频收藏
            <span className="bg-gray-100 px-2 py-0.5 rounded-full text-sm">
              {favorites.filter(f => f.type === 'video').length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('vocabulary')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'vocabulary'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen size={20} />
            单词/短语
            <span className="bg-gray-100 px-2 py-0.5 rounded-full text-sm">
              {favorites.filter(f => f.type === 'vocabulary').length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('subtitle_segment')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'subtitle_segment'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageSquare size={20} />
            字幕段
            <span className="bg-gray-100 px-2 py-0.5 rounded-full text-sm">
              {favorites.filter(f => f.type === 'subtitle_segment').length}
            </span>
          </button>
        </div>

        {/* 内容区域 */}
        {filteredFavorites.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            暂无收藏
          </div>
        ) : (
          <div className="grid gap-4">
            {/* 视频收藏 */}
            {activeTab === 'video' && filteredFavorites.map(fav => (
              <div key={fav.id} className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex gap-4">
                  <Link href={`/videos/${fav.video_id}`} className="flex-shrink-0">
                    <Image
                      src={fav.video?.thumbnail_url || '/placeholder.jpg'}
                      alt={fav.video?.title || ''}
                      width={200}
                      height={112}
                      className="rounded-lg object-cover"
                    />
                  </Link>
                  <div className="flex-1">
                    <Link href={`/videos/${fav.video_id}`}>
                      <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 mb-2">
                        {fav.video?.title}
                      </h3>
                    </Link>
                    <p className="text-sm text-gray-500 mb-2">
                      时长：{fav.video?.duration_minutes} 分钟
                    </p>
                    <p className="text-xs text-gray-400">
                      收藏于：{new Date(fav.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(fav.id)}
                    className="text-red-500 hover:text-red-700 p-2"
                    title="取消收藏"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}

            {/* 单词/短语收藏 */}
            {activeTab === 'vocabulary' && filteredFavorites.map(fav => (
              <div key={fav.id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {fav.vocabulary?.text}
                    </h3>
                    {fav.vocabulary?.phonetic && (
                      <p className="text-sm text-gray-500 mb-2">
                        [{fav.vocabulary.phonetic}]
                      </p>
                    )}
                    {fav.vocabulary?.meaning && (
                      <p className="text-gray-700 mb-2">
                        {fav.vocabulary.meaning}
                      </p>
                    )}
                    {fav.vocabulary?.helper_sentence && (
                      <p className="text-sm text-gray-600 italic">
                        例句：{fav.vocabulary.helper_sentence}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      收藏于：{new Date(fav.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(fav.id)}
                    className="text-red-500 hover:text-red-700 p-2"
                    title="取消收藏"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}

            {/* 字幕段收藏 */}
            {activeTab === 'subtitle_segment' && filteredFavorites.map(fav => (
              <div key={fav.id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex justify-between items-start mb-3">
                  <Link
                    href={`/videos/${fav.video_id}?t=${fav.subtitle?.start_time}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {fav.video?.title}
                  </Link>
                  <button
                    onClick={() => handleDelete(fav.id)}
                    className="text-red-500 hover:text-red-700 p-2"
                    title="取消收藏"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
                <div className="space-y-2">
                  {fav.subtitle?.text_en && (
                    <p className="text-gray-900">{fav.subtitle.text_en}</p>
                  )}
                  {fav.subtitle?.text_zh && (
                    <p className="text-gray-600 text-sm">{fav.subtitle.text_zh}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    时间：{Math.floor(fav.subtitle?.start_time || 0 / 60)}:{String(Math.floor((fav.subtitle?.start_time || 0) % 60)).padStart(2, '0')}
                  </p>
                </div>

                {/* 备注 */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  {editingNotes === fav.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={notesValue}
                        onChange={(e) => setNotesValue(e.target.value)}
                        placeholder="添加备注..."
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveNotes(fav.id)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setEditingNotes(null)}
                        className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingNotes(fav.id);
                        setNotesValue(fav.notes || '');
                      }}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                      <StickyNote size={16} />
                      {fav.notes ? fav.notes : '添加备注'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
