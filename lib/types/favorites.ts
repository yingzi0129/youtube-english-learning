// ============================================
// 收藏功能相关类型定义
// ============================================

export type FavoriteType = 'video' | 'vocabulary' | 'subtitle_segment';

export interface Favorite {
  id: string;
  user_id: string;
  type: FavoriteType;
  video_id: string;
  vocabulary_id?: string | null;
  subtitle_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

// 创建收藏的请求参数
export interface CreateFavoriteRequest {
  type: FavoriteType;
  video_id: string;
  vocabulary_id?: string;
  subtitle_id?: string;
  notes?: string;
}

// 收藏详情（包含关联数据）
export interface FavoriteWithDetails extends Favorite {
  video?: {
    id: string;
    title: string;
    thumbnail_url: string;
    duration_minutes: number;
  };
  vocabulary?: {
    id: string;
    text: string;
    phonetic?: string;
    meaning?: string;
    helper_sentence?: string;
  };
  subtitle?: {
    id: string;
    text_en?: string;
    text_zh?: string;
    start_time: number;
    end_time: number;
  };
}

// 批量检查收藏状态的请求
export interface CheckFavoritesRequest {
  type: FavoriteType;
  ids: string[]; // video_id, vocabulary_id 或 subtitle_id
}

// 批量检查收藏状态的响应
export interface CheckFavoritesResponse {
  [id: string]: boolean; // id -> 是否已收藏
}
