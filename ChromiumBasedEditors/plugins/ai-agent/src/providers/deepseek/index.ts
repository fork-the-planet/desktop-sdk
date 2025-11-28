import type { Model } from "@/lib/types";
import type { TData } from "../base";
import { OpenAIProvider } from "../openai";
import { deepseekInfo } from "./info";

/**
 * DeepSeek provider - extends OpenAI since DeepSeek API is OpenAI-compatible.
 */
class DeepSeekProvider extends OpenAIProvider {
  getName = (): string => deepseekInfo.name;

  getBaseUrl = (): string => deepseekInfo.baseUrl;

  getProviderModels = async (data: TData): Promise<Model[]> => {
    const client = this.createClient(
      data.apiKey,
      data.url || deepseekInfo.baseUrl
    );
    const response = (await client.models.list()).data;

    // Empty filter = show all models
    const models =
      deepseekInfo.modelFilters.length > 0
        ? response.filter((model) =>
            deepseekInfo.modelFilters.includes(model.id)
          )
        : response;

    return models
      .map((model) => ({
        id: model.id,
        name: deepseekInfo.modelNames[model.id] || model.id,
        provider: "deepseek" as const,
      }))
      .reverse();
  };
}

const deepseekProvider = new DeepSeekProvider();

export { DeepSeekProvider, deepseekProvider };
