import { extractJson } from './json-extractor';

describe('extractJson', () => {
  it('parses valid clean JSON object', () => {
    const raw = '{"key": "value", "count": 42}';
    const result = extractJson<{ key: string; count: number }>(raw);
    expect(result).toEqual({ key: 'value', count: 42 });
  });

  it('parses valid clean JSON array', () => {
    const raw = '["one", "two", "three"]';
    const result = extractJson<string[]>(raw);
    expect(result).toEqual(['one', 'two', 'three']);
  });

  it('strips markdown ```json ... ``` fences', () => {
    const raw = '```json\n{\n  "selectedBulletIds": ["b_1", "b_2"]\n}\n```';
    const result = extractJson<{ selectedBulletIds: string[] }>(raw);
    expect(result.selectedBulletIds).toEqual(['b_1', 'b_2']);
  });

  it('strips markdown ``` ... ``` fences without json tag', () => {
    const raw = '```\n{"status": "ok"}\n```';
    const result = extractJson<{ status: string }>(raw);
    expect(result.status).toBe('ok');
  });

  it('extracts JSON surrounded by conversational text and explanations', () => {
    const raw =
      'Here is the analysis you requested:\n\n' +
      '{\n  "summary": "Experienced engineer",\n  "skills": ["Angular", "AI"]\n}\n\n' +
      'Let me know if you need any adjustments!';
    const result = extractJson<{ summary: string; skills: string[] }>(raw);
    expect(result.summary).toBe('Experienced engineer');
    expect(result.skills).toEqual(['Angular', 'AI']);
  });

  it('extracts JSON array surrounded by preamble', () => {
    const raw = 'I found the following matching items:\n["apple", "banana"]\nHope this helps!';
    const result = extractJson<string[]>(raw);
    expect(result).toEqual(['apple', 'banana']);
  });

  it('throws an error for non-JSON strings', () => {
    expect(() => extractJson('This is completely plain text with no json at all.')).toThrowError(
      /Failed to parse valid JSON/,
    );
  });

  it('throws an error for empty or non-string inputs', () => {
    expect(() => extractJson('')).toThrowError(/Empty or non-string/);
    expect(() => extractJson(null as unknown as string)).toThrowError(/Empty or non-string/);
  });
});
