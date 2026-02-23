'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface SubtitleItem {
  sequence: number;
  start_time: number;
  end_time: number;
  text_en: string;
  text_zh: string;
}

export default function UploadSubtitlesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoId = searchParams.get('video_id');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileType, setFileType] = useState<'json' | 'text'>('text');
  const [previewData, setPreviewData] = useState<SubtitleItem[]>([]);

  useEffect(() => {
    if (videoId) {
      fetchVideoInfo();
    }
  }, [videoId]);

  const fetchVideoInfo = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('videos')
      .select('title')
      .eq('id', videoId)
      .single();

    if (data) {
      setVideoTitle(data.title);
    }
  };

  // 解析时间戳（m:ss 或 mm:ss）转换为秒
  const parseTimeToSeconds = (timeStr: string): number => {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]);
      const seconds = parseInt(parts[1]);
      return minutes * 60 + seconds;
    }
    return 0;
  };

  const DEFAULT_SUBTITLE_DURATION = 5;

  const toFiniteNumber = (value: unknown, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const normalizeSubtitleTimes = (items: SubtitleItem[]): SubtitleItem[] => {
    if (!Array.isArray(items)) return [];

    const normalized = items.map((item, index) => ({
      ...item,
      sequence: Number.isFinite(Number(item.sequence)) ? Number(item.sequence) : index + 1,
      start_time: toFiniteNumber(item.start_time, 0),
      end_time: toFiniteNumber(item.end_time, NaN),
      text_en: item.text_en ?? '',
      text_zh: item.text_zh ?? '',
    }));

    let i = 0;
    while (i < normalized.length) {
      const currentStart = normalized[i].start_time;
      let j = i + 1;
      while (j < normalized.length && normalized[j].start_time === currentStart) {
        j++;
      }
      const nextStart = j < normalized.length ? normalized[j].start_time : null;

      const groupSize = j - i;
      const baseEnd =
        Number.isFinite(nextStart) && (nextStart as number) > currentStart
          ? (nextStart as number)
          : currentStart + DEFAULT_SUBTITLE_DURATION;

      if (groupSize > 1) {
        const window = Math.max(0.001, baseEnd - currentStart);
        const slot = window / groupSize;

        for (let k = i; k < j; k++) {
          const offset = slot * (k - i);
          normalized[k].start_time = currentStart + offset;
          normalized[k].end_time = currentStart + offset + slot;
        }
      } else {
        const current = normalized[i];
        const hasValidEnd = Number.isFinite(current.end_time) && current.end_time > current.start_time;
        if (!hasValidEnd) {
          current.end_time = baseEnd;
        }
      }

      i = j;
    }

    return normalized;
  };

  // 解析自定义文本格式
  const parseTextFormat = (content: string): SubtitleItem[] => {
    const lines = content.trim().split('\n');
    const subtitles: SubtitleItem[] = [];
    let currentBlock: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine === '') {
        // 空行，处理当前块
        if (currentBlock.length >= 3) {
          const timeStr = currentBlock[0];
          const textEn = currentBlock[1];
          const textZh = currentBlock[2];

          subtitles.push({
            sequence: subtitles.length + 1,
            start_time: parseTimeToSeconds(timeStr),
            end_time: 0, // 稍后计算
            text_en: textEn,
            text_zh: textZh
          });
        }
        currentBlock = [];
      } else {
        currentBlock.push(trimmedLine);
      }
    }

    // 处理最后一个块
    if (currentBlock.length >= 3) {
      const timeStr = currentBlock[0];
      const textEn = currentBlock[1];
      const textZh = currentBlock[2];

      subtitles.push({
        sequence: subtitles.length + 1,
        start_time: parseTimeToSeconds(timeStr),
        end_time: 0,
        text_en: textEn,
        text_zh: textZh
      });
    }

    // 计算结束时间
    for (let i = 0; i < subtitles.length; i++) {
      if (i < subtitles.length - 1) {
        subtitles[i].end_time = subtitles[i + 1].start_time;
      } else {
        // 最后一条字幕，默认持续5秒
        subtitles[i].end_time = subtitles[i].start_time + 5;
      }
    }

    return normalizeSubtitleTimes(subtitles);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFileContent(content);

      // 根据文件扩展名判断类型
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.json')) {
        setFileType('json');
        try {
          const parsed = normalizeSubtitleTimes(JSON.parse(content));
          setPreviewData(parsed);
          setError('');
        } catch (err) {
          setError('JSON格式错误，请检查文件内容');
          setPreviewData([]);
        }
      } else {
        // 默认为文本格式
        setFileType('text');
        try {
          const parsed = parseTextFormat(content);
          setPreviewData(parsed);
          setError('');
        } catch (err) {
          setError('文本格式解析失败，请检查文件内容');
          setPreviewData([]);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoId) {
      setError('缺少视频ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();

      // 根据文件类型解析数据
      let subtitles: SubtitleItem[];
      if (fileType === 'json') {
        subtitles = JSON.parse(fileContent);
      } else {
        subtitles = parseTextFormat(fileContent);
      }

      // 验证数据格式
      if (!Array.isArray(subtitles)) {
        throw new Error('字幕数据必须是数组格式');
      }

      // 删除该视频的旧字幕
      await supabase.from('subtitles').delete().eq('video_id', videoId);

      // 插入新字幕
      const normalizedSubtitles = normalizeSubtitleTimes(subtitles);
      const subtitlesToInsert = normalizedSubtitles.map((item: SubtitleItem) => ({
        video_id: videoId,
        sequence: item.sequence,
        start_time: item.start_time,
        end_time: item.end_time,
        text_en: item.text_en || null,
        text_zh: item.text_zh || null,
        seek_offset_confirmed_value: null,
        seek_offset_confirmed_at: null,
      }));

      const { error: insertError } = await supabase
        .from('subtitles')
        .insert(subtitlesToInsert);

      if (insertError) throw insertError;

      // 成功后跳转
      router.push(`/admin/subtitles?video_id=${videoId}`);
      router.refresh();
    } catch (err: any) {
      console.error('上传失败:', err);
      setError(err.message || '上传失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (!videoId) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">缺少视频ID参数</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">上传字幕</h1>
        <p className="mt-2 text-gray-600">为视频「{videoTitle}」上传字幕文件</p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* 格式说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">支持的格式</h3>

        <div className="space-y-4">
          {/* 文本格式说明 */}
          <div>
            <p className="text-sm font-medium text-blue-900 mb-1">1. 文本格式（推荐）</p>
            <pre className="text-xs text-blue-800 overflow-x-auto bg-white p-2 rounded">
{`0:00
But here's what I find the most fascinating.
但我觉得最有意思的是这一点。

0:02
Erewhon has effectively become an incubator.
Erewhon 实际上已经成为了孵化器。`}
            </pre>
            <p className="text-xs text-blue-700 mt-1">格式：时间戳 + 英文 + 中文，用空行分隔</p>
          </div>

          {/* JSON格式说明 */}
          <div>
            <p className="text-sm font-medium text-blue-900 mb-1">2. JSON格式</p>
            <pre className="text-xs text-blue-800 overflow-x-auto bg-white p-2 rounded">
{`[
  {
    "sequence": 1,
    "start_time": 0.0,
    "end_time": 2.5,
    "text_en": "Hello everyone",
    "text_zh": "大家好"
  }
]`}
            </pre>
          </div>
        </div>
      </div>

      {/* 上传表单 */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        {/* 文件上传 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择字幕文件（支持 .txt 或 .json）
          </label>
          <input
            type="file"
            accept=".txt,.json"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">
            文本格式：时间戳 + 英文 + 中文，用空行分隔 | JSON格式：标准字幕数组
          </p>
        </div>

        {/* 或者直接粘贴 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            或直接粘贴内容
          </label>
          <textarea
            value={fileContent}
            onChange={(e) => {
              const content = e.target.value;
              setFileContent(content);

              // 尝试解析
              try {
                // 先尝试JSON
                const parsed = normalizeSubtitleTimes(JSON.parse(content));
                setFileType('json');
                setPreviewData(parsed);
                setError('');
              } catch {
                // 如果不是JSON，尝试文本格式
                try {
                  const parsed = parseTextFormat(content);
                  setFileType('text');
                  setPreviewData(parsed);
                  setError('');
                } catch (err) {
                  setPreviewData([]);
                }
              }
            }}
            rows={10}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
            placeholder="粘贴字幕内容（文本格式或JSON格式）..."
          />
        </div>

        {/* 预览 */}
        {previewData.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              预览 ({previewData.length} 条字幕)
            </h3>
            <div className="border border-gray-300 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left">序号</th>
                    <th className="px-4 py-2 text-left">时间</th>
                    <th className="px-4 py-2 text-left">英文</th>
                    <th className="px-4 py-2 text-left">中文</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {previewData.slice(0, 10).map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2">{item.sequence}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {item.start_time}s - {item.end_time}s
                      </td>
                      <td className="px-4 py-2 truncate max-w-xs">{item.text_en}</td>
                      <td className="px-4 py-2 truncate max-w-xs">{item.text_zh}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewData.length > 10 && (
                <div className="px-4 py-2 bg-gray-50 text-center text-xs text-gray-600">
                  还有 {previewData.length - 10} 条字幕未显示...
                </div>
              )}
            </div>
          </div>
        )}

        {/* 按钮 */}
        <div className="flex items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={loading || !fileContent || previewData.length === 0}
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
