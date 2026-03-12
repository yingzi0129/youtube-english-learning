import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/permissions';
import { createClient } from '@/lib/supabase/server';

type BatchRequest = {
  subtitleIds: string[];
  model?: string;
};

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

function extractJsonObject(input: string) {
  // 尝试直接解析
  try {
    return JSON.parse(input);
  } catch {}

  // 查找JSON数组
  const arrayMatch = input.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {}
  }

  // 查找JSON对象
  const start = input.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(input.slice(start, i + 1));
        } catch {}
      }
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: BatchRequest;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { subtitleIds, model: requestModel } = body;
  if (!Array.isArray(subtitleIds) || subtitleIds.length === 0) {
    return new Response('Missing subtitleIds', { status: 400 });
  }

  const baseUrl = process.env.AI_API_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  if (!baseUrl || !apiKey) {
    return new Response('AI not configured', { status: 500 });
  }

  const model = requestModel || process.env.AI_MODEL || 'gpt-5.2';
  const url = buildChatCompletionsUrl(baseUrl);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'x-api-key': apiKey,
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const supabase = await createClient();

        // 获取字幕数据
        const { data: subtitles, error } = await supabase
          .from('subtitles')
          .select('id, text_en, sequence')
          .in('id', subtitleIds)
          .order('sequence', { ascending: true });

        if (error) throw error;
        if (!subtitles || subtitles.length === 0) {
          send({ type: 'error', message: '未找到字幕' });
          controller.close();
          return;
        }

        const total = subtitles.length;
        let processed = 0;
        let success = 0;
        let failed = 0;

        for (const subtitle of subtitles) {
          send({
            type: 'progress',
            current: processed + 1,
            total,
            subtitleId: subtitle.id,
            text: subtitle.text_en,
          });

          try {
            const result = await generateAnnotations(subtitle.text_en || '', model, url, headers);

            if (!result || result.length === 0) {
              throw new Error('AI未返回任何学习点');
            }

            // 保存到数据库
            await saveAnnotations(supabase, subtitle.id, result, subtitle.text_en || '');

            success++;
            send({
              type: 'success',
              subtitleId: subtitle.id,
              count: result.length,
            });
          } catch (err: any) {
            failed++;
            const errorMsg = err.message || '处理失败';
            console.error(`处理字幕 ${subtitle.id} 失败:`, errorMsg, err);
            send({
              type: 'failed',
              subtitleId: subtitle.id,
              error: errorMsg,
              details: err.stack || '',
            });
          }

          processed++;
        }

        send({
          type: 'complete',
          total,
          success,
          failed,
        });
      } catch (err: any) {
        send({ type: 'error', message: err.message || '处理失败' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

async function generateAnnotations(text: string, model: string, url: string, headers: Record<string, string>) {
  const systemPrompt = `You are an English learning assistant. Analyze the given sentence and extract the MOST VALUABLE learning points for English learners.

Extract 1-5 items (words or phrases) based on the sentence content. Prioritize:
1. Common but easily confused vocabulary
2. Idiomatic phrases and expressions
3. Words with special usage or collocations

IMPORTANT: Quality over quantity. For short or simple sentences, extract only 1-2 items. Do NOT force extraction of simple or obvious words just to meet a number.

For each item, provide:
- text: the word or phrase
- type: "word" or "phrase"
- phonetic: IPA notation in slashes
- meaning: Chinese translation with part-of-speech (e.g., "n. 控制", "phr. 有点讨厌", "v. 意识到")
- example_en: A short, natural English example sentence
- example_zh: Chinese translation of the example

Return ONLY a JSON array. Do not include markdown or extra text.`;

  const userPrompt = `Sentence: "${text}"

Extract the most valuable learning points (1-5 items). Focus on quality, not quantity.

Output format example:
[
  {"text":"controls","type":"word","phonetic":"/kənˈtroʊlz/","meaning":"v. 控制","example_en":"My phone often controls what I do.","example_zh":"我的手机经常控制我做什么。"},
  {"text":"kind of","type":"phrase","phonetic":"/kaɪnd əv/","meaning":"phr. 有点；有些","example_en":"I kind of like this movie.","example_zh":"我有点喜欢这部电影。"}
]

Return ONLY the JSON array, no other text.`;

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 800,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!resp.ok) {
    const errorText = await resp.text().catch(() => '');
    console.error('AI请求失败:', resp.status, errorText);
    throw new Error(`AI请求失败 (${resp.status})`);
  }

  const data = await resp.json();
  let content = data?.choices?.[0]?.message?.content || '';

  if (Array.isArray(content)) {
    content = content.map((p: any) => (typeof p === 'string' ? p : p?.text || '')).join('');
  }

  if (!content || typeof content !== 'string') {
    console.error('AI返回内容为空');
    throw new Error('AI返回内容为空');
  }

  console.log('AI原始返回:', content.slice(0, 500));

  const raw = stripCodeFences(content);
  const parsed = extractJsonObject(raw);

  if (!parsed) {
    console.error('无法提取JSON:', raw.slice(0, 500));
    throw new Error('AI返回的JSON无效');
  }

  if (!Array.isArray(parsed)) {
    console.error('AI返回不是数组:', parsed);
    throw new Error('AI返回格式错误：不是数组');
  }

  if (parsed.length === 0) {
    console.warn('AI返回空数组');
    return [];
  }

  console.log(`成功解析 ${parsed.length} 个学习点`);
  return parsed;
}

async function saveAnnotations(supabase: any, subtitleId: string, items: any[], contextText: string) {
  const resolved = [];

  for (const item of items) {
    const text = (item.text || '').trim();
    if (!text) {
      console.warn('跳过空文本项');
      continue;
    }

    const type = item.type === 'phrase' ? 'phrase' : 'word';
    const normalized_text = text.trim().replace(/\s+/g, ' ').toLowerCase();

    // 构建helper_sentence（英文 + 中文）
    const exampleEn = (item.example_en || '').trim();
    const exampleZh = (item.example_zh || '').trim();
    const helperSentence = exampleZh ? `${exampleEn} "${exampleZh}"` : exampleEn;

    const payload: any = {
      text,
      normalized_text,
      type,
      phonetic: (item.phonetic || '').trim(),
      meaning: (item.meaning || '').trim(),
      helper_sentence: helperSentence,
    };

    try {
      // 保存到vocabulary表
      const { data: vocab, error } = await supabase
        .from('vocabulary')
        .upsert(payload, { onConflict: 'normalized_text,type' })
        .select('id, text, type, phonetic, meaning, helper_sentence')
        .single();

      if (error) {
        console.error('保存vocabulary失败:', error);
        throw error;
      }

      // 查找text在原句中的位置
      const lowerContext = contextText.toLowerCase();
      const lowerText = text.toLowerCase();
      const start = lowerContext.indexOf(lowerText);
      const end = start >= 0 ? start + text.length : 0;

      resolved.push({
        id: vocab.id,
        vocabId: vocab.id,
        type: vocab.type,
        text,
        start: Math.max(0, start),
        end: Math.max(0, end),
        phonetic: vocab.phonetic || '',
        meaning: vocab.meaning || '',
        helperSentence: vocab.helper_sentence || '',
      });
    } catch (err) {
      console.error(`保存词汇 "${text}" 失败:`, err);
      throw err;
    }
  }

  if (resolved.length === 0) {
    console.warn('没有有效的学习点可保存');
    return;
  }

  // 更新subtitles表的annotations字段
  const { error: updateError } = await supabase
    .from('subtitles')
    .update({ annotations: resolved })
    .eq('id', subtitleId);

  if (updateError) {
    console.error('更新subtitles失败:', updateError);
    throw updateError;
  }

  console.log(`成功保存 ${resolved.length} 个学习点到字幕 ${subtitleId}`);
}
