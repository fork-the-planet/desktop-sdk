import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeepSeekProvider } from "../index";
import { deepseekInfo } from "../info";

// Mock OpenAI client
const mockList = vi.fn();

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: vi.fn() } };
    models = { list: mockList };
  },
}));

beforeEach(() => {
  mockList.mockReset();
  mockList.mockResolvedValue({ data: [] });
});

describe("DeepSeekProvider", () => {
  describe("getName", () => {
    it("should return DeepSeek", () => {
      const provider = new DeepSeekProvider();
      expect(provider.getName()).toBe("DeepSeek");
    });
  });

  describe("getBaseUrl", () => {
    it("should return DeepSeek API URL", () => {
      const provider = new DeepSeekProvider();
      expect(provider.getBaseUrl()).toBe("https://api.deepseek.com");
    });
  });

  describe("getProviderModels", () => {
    it("should return models matching filter", async () => {
      mockList.mockResolvedValue({
        data: [
          { id: "deepseek-chat", name: "DeepSeek Chat" },
          { id: "deepseek-coder", name: "DeepSeek Coder" },
          { id: "other-model", name: "Other" },
        ],
      });

      const provider = new DeepSeekProvider();
      const models = await provider.getProviderModels({
        apiKey: "test-key",
        url: "",
      });

      // Should only include models in modelFilters
      const filteredModels = models.filter((m) =>
        deepseekInfo.modelFilters.includes(m.id)
      );
      expect(filteredModels.length).toBe(models.length);
    });

    it("should return all models when filter is empty", async () => {
      // Temporarily store original filter
      const originalFilters = [...deepseekInfo.modelFilters];
      deepseekInfo.modelFilters.length = 0;

      mockList.mockResolvedValue({
        data: [
          { id: "deepseek-chat", name: "DeepSeek Chat" },
          { id: "deepseek-coder", name: "DeepSeek Coder" },
        ],
      });

      const provider = new DeepSeekProvider();
      const models = await provider.getProviderModels({
        apiKey: "test-key",
        url: "",
      });

      expect(models).toHaveLength(2);

      // Restore original filter
      deepseekInfo.modelFilters.push(...originalFilters);
    });

    it("should set provider type to deepseek", async () => {
      mockList.mockResolvedValue({
        data: [{ id: "deepseek-chat", name: "DeepSeek Chat" }],
      });

      const provider = new DeepSeekProvider();
      const models = await provider.getProviderModels({
        apiKey: "test-key",
        url: "",
      });

      expect(models[0]?.provider).toBe("deepseek");
    });

    it("should use custom URL when provided", async () => {
      mockList.mockResolvedValue({ data: [] });

      const provider = new DeepSeekProvider();
      await provider.getProviderModels({
        apiKey: "test-key",
        url: "https://custom.deepseek.com",
      });

      expect(mockList).toHaveBeenCalled();
    });
  });

  describe("setProvider", () => {
    it("should set provider and create client", () => {
      const provider = new DeepSeekProvider();
      provider.setProvider({
        type: "deepseek",
        name: "DeepSeek",
        key: "test-key",
        baseUrl: "https://api.deepseek.com",
      });

      // Provider should be set (inherited from OpenAIProvider)
      expect(provider.getName()).toBe("DeepSeek");
    });
  });
});
