import { create } from 'zustand';
import type { Favorite, FavoriteWithDetails, FavoriteType, CreateFavoriteRequest } from '@/lib/types/favorites';

interface FavoritesState {
  favorites: FavoriteWithDetails[];
  favoriteIds: Set<string>; // 用于快速查找
  loading: boolean;
  error: string | null;

  // Actions
  fetchFavorites: (type?: FavoriteType, mode?: 'full' | 'ids') => Promise<void>;
  addFavorite: (request: CreateFavoriteRequest) => Promise<Favorite | null>;
  removeFavorite: (id: string) => Promise<boolean>;
  addFavoriteOptimistic: (request: CreateFavoriteRequest) => Promise<Favorite | null>;
  removeFavoriteOptimistic: (id: string) => Promise<boolean>;
  updateFavoriteNotes: (id: string, notes: string) => Promise<boolean>;
  checkFavoriteStatus: (type: FavoriteType, itemId: string) => boolean;
  clearFavorites: () => void;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],
  favoriteIds: new Set(),
  loading: false,
  error: null,

  fetchFavorites: async (type?: FavoriteType, mode: 'full' | 'ids' = 'full') => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (type) {
        params.append('type', type);
      }
      if (mode === 'ids') {
        params.append('mode', 'ids');
      }

      const response = await fetch(`/api/favorites?${params.toString()}`);
      if (!response.ok) {
        // 如果是 401 未登录，不抛出错误，只是清空收藏
        if (response.status === 401) {
          set({ favorites: [], favoriteIds: new Set(), loading: false });
          return;
        }
        throw new Error('获取收藏列表失败');
      }

      const { data } = await response.json();

      // 构建 favoriteIds Set
      const ids = new Set<string>();
      if (data && Array.isArray(data)) {
        data.forEach((fav: FavoriteWithDetails) => {
          if (fav.type === 'video') {
            ids.add(`video:${fav.video_id}`);
          } else if (fav.type === 'vocabulary' && fav.vocabulary_id) {
            ids.add(`vocabulary:${fav.vocabulary_id}`);
          } else if (fav.type === 'subtitle_segment' && fav.subtitle_id) {
            ids.add(`subtitle:${fav.subtitle_id}`);
          }
        });
      }

      set({ favorites: data || [], favoriteIds: ids, loading: false });
    } catch (error) {
      console.error('获取收藏列表失败:', error);
      // 不要因为获取收藏失败而影响页面加载，只是设置空数组
      set({ favorites: [], favoriteIds: new Set(), error: null, loading: false });
    }
  },

  addFavorite: async (request: CreateFavoriteRequest) => {
    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '添加收藏失败' }));
        throw new Error(errorData.error || '添加收藏失败');
      }

      const { data } = await response.json();

      // 乐观更新：添加到本地状态
      const { favorites, favoriteIds } = get();
      const newFavorites = [data, ...favorites];
      const newIds = new Set(favoriteIds);

      if (data.type === 'video') {
        newIds.add(`video:${data.video_id}`);
      } else if (data.type === 'vocabulary' && data.vocabulary_id) {
        newIds.add(`vocabulary:${data.vocabulary_id}`);
      } else if (data.type === 'subtitle_segment' && data.subtitle_id) {
        newIds.add(`subtitle:${data.subtitle_id}`);
      }

      set({ favorites: newFavorites, favoriteIds: newIds });
      return data;
    } catch (error) {
      console.error('添加收藏失败:', error);
      const errorMessage = error instanceof Error ? error.message : '添加收藏失败';
      set({ error: errorMessage });
      return null;
    }
  },

  removeFavorite: async (id: string) => {
    try {
      const response = await fetch(`/api/favorites/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除收藏失败');
      }

      // 乐观更新：从本地状态移除
      const { favorites, favoriteIds } = get();
      const removedFav = favorites.find(f => f.id === id);
      const newFavorites = favorites.filter(f => f.id !== id);
      const newIds = new Set(favoriteIds);

      if (removedFav) {
        if (removedFav.type === 'video') {
          newIds.delete(`video:${removedFav.video_id}`);
        } else if (removedFav.type === 'vocabulary' && removedFav.vocabulary_id) {
          newIds.delete(`vocabulary:${removedFav.vocabulary_id}`);
        } else if (removedFav.type === 'subtitle_segment' && removedFav.subtitle_id) {
          newIds.delete(`subtitle:${removedFav.subtitle_id}`);
        }
      }

      set({ favorites: newFavorites, favoriteIds: newIds });
      return true;
    } catch (error) {
      console.error('删除收藏失败:', error);
      set({ error: '删除收藏失败' });
      return false;
    }
  },

  // 乐观更新版本：立即更新 UI，后台同步
  addFavoriteOptimistic: async (request: CreateFavoriteRequest) => {
    // 1. 立即更新本地状态（乐观更新）
    const tempId = `temp-${Date.now()}`;
    const optimisticFavorite: any = {
      id: tempId,
      user_id: 'current-user',
      type: request.type,
      video_id: request.video_id,
      vocabulary_id: request.vocabulary_id || null,
      subtitle_id: request.subtitle_id || null,
      notes: request.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { favorites, favoriteIds } = get();
    const newFavorites = [optimisticFavorite, ...favorites];
    const newIds = new Set(favoriteIds);

    // 添加到 favoriteIds
    if (request.type === 'video') {
      newIds.add(`video:${request.video_id}`);
    } else if (request.type === 'vocabulary' && request.vocabulary_id) {
      newIds.add(`vocabulary:${request.vocabulary_id}`);
    } else if (request.type === 'subtitle_segment' && request.subtitle_id) {
      newIds.add(`subtitle:${request.subtitle_id}`);
    }

    set({ favorites: newFavorites, favoriteIds: newIds });

    // 2. 后台发送请求
    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '添加收藏失败' }));
        throw new Error(errorData.error || '添加收藏失败');
      }

      const { data } = await response.json();

      // 3. 用真实数据替换临时数据
      const currentFavorites = get().favorites;
      const updatedFavorites = currentFavorites.map(f =>
        f.id === tempId ? data : f
      );

      set({ favorites: updatedFavorites });
      return data;
    } catch (error) {
      console.error('添加收藏失败:', error);

      // 4. 如果失败，回滚本地状态
      const currentFavorites = get().favorites;
      const currentIds = get().favoriteIds;
      const rolledBackFavorites = currentFavorites.filter(f => f.id !== tempId);
      const rolledBackIds = new Set(currentIds);

      if (request.type === 'video') {
        rolledBackIds.delete(`video:${request.video_id}`);
      } else if (request.type === 'vocabulary' && request.vocabulary_id) {
        rolledBackIds.delete(`vocabulary:${request.vocabulary_id}`);
      } else if (request.type === 'subtitle_segment' && request.subtitle_id) {
        rolledBackIds.delete(`subtitle:${request.subtitle_id}`);
      }

      set({ favorites: rolledBackFavorites, favoriteIds: rolledBackIds });
      return null;
    }
  },

  removeFavoriteOptimistic: async (id: string) => {
    // 1. 立即更新本地状态（乐观更新）
    const { favorites, favoriteIds } = get();
    const removedFav = favorites.find(f => f.id === id);
    const newFavorites = favorites.filter(f => f.id !== id);
    const newIds = new Set(favoriteIds);

    if (removedFav) {
      if (removedFav.type === 'video') {
        newIds.delete(`video:${removedFav.video_id}`);
      } else if (removedFav.type === 'vocabulary' && removedFav.vocabulary_id) {
        newIds.delete(`vocabulary:${removedFav.vocabulary_id}`);
      } else if (removedFav.type === 'subtitle_segment' && removedFav.subtitle_id) {
        newIds.delete(`subtitle:${removedFav.subtitle_id}`);
      }
    }

    set({ favorites: newFavorites, favoriteIds: newIds });

    // 2. 后台发送请求
    try {
      const response = await fetch(`/api/favorites/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除收藏失败');
      }

      return true;
    } catch (error) {
      console.error('删除收藏失败:', error);

      // 3. 如果失败，回滚本地状态
      if (removedFav) {
        const currentFavorites = get().favorites;
        const currentIds = get().favoriteIds;
        const rolledBackFavorites = [removedFav, ...currentFavorites];
        const rolledBackIds = new Set(currentIds);

        if (removedFav.type === 'video') {
          rolledBackIds.add(`video:${removedFav.video_id}`);
        } else if (removedFav.type === 'vocabulary' && removedFav.vocabulary_id) {
          rolledBackIds.add(`vocabulary:${removedFav.vocabulary_id}`);
        } else if (removedFav.type === 'subtitle_segment' && removedFav.subtitle_id) {
          rolledBackIds.add(`subtitle:${removedFav.subtitle_id}`);
        }

        set({ favorites: rolledBackFavorites, favoriteIds: rolledBackIds });
      }

      return false;
    }
  },

  updateFavoriteNotes: async (id: string, notes: string) => {
    try {
      const response = await fetch(`/api/favorites/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        throw new Error('更新备注失败');
      }

      const { data } = await response.json();

      // 更新本地状态
      const { favorites } = get();
      const newFavorites = favorites.map(f =>
        f.id === id ? { ...f, notes: data.notes } : f
      );

      set({ favorites: newFavorites });
      return true;
    } catch (error) {
      console.error('更新备注失败:', error);
      set({ error: '更新备注失败' });
      return false;
    }
  },

  checkFavoriteStatus: (type: FavoriteType, itemId: string) => {
    const { favoriteIds } = get();
    return favoriteIds.has(`${type === 'subtitle_segment' ? 'subtitle' : type}:${itemId}`);
  },

  clearFavorites: () => {
    set({ favorites: [], favoriteIds: new Set(), error: null });
  },
}));
