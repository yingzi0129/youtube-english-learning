'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AudioRecorderProps {
  videoId: string;
  subtitleId: number;
  onRecordingComplete?: (audioUrl: string) => void;
  existingAudioUrl?: string;
  subtitleStartTime: number;
  subtitleEndTime: number;
  onPlayOriginal?: () => void;
}

export default function AudioRecorder({
  videoId,
  subtitleId,
  onRecordingComplete,
  existingAudioUrl,
  subtitleStartTime,
  subtitleEndTime,
  onPlayOriginal,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingAudioUrl || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const MAX_RECORDING_SECONDS = 60; // 最大录音时长60秒

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 当 existingAudioUrl 变化时，更新 audioUrl 状态
  useEffect(() => {
    if (existingAudioUrl) {
      setAudioUrl(existingAudioUrl);
    }
  }, [existingAudioUrl]);

  // 清理定时器和音频上下文
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // 分析音频电平
  const analyzeAudio = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(dataArray);

    // 计算音量（使用时域数据）
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    setAudioLevel(Math.min(rms * 3, 1)); // 放大并限制在 0-1

    animationFrameRef.current = requestAnimationFrame(analyzeAudio);
  };

  // 开始录音
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 创建音频上下文用于分析音量
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // 开始分析音频
      analyzeAudio();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // 停止音频分析
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        setAudioLevel(0);

        // 上传音频
        await uploadAudio(audioBlob);

        // 停止所有音频轨道
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // 开始计时
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          // 达到60秒自动停止
          if (newTime >= MAX_RECORDING_SECONDS) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);
    } catch (error) {
      alert('无法访问麦克风，请检查权限设置');
    }
  };

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // 上传音频到服务器
  const uploadAudio = async (audioBlob: Blob) => {
    setIsUploading(true);
    setUploadProgress(0);
    try {
      // 创建 FormData
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('videoId', videoId);
      formData.append('subtitleId', subtitleId.toString());
      formData.append('durationSeconds', recordingTime.toString());

      // 使用 XMLHttpRequest 来跟踪上传进度
      const uploadPromise = new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // 监听上传进度
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(percentComplete);
          }
        });

        // 监听完成
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            resolve(response.audioUrl);
          } else {
            reject(new Error(`上传失败: ${xhr.status}`));
          }
        });

        // 监听错误
        xhr.addEventListener('error', () => {
          reject(new Error('网络错误'));
        });

        xhr.open('POST', '/api/upload-audio');
        xhr.send(formData);
      });

      const publicUrl = await uploadPromise;

      setAudioUrl(publicUrl);
      if (onRecordingComplete) {
        onRecordingComplete(publicUrl);
      }
    } catch (error) {
      alert(`录音上传失败，请重试`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // 播放录音
  const playRecording = () => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // 停止播放
  const stopPlaying = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2">
      {/* 录音按钮 */}
      {!isRecording && (
        <button
          onClick={startRecording}
          disabled={isUploading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="开始录音"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
              clipRule="evenodd"
            />
          </svg>
          {audioUrl ? '重新录制' : '录制'}
        </button>
      )}

      {/* 停止录音按钮（带音频波形动画） */}
      {isRecording && (
        <button
          onClick={stopRecording}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-lg transition-colors"
          title="停止录音"
        >
          <div className="flex items-center gap-0.5 h-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-0.5 bg-white rounded-full transition-all duration-75"
                style={{
                  height: `${4 + audioLevel * 12 + Math.sin(Date.now() / 50 + i) * 2}px`,
                }}
              />
            ))}
          </div>
          <span>停止 {formatTime(recordingTime)} / {formatTime(MAX_RECORDING_SECONDS)}</span>
        </button>
      )}

      {/* 播放录音按钮 */}
      {audioUrl && !isRecording && (
        <>
          {!isPlaying ? (
            <button
              onClick={playRecording}
              disabled={isUploading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="播放我的录音"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
              播放
            </button>
          ) : (
            <button
              onClick={stopPlaying}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-lg transition-colors"
              title="停止播放"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              停止
            </button>
          )}
        </>
      )}

      {/* 播放原文按钮 */}
      {!isRecording && onPlayOriginal && (
        <button
          onClick={() => onPlayOriginal()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg transition-colors"
          title="播放原文"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
          </svg>
          原文
        </button>
      )}

      {/* 上传中提示 */}
      {isUploading && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="relative w-4 h-4">
            <div className="absolute inset-0 border-2 border-blue-200 rounded-full"></div>
            <div className="absolute inset-0 border-2 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
          </div>
          <span className="text-xs text-blue-700 font-medium">
            上传中 {uploadProgress}%
          </span>
        </div>
      )}

      {/* 隐藏的音频元素 */}
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setIsPlaying(false);
          alert('播放失败');
        }}
      />
    </div>
  );
}
