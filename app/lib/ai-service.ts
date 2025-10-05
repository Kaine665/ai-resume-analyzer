import { create } from "zustand";
import OpenRouterClient from "./openrouter";

// AI服务类型
type AIServiceType = "puter" | "openrouter";

interface AIServiceStore {
  serviceType: AIServiceType;
  openRouterClient: OpenRouterClient | null;

  // AI功能接口
  chat: (
    prompt: string | ChatMessage[],
    imageURL?: string | PuterChatOptions,
    testMode?: boolean,
    options?: PuterChatOptions
  ) => Promise<AIResponse | undefined>;

  feedback: (path: string, message: string) => Promise<AIResponse | undefined>;

  img2txt: (
    image: string | File | Blob,
    testMode?: boolean
  ) => Promise<string | undefined>;

  // 服务管理
  setServiceType: (type: AIServiceType) => void;
  initOpenRouter: (apiKey?: string) => void;
}

// 获取Puter实例
const getPuter = (): typeof window.puter | null =>
  typeof window !== "undefined" && window.puter ? window.puter : null;

export const useAIService = create<AIServiceStore>((set, get) => ({
  serviceType: "openrouter", // 默认使用OpenRouter
  openRouterClient: null,

  chat: async (
    prompt: string | ChatMessage[],
    imageURL?: string | PuterChatOptions,
    testMode?: boolean,
    options?: PuterChatOptions
  ) => {
    const { serviceType, openRouterClient } = get();

    if (serviceType === "openrouter" && openRouterClient) {
      return await openRouterClient.chat(prompt, imageURL, testMode, options);
    } else if (serviceType === "puter") {
      const puter = getPuter();
      if (puter) {
        return puter.ai.chat(prompt, imageURL, testMode, options) as Promise<
          AIResponse | undefined
        >;
      }
    }

    console.error("AI service not available");
    return undefined;
  },

  feedback: async (path: string, message: string) => {
    const { serviceType, openRouterClient } = get();

    if (serviceType === "openrouter" && openRouterClient) {
      // 对于OpenRouter，我们直接使用message作为完整的提示
      // path参数在OpenRouter中不会被使用
      return await openRouterClient.feedback(path, message);
    } else if (serviceType === "puter") {
      const puter = getPuter();
      if (puter) {
        return puter.ai.chat(
          [
            {
              role: "user",
              content: [
                {
                  type: "file",
                  puter_path: path,
                },
                {
                  type: "text",
                  text: message,
                },
              ],
            },
          ],
          { model: "claude-3-7-sonnet" }
        ) as Promise<AIResponse | undefined>;
      }
    }

    console.error("AI service not available");
    return undefined;
  },

  img2txt: async (image: string | File | Blob, testMode?: boolean) => {
    const { serviceType, openRouterClient } = get();

    if (serviceType === "openrouter" && openRouterClient) {
      return await openRouterClient.img2txt(image, testMode);
    } else if (serviceType === "puter") {
      const puter = getPuter();
      if (puter) {
        return puter.ai.img2txt(image, testMode);
      }
    }

    console.error("AI service not available");
    return undefined;
  },

  setServiceType: (type: AIServiceType) => {
    set({ serviceType: type });
  },

  initOpenRouter: (apiKey?: string) => {
    const client = new OpenRouterClient(apiKey);
    set({ openRouterClient: client });
  },
}));

// 初始化OpenRouter客户端
useAIService.getState().initOpenRouter();
