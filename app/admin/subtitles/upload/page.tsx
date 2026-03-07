'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAdminToast } from '../../components/AdminToastProvider';

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
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileType, setFileType] = useState<'json' | 'text'>('text');
  const [previewData, setPreviewData] = useState<SubtitleItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [aiModel, setAiModel] = useState('gpt-5.2');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useAdminToast();

  const AI_MODELS = [
    { value: 'gpt-5.2', label: 'GPT-5.2' },
    { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  ];

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

  const parseTimeToSeconds = (timeStr: string): number => {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]);
      const seconds = parseInt(parts[1]);
      return minutes * 60 + seconds;
    }
    return 0;
  };

  const formatSeconds = (s: number): string => {
    const total = Math.round(s);
    const m = Math.floor(total / 60);
    const sec = total % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
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

  const parseTextFormat = (content: string): SubtitleItem[] => {
    const lines = content.trim().split('\n');
    const subtitles: SubtitleItem[] = [];
    let currentBlock: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine === '') {
        if (currentBlock.length >= 3) {
          subtitles.push({
            sequence: subtitles.length + 1,
            start_time: parseTimeToSeconds(currentBlock[0]),
            end_time: 0,
            text_en: currentBlock[1],
            text_zh: currentBlock[2],
          });
        }
        currentBlock = [];
      } else {
        currentBlock.push(trimmedLine);
      }
    }

    if (currentBlock.length >= 3) {
      subtitles.push({
        sequence: subtitles.length + 1,
        start_time: parseTimeToSeconds(currentBlock[0]),
        end_time: 0,
        text_en: currentBlock[1],
        text_zh: currentBlock[2],
      });
    }

    for (let i = 0; i < subtitles.length; i++) {
      if (i < subtitles.length - 1) {
        subtitles[i].end_time = subtitles[i + 1].start_time;
      } else {
        subtitles[i].end_time = subtitles[i].start_time + 5;
      }
    }

    return normalizeSubtitleTimes(subtitles);
  };

  const processFile = (file: File) => {
    setSelectedFileName(file.name);
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.docx')) {
      handleWordFile(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFileContent(content);

      if (fileName.endsWith('.json')) {
        setFileType('json');
        try {
          const parsed = normalizeSubtitleTimes(JSON.parse(content));
          setPreviewData(parsed);
          setError('');
        } catch {
          setError('JSON格式错误，请检查文件内容');
          setPreviewData([]);
        }
      } else {
        setFileType('text');
        try {
          const parsed = parseTextFormat(content);
          setPreviewData(parsed);
          setError('');
        } catch {
          setError('文本格式解析失败，请检查文件内容');
          setPreviewData([]);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleWordFile = async (file: File) => {
    setAiLoading(true);
    setError('');
    setPreviewData([]);
    setFileContent('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('model', aiModel);

      const resp = await fetch('/api/admin/ai/word-to-subtitle', {
        method: 'POST',
        body: formData,
      });

      const data = await resp.json();

      if (!resp.ok) {
        setError(data.error || 'AI 转换失败');
        return;
      }

      const normalized = normalizeSubtitleTimes(data.subtitles);
      setPreviewData(normalized);
      setFileContent(JSON.stringify(normalized, null, 2));
      setFileType('json');
      showToast('success', `AI 成功转换 ${normalized.length} 条字幕`);
    } catch (err: any) {
      setError('Word 文件解析失败：' + (err.message || '未知错误'));
    } finally {
      setAiLoading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
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

      let subtitles: SubtitleItem[];
      if (fileType === 'json') {
        subtitles = JSON.parse(fileContent);
      } else {
        subtitles = parseTextFormat(fileContent);
      }

      if (!Array.isArray(subtitles)) {
        throw new Error('字幕数据必须是数组格式');
      }

      await supabase.from('subtitles').delete().eq('video_id', videoId);

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

      showToast('success', '字幕上传成功');
      router.push(`/admin/subtitles?video_id=${videoId}`);
      router.refresh();
    } catch (err: any) {
      console.error('上传失败:', err);
      const message = err.message || '上传失败，请重试';
      setError(message);
      showToast('error', message);
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">上传字幕</h1>
        <p className="mt-2 text-gray-600">为视频「{videoTitle}」上传字幕文件</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* 格式说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">支持的格式</h3>
        <div className="space-y-4">
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
          <div>
            <p className="text-sm font-medium text-blue-900 mb-1">3. Word 文档（.docx）</p>
            <p className="text-xs text-blue-700">上传 Word 文件后，AI 将自动识别时间戳、英文和中文内容并转换为字幕格式</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        {/* 文件上传区域 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              选择字幕文件（支持 .txt、.json 或 .docx）
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Word 转换模型：</span>
              <select
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              >
                {AI_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`
              relative flex flex-col items-center justify-center w-full h-32 px-6
              border-2 border-dashed rounded-xl cursor-pointer transition-all
              ${dragOver
                ? 'border-purple-400 bg-purple-50'
                : selectedFileName
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-50'
              }
            `}
          >
            {aiLoading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-purple-600 font-medium">AI 正在转换 Word 文档...</p>
              </div>
            ) : selectedFileName ? (
              <div className="flex flex-col items-center gap-1">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-green-700">{selectedFileName}</p>
                <p className="text-xs text-gray-500">点击重新选择文件</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-purple-600">点击选择文件</span>
                  <span className="text-gray-500"> 或拖拽到此处</span>
                </p>
                <p className="text-xs text-gray-400">.txt · .json · .docx（Word 文档将由 AI 自动转换）</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.json,.docx"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
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
              try {
                const parsed = normalizeSubtitleTimes(JSON.parse(content));
                setFileType('json');
                setPreviewData(parsed);
                setError('');
              } catch {
                try {
                  const parsed = parseTextFormat(content);
                  setFileType('text');
                  setPreviewData(parsed);
                  setError('');
                } catch {
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
                        {formatSeconds(item.start_time)} - {formatSeconds(item.end_time)}
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
