import type { ThreadMessageLike } from "@assistant-ui/react";
import { LMStudioClient } from "@lmstudio/sdk";
import cloneDeep from "lodash.clonedeep";
import type { Model, TMCPItem, TProvider } from "@/lib/types";
import { AbstractBaseProvider, type TData, type TErrorData } from "../base";
import { ProviderErrors } from "../errors";
import { CREATE_TITLE_SYSTEM_PROMPT } from "../prompts";
import { handleToolCall, type ToolCallResult } from "./handlers";
import { lmStudioInfo } from "./info";
import {
  convertMessagesToModelFormat,
  convertToolsToString,
  type LMStudioMessage,
} from "./utils";

// ============================================================================
// Helper Types
// ============================================================================

type ContentPart = { type: "text"; text: string } | { type: "tool-call" };

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Updates response message content based on tool call parsing result.
 * Handles text content and tool call transitions during streaming.
 */
const updateMessageContent = (
  content: ContentPart[],
  result: ToolCallResult
): void => {
  const { content: textContent, toolContent } = result;
  const lastPart = content[content.length - 1];
  const lastIsToolCall = lastPart?.type === "tool-call";

  // Empty content - add first text part
  if (content.length === 0) {
    content.push({ type: "text", text: textContent });
    return;
  }

  // Has tool content
  if (toolContent) {
    if (lastIsToolCall) {
      // Update existing tool call
      content[content.length - 1] = toolContent;
    } else {
      // Update text, then add tool call
      content[content.length - 1] = { type: "text", text: textContent };
      content.push(toolContent);
    }
    return;
  }

  // Text only - update or add text part
  if (lastIsToolCall) {
    content.push({ type: "text", text: textContent });
  } else {
    content[content.length - 1] = { type: "text", text: textContent };
  }
};

/**
 * Creates an error response message for failed requests.
 */
const createErrorResponse = (
  error: unknown
): { isEnd: true; responseMessage: ThreadMessageLike } => ({
  isEnd: true,
  responseMessage: {
    role: "assistant",
    content: "",
    status: {
      type: "incomplete",
      reason: "error",
      error,
    },
  } as ThreadMessageLike,
});

// ============================================================================
// LM Studio Provider
// ============================================================================

class LMStudioProvider extends AbstractBaseProvider<
  TMCPItem,
  LMStudioMessage,
  LMStudioClient
> {
  // ============================================================================
  // Setup Methods
  // ============================================================================

  setProvider = (provider: TProvider): void => {
    this.provider = provider;
    this.client = new LMStudioClient();
  };

  setPrevMessages = (prevMessages: ThreadMessageLike[]): void => {
    this.prevMessages = convertMessagesToModelFormat(prevMessages);
  };

  setTools = (tools: TMCPItem[]): void => {
    this.tools = tools;
  };

  // ============================================================================
  // Chat Name
  // ============================================================================

  async createChatName(message: string): Promise<string> {
    try {
      if (!this.client || !this.modelKey) return "";

      const model = await this.client.llm.model(this.modelKey);
      const result = await model.respond(
        `${CREATE_TITLE_SYSTEM_PROMPT}\n${message}`
      );

      const title = result.content;

      return title ?? message.substring(0, 25);
    } catch {
      return "";
    }
  }

  // ============================================================================
  // Message Streaming
  // ============================================================================

  async *sendMessage(
    messages: ThreadMessageLike[],
    afterToolCall?: boolean,
    message?: ThreadMessageLike
  ): AsyncGenerator<
    ThreadMessageLike | { isEnd: true; responseMessage: ThreadMessageLike }
  > {
    try {
      if (!this.client) return;

      if (!this.modelKey) {
        yield createErrorResponse(new Error("No model selected"));
        return;
      }

      const model = await this.client.llm.model(this.modelKey);
      const convertedMessages = convertMessagesToModelFormat(messages);

      // Build tools string for system prompt
      const toolsString = convertToolsToString(this.tools);

      // Create system message with tools
      const systemMsg: LMStudioMessage = {
        role: "system",
        content: this.systemPrompt + toolsString,
      };

      // Stream response from model
      const prediction = model.respond([
        systemMsg,
        ...this.prevMessages,
        ...convertedMessages,
      ]);

      this.prevMessages.push(...convertedMessages);

      const responseMessage: ThreadMessageLike =
        afterToolCall && message
          ? cloneDeep(message)
          : {
              role: "assistant",
              content: [],
            };

      let msg = "";

      for await (const fragment of prediction) {
        msg += fragment.content;

        const result = handleToolCall(msg);

        if (Array.isArray(responseMessage.content)) {
          updateMessageContent(
            responseMessage.content as ContentPart[],
            result
          );
        }

        if (this.stopFlag) {
          this.stopFlag = false;

          this.prevMessages.push({
            role: "assistant",
            content: msg,
          });

          yield { isEnd: true, responseMessage };
          return;
        }

        yield responseMessage;
      }

      // Add to history after completion
      this.prevMessages.push({
        role: "assistant",
        content: msg,
      });

      yield {
        isEnd: true,
        responseMessage,
      };
    } catch (e) {
      yield createErrorResponse(e);
    }
  }

  async *sendMessageAfterToolCall(
    message: ThreadMessageLike
  ): AsyncGenerator<
    ThreadMessageLike | { isEnd: true; responseMessage: ThreadMessageLike }
  > {
    if (typeof message.content === "string") return message;

    const result = message.content
      .filter((c) => c.type === "tool-call")
      .reverse()[0];

    if (!result) return message;

    const toolResultStr: string = JSON.stringify({
      name: result.toolName,
      result: result.result,
    });

    this.prevMessages.push({
      role: "user",
      content: toolResultStr,
    });

    yield* this.sendMessage([], true, message);

    return message;
  }

  // ============================================================================
  // Provider Info
  // ============================================================================

  getName = (): string => lmStudioInfo.name;

  getBaseUrl = (): string => lmStudioInfo.baseUrl;

  // ============================================================================
  // Provider Validation & Models
  // ============================================================================

  checkProvider = async (_data: TData): Promise<boolean | TErrorData> => {
    try {
      const testClient = new LMStudioClient();

      // Try to list loaded models to verify connection
      const models = await testClient.llm.listLoaded();

      if (!models || models.length === 0) {
        return ProviderErrors.invalidUrl("No models loaded in LM Studio");
      }

      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to connect to LM Studio";
      return ProviderErrors.invalidUrl(message);
    }
  };

  getProviderModels = async (_data: TData): Promise<Model[]> => {
    try {
      const testClient = new LMStudioClient();

      const models = await testClient.llm.listLoaded();

      return models.map((model) => ({
        id: model.path,
        name: model.displayName || model.path,
        provider: "lm-studio",
      }));
    } catch {
      return [];
    }
  };
}

const lmStudioProvider = new LMStudioProvider();

export { LMStudioProvider, lmStudioProvider };
