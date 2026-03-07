import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isTrialUser } from '@/lib/auth/trial';

export const runtime = 'nodejs';

type RouteParams = { id: string } | Promise<{ id: string }>;
type QueryResult = { data: unknown | null; error: any };
type QueryRunner = (selectFields: string) => unknown;

type SubtitleRow = {
  id: string;
  sequence: number;
  start_time: number | string | null;
  end_time: number | string | null;
  text_en: string | null;
  text_zh: string | null;
  seek_offset: number | string | null;
  annotations?: unknown;
  learning_points?: unknown;
};

type ApiSubtitle = {
  id: number;
  dbId?: string;
  startTime: number;
  endTime: number;
  text: string;
  translation: string;
  seekOffset?: number;
  annotations?: Array<{
    id: string;
    type?: 'word' | 'phrase';
    text: string;
    start: number;
    end: number;
    phonetic?: string;
    meaning?: string;
    helperSentence?: string;
  }>;
};

const SELECT_FIELDS_FULL =
  'id, sequence, start_time, end_time, text_en, text_zh, seek_offset, annotations, learning_points';
const SELECT_FIELDS_MIN =
  'id, sequence, start_time, end_time, text_en, text_zh, seek_offset';

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;
const DEFAULT_BACK = 60;
const MAX_BACK = 200;

