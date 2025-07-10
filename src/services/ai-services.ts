interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface AIServiceConfig {
  apiKey: string;
  model?: string;
}

// OpenAI API response types
interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Gemini API response types
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export class OpenAIService {
  private apiKey: string;
  private model: string;
  private baseUrl: string = "https://api.openai.com/v1";

  constructor(config: AIServiceConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || "gpt-3.5-turbo";
  }

  async generateResponse(
    prompt: string,
    systemPrompt?: string
  ): Promise<AIResponse> {
    try {
      const messages = [];

      if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
      }

      messages.push({ role: "user", content: prompt });

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as OpenAIResponse;

      return {
        content: data.choices[0].message.content,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
      };
    } catch (error) {
      console.error("OpenAI Service Error:", error);
      throw new Error(
        `Failed to generate response: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async summarizeCommits(commits: string[]): Promise<string> {
    const prompt = `Please summarize the following git commits into a concise daily standup update:

${commits.join("\n")}

Format the summary as a brief, professional update suitable for a team standup meeting.`;

    const systemPrompt =
      "You are an expert at summarizing software development progress for daily standup meetings. Create concise, clear summaries that highlight key accomplishments and changes.";

    const response = await this.generateResponse(prompt, systemPrompt);
    return response.content;
  }
}

export class GeminiService {
  private apiKey: string;
  private model: string;
  private baseUrl: string = "https://generativelanguage.googleapis.com/v1beta";

  constructor(config: AIServiceConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || "gemini-pro";
  }

  async generateResponse(
    prompt: string,
    systemPrompt?: string
  ): Promise<AIResponse> {
    try {
      let fullPrompt = prompt;

      if (systemPrompt) {
        fullPrompt = `${systemPrompt}\n\n${prompt}`;
      }

      const response = await fetch(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: fullPrompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Gemini API error: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as GeminiResponse;

      if (
        !data.candidates ||
        !data.candidates[0] ||
        !data.candidates[0].content
      ) {
        throw new Error("Invalid response format from Gemini API");
      }

      return {
        content: data.candidates[0].content.parts[0].text,
        usage: {
          promptTokens: data.usageMetadata?.promptTokenCount || 0,
          completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata?.totalTokenCount || 0,
        },
      };
    } catch (error) {
      console.error("Gemini Service Error:", error);
      throw new Error(
        `Failed to generate response: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async summarizeCommits(commits: string[]): Promise<string> {
    const prompt = `Please summarize the following git commits into a concise daily standup update:

${commits.join("\n")}

Format the summary as a brief, professional update suitable for a team standup meeting.`;

    const systemPrompt =
      "You are an expert at summarizing software development progress for daily standup meetings. Create concise, clear summaries that highlight key accomplishments and changes.";

    const response = await this.generateResponse(prompt, systemPrompt);
    return response.content;
  }
}

// Factory function to create AI service based on provider
export function createAIService(
  provider: "openai" | "gemini",
  config: AIServiceConfig
) {
  switch (provider) {
    case "openai":
      return new OpenAIService(config);
    case "gemini":
      return new GeminiService(config);
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}
