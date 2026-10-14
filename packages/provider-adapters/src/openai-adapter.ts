import OpenAI from "openai";

export interface OpenAIAdapterOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  timeoutMs?: number;
}

export class OpenAIAdapter {
  private client: OpenAI;
  public readonly model: string;

  constructor(options: OpenAIAdapterOptions = {}) {
    const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not defined in environment variables or adapter options."
      );
    }

    this.model = options.model || process.env.OPENAI_MODEL || "gpt-4o-mini";

    this.client = new OpenAI({
      apiKey,
      baseURL: options.baseURL || process.env.OPENAI_BASE_URL || undefined,
      timeout: options.timeoutMs ?? 30000,
    });
  }

  async chatCompletion(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;
    if (content === null || content === undefined) {
      throw new Error("OpenAI API returned empty response content.");
    }

    return content;
  }
}

/**
 * Functional helper for direct chatCompletion call.
 * Uses environment variables (OPENAI_API_KEY, optional OPENAI_MODEL).
 */
export async function chatCompletion(
  systemPrompt: string,
  userPrompt: string,
  options: OpenAIAdapterOptions = {}
): Promise<string> {
  const adapter = new OpenAIAdapter(options);
  return adapter.chatCompletion(systemPrompt, userPrompt);
}