const resolveVideoId = async (request: NextRequest, params: RouteParams) => {
  const resolved = await Promise.resolve(params);
  if (resolved?.id) return resolved.id;

  const pathname = request.nextUrl?.pathname || '';
  const parts = pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('videos');
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  return '';
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const parseNumber = (value: string | null, fallback: number | null) => {
  if (value == null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseAnnotations = (row: SubtitleRow) => {
  const raw = row.annotations ?? row.learning_points ?? null;
  if (!raw) return [] as ApiSubtitle['annotations'];
  if (Array.isArray(raw)) return raw as ApiSubtitle['annotations'];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ApiSubtitle['annotations']) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const toRows = (data: unknown): SubtitleRow[] => {
  if (!Array.isArray(data)) return [];
  return data as SubtitleRow[];
};

const isMissingColumnError = (error: any) => {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  if (message.includes('column') && message.includes('does not exist')) return true;
  if (message.includes('schema cache') && message.includes('not found')) return true;
  return false;
};

const fetchWithFallback = async (builder: QueryRunner): Promise<QueryResult> => {
  const full = await Promise.resolve(builder(SELECT_FIELDS_FULL)) as QueryResult;
  if (!full.error) return full;
  if (isMissingColumnError(full.error)) {
    return (await Promise.resolve(builder(SELECT_FIELDS_MIN))) as QueryResult;
  }
  return full;
};

const mapSubtitle = (row: SubtitleRow): ApiSubtitle => ({
  id: Number(row.sequence),
  dbId: row.id,
  startTime: Number(row.start_time ?? 0),
  endTime: Number(row.end_time ?? 0),
  text: row.text_en || '',
  translation: row.text_zh || '',
  seekOffset: Number.isFinite(Number(row.seek_offset)) ? Number(row.seek_offset) : 0,
  annotations: parseAnnotations(row),
});

const buildCacheHeaders = () => ({
  'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
});

export async function GET(request: NextRequest, { params }: { params: RouteParams }) {
  try {
    const videoId = await resolveVideoId(request, params);
    if (!videoId) {
      return NextResponse.json({ error: 'Video not found.' }, { status: 404 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const isTrial = isTrialUser(user);
    let videoQuery = supabase
      .from('videos')
      .select('id, is_trial')
      .eq('id', videoId)
      .eq('is_deleted', false);

    if (isTrial) {
      videoQuery = videoQuery.eq('is_trial', true);
    }

    const { data: video, error: videoError } = await videoQuery.single();
    if (videoError || !video) {
      return NextResponse.json({ error: 'Video not found.' }, { status: 404 });
    }

    const url = request.nextUrl;
    const limit = clamp(
      Math.floor(parseNumber(url.searchParams.get('limit'), DEFAULT_LIMIT) ?? DEFAULT_LIMIT),
      1,
      MAX_LIMIT
    );
    const back = clamp(
      Math.floor(parseNumber(url.searchParams.get('back'), DEFAULT_BACK) ?? DEFAULT_BACK),
      0,
      MAX_BACK
    );
    const after = parseNumber(url.searchParams.get('after'), null);
    const before = parseNumber(url.searchParams.get('before'), null);
    const around = parseNumber(url.searchParams.get('around'), null);

    const subtitlesTable = supabase.from('subtitles');

    if (around != null) {
      const afterBuilder = (fields: string) =>
        subtitlesTable
          .select(fields)
          .eq('video_id', videoId)
          .gte('start_time', around)
          .order('sequence', { ascending: true })
          .limit(limit + 1);

      const beforeBuilder = (fields: string) =>
        subtitlesTable
          .select(fields)
          .eq('video_id', videoId)
          .lt('start_time', around)
          .order('sequence', { ascending: false })
          .limit(back + 1);

      let [afterRes, beforeRes] = await Promise.all([
        fetchWithFallback((fields) => afterBuilder(fields)),
        fetchWithFallback((fields) => beforeBuilder(fields)),
      ]);

      if (afterRes.error || beforeRes.error) {
        return NextResponse.json({ error: 'Failed to load subtitles.' }, { status: 500 });
      }

      const afterRows = toRows(afterRes.data);
      const beforeRows = toRows(beforeRes.data);

      const hasMoreAfter = afterRows.length > limit;
      const hasMoreBefore = beforeRows.length > back;

      const trimmedAfter = afterRows.slice(0, limit);
      const trimmedBefore = beforeRows.slice(0, back).reverse();
      const combined = [...trimmedBefore, ...trimmedAfter].map(mapSubtitle);

      const response = NextResponse.json(
        {
          subtitles: combined,
          hasMoreAfter,
          hasMoreBefore,
        },
        { status: 200 }
      );
      response.headers.set('Cache-Control', buildCacheHeaders()['Cache-Control']);
      return response;
    }

    if (after != null || before != null) {
      if (after != null) {
        const { data, error } = await fetchWithFallback((fields) =>
          subtitlesTable
            .select(fields)
            .eq('video_id', videoId)
            .gt('sequence', after)
            .order('sequence', { ascending: true })
            .limit(limit + 1)
        );
        if (error) {
          return NextResponse.json({ error: 'Failed to load subtitles.' }, { status: 500 });
        }
        const rows = toRows(data);
        const hasMoreAfter = rows.length > limit;
        const trimmed = rows.slice(0, limit).map(mapSubtitle);
        const response = NextResponse.json(
          {
            subtitles: trimmed,
            hasMoreAfter,
          },
          { status: 200 }
        );
        response.headers.set('Cache-Control', buildCacheHeaders()['Cache-Control']);
        return response;
      }

      if (before != null) {
        const { data, error } = await fetchWithFallback((fields) =>
          subtitlesTable
            .select(fields)
            .eq('video_id', videoId)
            .lt('sequence', before)
            .order('sequence', { ascending: false })
            .limit(limit + 1)
        );
        if (error) {
          return NextResponse.json({ error: 'Failed to load subtitles.' }, { status: 500 });
        }
        const rows = toRows(data);
        const hasMoreBefore = rows.length > limit;
        const trimmed = rows.slice(0, limit).reverse().map(mapSubtitle);
        const response = NextResponse.json(
          {
            subtitles: trimmed,
            hasMoreBefore,
          },
          { status: 200 }
        );
        response.headers.set('Cache-Control', buildCacheHeaders()['Cache-Control']);
        return response;
      }
    }

    const { data, error } = await fetchWithFallback((fields) =>
      subtitlesTable
        .select(fields)
        .eq('video_id', videoId)
        .order('sequence', { ascending: true })
        .limit(limit + 1)
    );

    if (error) {
      return NextResponse.json({ error: 'Failed to load subtitles.' }, { status: 500 });
    }

    const rows = toRows(data);
    const hasMoreAfter = rows.length > limit;
    const trimmed = rows.slice(0, limit).map(mapSubtitle);
    const response = NextResponse.json(
      {
        subtitles: trimmed,
        hasMoreAfter,
        hasMoreBefore: false,
      },
      { status: 200 }
    );
    response.headers.set('Cache-Control', buildCacheHeaders()['Cache-Control']);
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load subtitles.' }, { status: 500 });
  }
}
