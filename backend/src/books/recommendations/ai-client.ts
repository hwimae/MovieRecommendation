export type AdvisorContext = {
  storyId: string;
  title: string;
  authors: string;
  category: string;
  reason: string;
  content: string;
  score: number;
};

export type GenerateAdvisorAnswerInput = {
  query: string;
  contexts: AdvisorContext[];
};

export type AiClient = {
  embedText(text: string): Promise<number[]>;
  generateAdvisorAnswer(input: GenerateAdvisorAnswerInput): Promise<string>;
};

export function createAiClient(baseUrl: string): AiClient {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');

  return {
    async embedText(text) {
      const json = await postJson(`${normalizedBaseUrl}/embed`, { text });
      if (
        !isRecord(json) ||
        !Array.isArray(json.embedding) ||
        !json.embedding.every(
          (value) => typeof value === 'number' && Number.isFinite(value),
        )
      ) {
        throw new Error('Invalid AI embedding response');
      }
      return json.embedding;
    },

    async generateAdvisorAnswer(input) {
      const json = await postJson(`${normalizedBaseUrl}/answer`, input);
      if (
        !isRecord(json) ||
        typeof json.answer !== 'string' ||
        json.answer.trim().length === 0
      ) {
        throw new Error('Invalid AI answer response');
      }
      return json.answer.trim();
    },
  };
}

async function postJson(url: string, body: unknown): Promise<unknown> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`AI service request failed with status ${response.status}`);
  }

  return response.json() as Promise<unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
