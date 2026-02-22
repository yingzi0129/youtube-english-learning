import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/permissions';

type AiVocabRequest = {
  text: string;
  type?: 'word' | 'phrase';
  context?: string; // full sentence (optional)
  model?: string;
};

type AiVocabResult = {
  phonetic: string;
  meaning: string;
  helperSentence: string;
};

function buildChatCompletionsUrl(base: string) {
  const b = base.replace(/\/+$/, '');
  // Accept either ".../v1" or origin-only; default to OpenAI-compatible path.
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
  const start = input.indexOf('{');
  if (start < 0) return '';
  let depth = 0;
  for (let i = start; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return input.slice(start, i + 1);
    }
  }
  return '';
}

function parseAiResponse(data: any): { result?: AiVocabResult; error?: 'empty' | 'invalid'; raw?: string } {
  let content =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.text ??
    data?.output_text ??
    data?.content;

  if (Array.isArray(content)) {
    content = content
      .map((part: any) => (typeof part === 'string' ? part : part?.text || ''))
      .join('');
  }

  if (typeof content !== 'string' || !content.trim()) {
    return { error: 'empty', raw: '' };
  }

  const raw = stripCodeFences(content);
  const jsonText = extractJsonObject(raw) || raw;
  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { error: 'invalid', raw };
  }

  return {
    result: {
      phonetic: typeof parsed?.phonetic === 'string' ? parsed.phonetic.trim() : '',
      meaning: typeof parsed?.meaning === 'string' ? parsed.meaning.trim() : '',
      helperSentence:
        typeof parsed?.helperSentence === 'string' ? parsed.helperSentence.trim() : '',
    },
    raw,
  };
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: AiVocabRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const text = (body.text || '').trim();
  const type = body.type === 'phrase' ? 'phrase' : 'word';
  const context = (body.context || '').trim();
  const model = (body.model || process.env.AI_MODEL || 'gpt-5.2').trim();

  if (!text) {
    return NextResponse.json({ error: 'Missing text' }, { status: 400 });
  }

  const baseUrl = process.env.AI_API_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  if (!baseUrl || !apiKey) {
    return NextResponse.json(
      { error: 'AI not configured. Please set AI_API_BASE_URL and AI_API_KEY on the server.' },
      { status: 500 }
    );
  }

  const url = buildChatCompletionsUrl(baseUrl);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'x-api-key': apiKey,
  };
  const baseSystemLines = [
    'You generate a SHORT vocabulary card for English learners.',
    'Return ONLY a JSON object with keys: phonetic, meaning, helperSentence.',
    'phonetic: IPA in slashes, e.g. "/.../". Provide a best-guess IPA.',
    'meaning: short Chinese explanation WITH part-of-speech prefix like "phr." or "n." or "v.".',
    'helperSentence: short English paraphrase or synonym (<= 8 words).',
    'Do NOT add markdown or extra text.',
  ];
  const system = baseSystemLines.join('\n');
  const systemStrict = [
    ...baseSystemLines,
    'Never leave any field empty. Always provide a best-guess for every field.',
    'If context is provided, use it to infer meaning and helperSentence.',
  ].join('\n');

  const userPrompt = [
    `Target: ${JSON.stringify({ text, type })}`,
    context ? `Context sentence: ${context}` : '',
    '',
    'Output JSON example:',
    '{"phonetic":"/.../","meaning":"n. <Chinese meaning>","helperSentence":"short paraphrase"}',
    'Do not include any other text.',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const requestOnce = async (systemPrompt: string) => {
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 250,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        const err: any = new Error(`AI request failed (${resp.status})`);
        err.detail = text.slice(0, 1000);
        throw err;
      }

      const data = (await resp.json()) as any;
      const parsed = parseAiResponse(data);
      if (parsed.error === 'empty') {
        throw new Error('AI returned empty content');
      }
      if (!parsed.result) {
        const err: any = new Error('AI output is not valid JSON');
        err.raw = parsed.raw || '';
        throw err;
      }
      return parsed.result;
    };

    let result = await requestOnce(system);
    if (!result.phonetic || !result.meaning || !result.helperSentence) {
      const retry = await requestOnce(systemStrict);
      result = {
        phonetic: retry.phonetic || result.phonetic,
        meaning: retry.meaning || result.meaning,
        helperSentence: retry.helperSentence || result.helperSentence,
      };
    }

    return NextResponse.json(result);
  } catch (err: any) {
    if (err?.message?.startsWith('AI request failed')) {
      return NextResponse.json(
        { error: err.message, detail: err.detail || '' },
        { status: 502 }
      );
    }
    if (err?.message === 'AI output is not valid JSON') {
      return NextResponse.json(
        { error: 'AI output is not valid JSON', raw: err.raw || '' },
        { status: 502 }
      );
    }
    if (err?.message === 'AI returned empty content') {
      return NextResponse.json({ error: 'AI returned empty content' }, { status: 502 });
    }
    return NextResponse.json(
      { error: 'AI request error', detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
