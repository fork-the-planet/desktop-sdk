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

// Mock window.AscSimpleRequest for DeepSeek provider
const mockCreateRequest = vi.fn();

beforeEach(() => {
  mockList.mockReset();
  mockList.mockResolvedValue({ data: [] });
  mockCreateRequest.mockReset();

  // Setup window.AscSimpleRequest mock
  (globalThis as unknown as { window: unknown }).window = {
    AscSimpleRequest: {
      createRequest: mockCreateRequest,
    },
  };
});

// TODO: Re-enable when DeepSeek provider is enabled in the app
describe.skip("DeepSeekProvider", () => {
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
      mockCreateRequest.mockImplementation(
        (opts: { complete: (e: { responseText: string }) => void }) => {
          opts.complete({
            responseText: JSON.stringify({
              data: [
                { id: "deepseek-chat", name: "DeepSeek Chat" },
                { id: "deepseek-coder", name: "DeepSeek Coder" },
                { id: "other-model", name: "Other" },
              ],
            }),
          });
        }
      );

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

      mockCreateRequest.mockImplementation(
        (opts: { complete: (e: { responseText: string }) => void }) => {
          opts.complete({
            responseText: JSON.stringify({
              data: [
                { id: "deepseek-chat", name: "DeepSeek Chat" },
                { id: "deepseek-coder", name: "DeepSeek Coder" },
              ],
            }),
          });
        }
      );

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
      mockCreateRequest.mockImplementation(
        (opts: { complete: (e: { responseText: string }) => void }) => {
          opts.complete({
            responseText: JSON.stringify({
              data: [{ id: "deepseek-chat", name: "DeepSeek Chat" }],
            }),
          });
        }
      );

      const provider = new DeepSeekProvider();
      const models = await provider.getProviderModels({
        apiKey: "test-key",
        url: "",
      });

      expect(models[0]?.provider).toBe("deepseek");
    });

    it("should use custom URL when provided", async () => {
      mockCreateRequest.mockImplementation(
        (opts: {
          url: string;
          complete: (e: { responseText: string }) => void;
        }) => {
          opts.complete({
            responseText: JSON.stringify({ data: [] }),
          });
        }
      );

      const provider = new DeepSeekProvider();
      await provider.getProviderModels({
        apiKey: "test-key",
        url: "https://custom.deepseek.com",
      });

      expect(mockCreateRequest).toHaveBeenCalled();
      expect(mockCreateRequest.mock.calls[0][0].url).toBe(
        "https://custom.deepseek.com/models"
      );
    });
  });

  // describe("setProvider", () => {
  //   it("should set provider and create client", () => {
  //     const provider = new DeepSeekProvider();
  //     provider.setProvider({
  //       type: "deepseek",
  //       name: "DeepSeek",
  //       key: "test-key",
  //       baseUrl: "https://api.deepseek.com",
  //     });

  //     // Provider should be set (inherited from OpenAIProvider)
  //     expect(provider.getName()).toBe("DeepSeek");
  //   });
  // });
});
