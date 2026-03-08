'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminToast } from '../../components/AdminToastProvider';
export default function NewVideoPage() {
  const router = useRouter();
  const { showToast } = useAdminToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    creator_name: '',
    difficulty: '初级' as '初级' | '中级' | '高级',
    duration_minutes: 0,
    tags: '',
    topics: '',
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!videoFile) {
        throw new Error('请选择视频文件');
      }
      const payload = new FormData();
      payload.append('video', videoFile);
      if (thumbnailFile) {
        payload.append('thumbnail', thumbnailFile);
      }
      payload.append('title', formData.title);
      payload.append('description', formData.description);
      payload.append('creator_name', formData.creator_name);
      payload.append('difficulty', formData.difficulty);
      payload.append('duration_minutes', String(formData.duration_minutes || 0));
      payload.append('tags', formData.tags || '');
      payload.append('topics', formData.topics || '');
      const response = await fetch('/api/admin/videos/upload', {
        method: 'POST',
        body: payload,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || '上传失败');
      }
      showToast('success', '视频上传成功');
      router.push('/admin/videos');
      router.refresh();
    } catch (err: any) {
      console.error('保存失败:', err);
      const message = err.message || '保存失败，请重试';
      setError(message);
      showToast('error', message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">添加视频</h1>
        <p className="mt-2 text-gray-600">上传新的学习视频</p>
      </div>
      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}
      {/* 表单 */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        {/* 视频文件 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            视频文件 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              className="hidden"
              id="video-upload"
              required
            />
            <label
              htmlFor="video-upload"
              className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all hover:border-purple-400"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {videoFile ? (
                  <>
                    <svg className="w-12 h-12 mb-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="mb-2 text-sm font-semibold text-gray-700">{videoFile.name}</p>
                    <p className="text-xs text-gray-500">{(videoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </>
                ) : (
                  <>
                    <svg className="w-12 h-12 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="mb-2 text-sm font-semibold text-gray-700">点击上传视频文件</p>
                    <p className="text-xs text-gray-500">支持 MP4、MOV、AVI 等格式</p>
                  </>
                )}
              </div>
            </label>
          </div>
          <p className="mt-2 text-sm text-gray-500">上传一次，系统将自动同步到双存储（非阻塞）。</p>
        </div>
        {/* 缩略图*/}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            缩略图（可选）
          </label>
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
              className="hidden"
              id="thumbnail-upload"
            />
            <label
              htmlFor="thumbnail-upload"
              className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all hover:border-purple-400"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {thumbnailFile ? (
                  <>
                    <svg className="w-12 h-12 mb-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="mb-2 text-sm font-semibold text-gray-700">{thumbnailFile.name}</p>
                    <p className="text-xs text-gray-500">{(thumbnailFile.size / 1024).toFixed(2)} KB</p>
                  </>
                ) : (
                  <>
                    <svg className="w-12 h-12 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="mb-2 text-sm font-semibold text-gray-700">点击上传缩略图</p>
                    <p className="text-xs text-gray-500">支持 JPG、PNG、WebP 等格式</p>
                  </>
                )}
              </div>
            </label>
          </div>
          <p className="mt-2 text-sm text-gray-500">建议上传清晰横向封面图。</p>
        </div>
        {/* 标题 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            视频标题 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required
          />
        </div>
        {/* 描述 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            视频描述
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        {/* 作者名称 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            作者名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.creator_name}
            onChange={(e) => setFormData({ ...formData, creator_name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required
          />
        </div>
        {/* 难度和时长*/}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              难度等级 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            >
              <option value="初级">初级</option>
              <option value="中级">中级</option>
              <option value="高级">高级</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              时长（分钟） <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
              min="0"
            />
          </div>
        </div>
        {/* 标签 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            标签（用逗号分隔）          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="例如: 日常生活, 旅行, 美食"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        {/* 话题 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            话题（用逗号分隔）          </label>
          <input
            type="text"
            value={formData.topics}
            onChange={(e) => setFormData({ ...formData, topics: e.target.value })}
            placeholder="例如: 英语学习, 口语练习"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        {/* 按钮 */}
        <div className="flex items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '上传中...' : '提交'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}

