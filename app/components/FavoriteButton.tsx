'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useFavoritesStore } from '@/lib/stores/favorites-store';
import type { FavoriteType, CreateFavoriteRequest } from '@/lib/types/favorites';

interface FavoriteButtonProps {
  type: FavoriteType;
  videoId: string;
  itemId: string; // video_id, vocabulary_id 或 subtitle_id
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  onToggle?: (isFavorited: boolean) => void;
}

export default function FavoriteButton({
  type,
  videoId,
  itemId,
  size = 'md',
  showText = false,
  className = '',
  onToggle,
}: FavoriteButtonProps) {
  const { checkFavoriteStatus, addFavoriteOptimistic, removeFavoriteOptimistic, favorites } = useFavoritesStore();

  // 使用本地状态实现即时 UI 反馈
  const [localIsFavorited, setLocalIsFavorited] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 同步 store 状态到本地状态（包括初始化和后续更新）
  useEffect(() => {
    const isFavorited = checkFavoriteStatus(type, itemId);
    setLocalIsFavorited(isFavorited);
  }, [favorites, checkFavoriteStatus, type, itemId]); // 监听 favorites 变化

  // 获取收藏 ID（用于删除）
  const favoriteId = favorites.find(f => {
    if (f.type === 'video') return f.video_id === itemId;
    if (f.type === 'vocabulary') return f.vocabulary_id === itemId;
    if (f.type === 'subtitle_segment') return f.subtitle_id === itemId;
    return false;
  })?.id;

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isProcessing) return;

    // 立即更新 UI（乐观更新）
    const newFavoritedState = !localIsFavorited;
    setLocalIsFavorited(newFavoritedState);
    setIsProcessing(true);

    try {
      if (!newFavoritedState && favoriteId) {
        // 取消收藏
        const success = await removeFavoriteOptimistic(favoriteId);
        if (!success) {
          // 如果失败，回滚 UI
          setLocalIsFavorited(!newFavoritedState);
        } else {
          onToggle?.(false);
        }
      } else {
        // 添加收藏
        const request: CreateFavoriteRequest = {
          type,
          video_id: videoId,
        };

        if (type === 'vocabulary') {
          request.vocabulary_id = itemId;
        } else if (type === 'subtitle_segment') {
          request.subtitle_id = itemId;
        }

        const result = await addFavoriteOptimistic(request);
        if (!result) {
          // 如果失败，回滚 UI
          setLocalIsFavorited(!newFavoritedState);
        } else {
          onToggle?.(true);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // 尺寸样式
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const iconSize = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isProcessing}
      className={`
        inline-flex items-center justify-center gap-1.5
        ${sizeClasses[size]}
        rounded-full
        transition-all duration-200
        ${localIsFavorited
          ? 'text-red-500 hover:text-red-600'
          : 'text-gray-400 hover:text-red-500'
        }
        ${isProcessing ? 'opacity-70' : 'cursor-pointer'}
        ${className}
      `}
      title={localIsFavorited ? '取消收藏' : '收藏'}
    >
      <Heart
        size={iconSize[size]}
        fill={localIsFavorited ? 'currentColor' : 'none'}
        className={`transition-all ${isProcessing ? 'animate-pulse' : ''}`}
      />
      {showText && (
        <span className="text-sm">
          {localIsFavorited ? '已收藏' : '收藏'}
        </span>
      )}
    </button>
  );
}
