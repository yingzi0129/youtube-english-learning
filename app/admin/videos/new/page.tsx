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
    difficulty: '鍒濈骇' as '鍒濈骇' | '涓骇' | '楂樼骇',
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
        throw new Error('璇烽€夋嫨瑙嗛鏂囦欢');
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
        throw new Error(result?.error || '涓婁紶澶辫触');
      }
      showToast('success', '瑙嗛涓婁紶鎴愬姛');
      router.push('/admin/videos');
      router.refresh();
    } catch (err: any) {
      console.error('淇濆瓨澶辫触:', err);
      const message = err.message || '淇濆瓨澶辫触锛岃閲嶈瘯';
      setError(message);
      showToast('error', message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 椤甸潰鏍囬 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">娣诲姞瑙嗛</h1>
        <p className="mt-2 text-gray-600">涓婁紶鏂扮殑瀛︿範瑙嗛</p>
      </div>
      {/* 閿欒鎻愮ず */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}
      {/* 琛ㄥ崟 */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        {/* 瑙嗛鏂囦欢 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            瑙嗛鏂囦欢 <span className="text-red-500">*</span>
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
                    <p className="mb-2 text-sm font-semibold text-gray-700">鐐瑰嚮涓婁紶瑙嗛鏂囦欢</p>
                    <p className="text-xs text-gray-500">鏀寔 MP4, MOV, AVI 绛夋牸寮?/p>
                  </>
                )}
              </div>
            </label>
          </div>
          <p className="mt-2 text-sm text-gray-500">涓婁紶涓€娆★紝绯荤粺灏嗚嚜鍔ㄥ悓姝ュ埌鍙屽瓨鍌紙闈為樆濉烇級銆?/p>
        </div>
        {/* 缂╃暐鍥?*/}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            缂╃暐鍥撅紙鍙€夛級
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
                    <p className="mb-2 text-sm font-semibold text-gray-700">鐐瑰嚮涓婁紶缂╃暐鍥?/p>
                    <p className="text-xs text-gray-500">鏀寔 JPG, PNG, WebP 绛夋牸寮?/p>
                  </>
                )}
              </div>
            </label>
          </div>
          <p className="mt-2 text-sm text-gray-500">寤鸿涓婁紶娓呮櫚妯悜灏侀潰鍥俱€?/p>
        </div>
        {/* 鏍囬 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            瑙嗛鏍囬 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required
          />
        </div>
        {/* 鎻忚堪 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            瑙嗛鎻忚堪
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        {/* 鍗氫富鍚嶇О */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            鍗氫富鍚嶇О <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.creator_name}
            onChange={(e) => setFormData({ ...formData, creator_name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required
          />
        </div>
        {/* 闅惧害鍜屾椂闀?*/}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              闅惧害绛夌骇 <span className="text-red-500">*</span>
            </label>
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            >
              <option value="鍒濈骇">鍒濈骇</option>
              <option value="涓骇">涓骇</option>
              <option value="楂樼骇">楂樼骇</option>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              鏃堕暱锛堝垎閽燂級 <span className="text-red-500">*</span>
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
        {/* 鏍囩 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            鏍囩锛堢敤閫楀彿鍒嗛殧锛?          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="渚嬪: 鏃ュ父鐢熸椿, 鏃呰, 缇庨"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        {/* 璇濋 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            璇濋锛堢敤閫楀彿鍒嗛殧锛?          </label>
          <input
            type="text"
            value={formData.topics}
            onChange={(e) => setFormData({ ...formData, topics: e.target.value })}
            placeholder="渚嬪: 鑻辫瀛︿範, 鍙ｈ缁冧範"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        {/* 鎸夐挳 */}
        <div className="flex items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '涓婁紶涓?..' : '鎻愪氦'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            鍙栨秷
          </button>
        </div>
      </form>
    </div>
  );
}
