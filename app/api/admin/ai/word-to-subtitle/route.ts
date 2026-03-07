import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/permissions';
import mammoth from 'mammoth';

function buildChatCompletionsUrl(base: string) {
  const b = base.replace(/\/+$/, '');
  if (b.endsWith('/v1')) return `${b}/chat/completions`;
  return `${b}/v1/chat/completions`;
}

function stripCodeFences(s: string) {
  const t = s.trim();
  if (t.startsWith('```')) {
    return t.replace(/^```[a-zA-Z]*\s*/m, '').replace(/```$/m, '').trim();
  }
  return t;
}

// 将 "m:ss" 或 "mm:ss" 字符串转为秒数，也兼容纯数字
function parseTime(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  const s = String(val).trim();
  if (s.includes(':')) {
    const parts = s.split(':');
    const minutes = parseInt(parts[0], 10) || 0;
    const seconds = parseInt(parts[1], 10) || 0;
    return minutes * 60 + seconds;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// 兼容 AI 可能返回的各种字段名，统一映射到标准格式
function normalizeItem(item: any, index: number): any {
  const startTime = parseTime(item.start_time ?? item.startTime ?? item.start);
  const endTime = parseTime(item.end_time ?? item.endTime ?? item.end);
  const textEn = (item.text_en ?? item.textEn ?? item.en ?? item.english ?? '').toString().trim();
  const textZh = (item.text_zh ?? item.textZh ?? item.zh ?? item.chinese ?? '').toString().trim();
  const sequence = Number(item.sequence ?? index + 1);

  return {
    sequence,
    start_time: startTime,
    end_time: endTime,
    text_en: textEn,
    text_zh: textZh,
  };
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const model = ((formData.get('model') as string) || process.env.AI_MODEL || 'gpt-5.2').trim();

  if (!file) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let rawText: string;
  try {
    const result = await mammoth.extractRawText({ buffer });
    rawText = result.value.trim();
  } catch (err: any) {
    return NextResponse.json({ error: 'Word 文件解析失败: ' + err.message }, { status: 400 });
  }

  if (!rawText) {
    return NextResponse.json({ error: 'Word 文档内容为空' }, { status: 400 });
  }

  // DEBUG: 临时返回提取的原始文本，用于排查问题
  if (formData.get('debug') === '1') {
    return NextResponse.json({ debug: true, rawText, length: rawText.length });
  }

  const baseUrl = process.env.AI_API_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  if (!baseUrl || !apiKey) {
    return NextResponse.json(
      { error: 'AI not configured. Please set AI_API_BASE_URL and AI_API_KEY.' },
      { status: 500 }
    );
  }

  const url = buildChatCompletionsUrl(baseUrl);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'x-api-key': apiKey,
  };

  const systemPrompt = `You are a subtitle format converter.

INPUT: Raw text from a Word document. Each subtitle block has 3 lines:
1. Timestamp like "0:00" or "1:23"
2. English sentence
3. Chinese sentence
Blocks are separated by blank lines or dividers.

OUTPUT: A JSON array ONLY. No markdown. No explanation. No extra fields.

EXACT output format — use ONLY these field names:
[
  {
    "sequence": 1,
    "start_time": 0,
    "end_time": 3,
    "text_en": "English sentence here",
    "text_zh": "中文句子"
  },
  {
    "sequence": 2,
    "start_time": 3,
    "end_time": 7,
    "text_en": "Next English sentence",
    "text_zh": "下一句中文"
  }
]

Rules:
- sequence: integer starting from 1
- start_time: convert timestamp to seconds (e.g. "0:03" = 3, "1:23" = 83)
- end_time: use the NEXT item's start_time; for the last item add 5
- text_en: the English line (string)
- text_zh: the Chinese line (string)
- Skip title lines that are not timestamps/English/Chinese
- Output ONLY the JSON array, nothing else`;

  const userPrompt = `Convert to JSON array:\n\n${rawText}`;

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 8000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      return NextResponse.json(
        { error: `AI request failed (${resp.status})`, detail: errText.slice(0, 500) },
        { status: 502 }
      );
    }

    const data = await resp.json();
    let content =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.text ??
      '';

    if (!content.trim()) {
      return NextResponse.json({ error: 'AI returned empty content' }, { status: 502 });
    }

    content = stripCodeFences(content);

    const start = content.indexOf('[');
    const end = content.lastIndexOf(']');
    if (start < 0 || end < 0) {
      return NextResponse.json({ error: 'AI did not return a JSON array', raw: content.slice(0, 500) }, { status: 502 });
    }

    const jsonText = content.slice(start, end + 1);
    let rawItems: any[];
    try {
      rawItems = JSON.parse(jsonText);
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI JSON output', raw: jsonText.slice(0, 500) }, { status: 502 });
    }

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ error: 'AI returned empty subtitle array' }, { status: 502 });
    }

    const subtitles = rawItems.map((item, i) => normalizeItem(item, i));

    return NextResponse.json({ subtitles });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'AI request error', detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
