import OpenAI from "openai";

class OpenRouterClient {
  private client: OpenAI;
  private defaultModel: string = "anthropic/claude-3.7-sonnet";

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey || import.meta.env.VITE_OPENROUTER_API_KEY,
      dangerouslyAllowBrowser: true,
    });
  }

  async chat(
    prompt: string | ChatMessage[],
    imageURL?: string | PuterChatOptions,
    testMode?: boolean,
    options?: PuterChatOptions
  ): Promise<AIResponse | undefined> {
    try {
      let messages: OpenRouterMessage[];
      let chatOptions: OpenRouterChatOptions = {
        model: options?.model || this.defaultModel,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.max_tokens || 4000,
      };

      // 处理不同类型的输入
      if (typeof prompt === "string") {
        messages = [{ role: "user", content: prompt }];
      } else {
        messages = prompt.map((msg) => ({
          role: msg.role,
          content: this.processMessageContent(msg.content),
        }));
      }

      // 如果有图片URL，添加到最后一条用户消息中
      if (typeof imageURL === "string" && messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role === "user") {
          lastMessage.content = [
            {
              type: "text",
              text:
                typeof lastMessage.content === "string"
                  ? lastMessage.content
                  : "",
            },
            { type: "image_url", image_url: { url: imageURL } },
          ];
        }
      }

      const response = await this.client.chat.completions.create({
        model: chatOptions.model!,
        messages: messages as any,
        temperature: chatOptions.temperature,
        max_tokens: chatOptions.max_tokens,
      });

      // 转换为应用期望的格式
      return this.convertToAIResponse(response);
    } catch (error) {
      console.error("OpenRouter chat error:", error);
      return undefined;
    }
  }

  async feedback(
    path: string,
    message: string
  ): Promise<AIResponse | undefined> {
    try {
      // 由于OpenRouter不能直接访问文件，我们需要修改这个方法
      // 这里假设调用者会提供文件内容而不是路径
      const messages: OpenRouterMessage[] = [
        {
          role: "user",
          content: message,
        },
      ];

      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: messages as any,
        temperature: 0.7,
        max_tokens: 4000,
      });

      return this.convertToAIResponse(response);
    } catch (error) {
      console.error("OpenRouter feedback error:", error);
      return undefined;
    }
  }

  async img2txt(
    image: string | File | Blob,
    testMode?: boolean
  ): Promise<string | undefined> {
    try {
      let imageUrl: string;

      if (typeof image === "string") {
        imageUrl = image;
      } else {
        // 将File/Blob转换为base64 URL
        imageUrl = await this.convertToBase64(image);
      }

      const messages: OpenRouterMessage[] = [
        {
          role: "user",
          content: [
            { type: "text", text: "请提取这张图片中的所有文本内容。" },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ];

      const response = await this.client.chat.completions.create({
        model: "anthropic/claude-3.5-sonnet", // 使用支持视觉的模型
        messages: messages as any,
        temperature: 0.1,
        max_tokens: 2000,
      });

      return response.choices[0]?.message?.content || undefined;
    } catch (error) {
      console.error("OpenRouter img2txt error:", error);
      return undefined;
    }
  }

  private processMessageContent(
    content: string | ChatMessageContent[]
  ): string | Array<any> {
    if (typeof content === "string") {
      return content;
    }

    return content.map((item) => {
      if (item.type === "text") {
        return { type: "text", text: item.text };
      } else if (item.type === "file") {
        // 对于文件类型，我们需要特殊处理
        // 这里返回一个占位符，实际使用时需要读取文件内容
        return { type: "text", text: `[文件: ${item.puter_path}]` };
      }
      return item;
    });
  }

  private convertToAIResponse(response: any): AIResponse {
    const choice = response.choices[0];
    return {
      index: choice.index,
      message: {
        role: choice.message.role,
        content: choice.message.content || "",
        refusal: null,
        annotations: [],
      },
      logprobs: null,
      finish_reason: choice.finish_reason || "stop",
      usage: [
        {
          type: "tokens",
          model: response.model,
          amount: response.usage?.total_tokens || 0,
          cost: 0, // OpenRouter的成本计算需要单独实现
        },
      ],
      via_ai_chat_service: false,
    };
  }

  private async convertToBase64(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

export default OpenRouterClient;
