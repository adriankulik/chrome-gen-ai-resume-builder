/**
 * Robustly parses JSON from LLM output, handling markdown code fences (```json ... ```)
 * and introductory/trailing conversational text.
 */
export function extractJson<T>(raw: string): T {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Empty or non-string response from model');
  }

  const trimmed = raw.trim();

  // 1. Direct parse attempt
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // Continue to markdown / slice parsing
  }

  // 2. Strip markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim()) as T;
    } catch {
      // Continue to bracket slice
    }
  }

  // 3. Find outermost JSON object or array: { ... } or [ ... ]
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');

  // Determine whether object or array appears first
  const hasObject = firstBrace !== -1 && lastBrace > firstBrace;
  const hasArray = firstBracket !== -1 && lastBracket > firstBracket;

  if (hasObject && (!hasArray || firstBrace < firstBracket)) {
    const candidate = trimmed.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // Fall through to error
    }
  } else if (hasArray) {
    const candidate = trimmed.substring(firstBracket, lastBracket + 1);
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // Fall through to error
    }
  }

  throw new Error(`Failed to parse valid JSON from model response: "${trimmed.slice(0, 100)}..."`);
}
