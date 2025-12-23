import type { ThreadMessageLike } from "@assistant-ui/react";
import type { TMCPItem } from "@/lib/types";

// ============================================================================
// Constants
// ============================================================================

export const START_TOOL_TAG = "<TOOL_CALL>";
export const END_TOOL_TAG = "</TOOL_CALL>";

// ============================================================================
// Types
// ============================================================================

export type LMStudioMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

// ============================================================================
// Tool Conversion
// ============================================================================

/**
 * Builds the tool usage instructions string for the system prompt
 */
export const convertToolsToString = (tools: TMCPItem[]): string => {
  if (tools.length === 0) return "";

  const toolsJson = JSON.stringify(
    tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    }))
  );

  const exampleJson = JSON.stringify({
    name: "toolName",
    args: { arg1: "arg1", arg2: "arg2" },
  });

  return [
    "\n\nAvailable tools:\n\n",
    toolsJson,
    "\n\n When you call a tool, output must look EXACTLY like this: \n",
    `${START_TOOL_TAG}\n${exampleJson}\n${END_TOOL_TAG}`,
    "\n\n Do not add explanations, markdown, or extra text outside the tags.",
  ].join("");
};

// ============================================================================
// Message Content Helpers
// ============================================================================

/**
 * Converts a single content part to a string
 */
export const convertContentPartToString = (
  part: Exclude<ThreadMessageLike["content"], string>[number]
): string => {
  if (part.type === "text") {
    return part.text;
  }

  if (part.type === "file") {
    const path = JSON.parse(part.mimeType).path;
    return `File: ${path}\nFile content:\n${part.data}`;
  }

  if (part.type === "image") {
    return `[Image: ${part.image}]`;
  }

  return "";
};

// ============================================================================
// Message Type Converters
// ============================================================================

/**
 * Converts a user message to LMStudio format
 */
export const convertUserMessage = (
  message: ThreadMessageLike
): LMStudioMessage => {
  const content =
    typeof message.content === "string"
      ? message.content
      : message.content
          .map(convertContentPartToString)
          .filter((part) => part !== "")
          .join("\n\n");

  return { role: "user", content };
};

/**
 * Converts a system message to LMStudio format
 */
export const convertSystemMessage = (
  message: ThreadMessageLike
): LMStudioMessage => {
  const content =
    typeof message.content === "string"
      ? message.content
      : (message.content.find((part) => part.type === "text")?.text ?? "");

  return { role: "system", content };
};

/**
 * Result of converting an assistant message
 */
interface AssistantMessageResult {
  assistantMessage: LMStudioMessage;
  toolResultMessage?: LMStudioMessage;
}

/**
 * Converts an assistant message to LMStudio format
 * Returns both the assistant message and optional tool result message
 */
export const convertAssistantMessage = (
  message: ThreadMessageLike
): AssistantMessageResult => {
  if (typeof message.content === "string") {
    return {
      assistantMessage: { role: "assistant", content: message.content },
    };
  }

  let toolResultContent = "";

  const content = message.content
    .map((part) => {
      if (part.type === "text") {
        return part.text;
      }

      if (part.type === "tool-call") {
        // Capture tool result for separate message
        toolResultContent = JSON.stringify({
          name: part.toolName,
          result: part.result,
        });

        return `${START_TOOL_TAG}${part.argsText}${END_TOOL_TAG}`;
      }

      return "";
    })
    .join("");

  const result: AssistantMessageResult = {
    assistantMessage: { role: "assistant", content },
  };

  if (toolResultContent) {
    result.toolResultMessage = {
      role: "user",
      content: `${toolResultContent}\n`,
    };
  }

  return result;
};

// ============================================================================
// Main Converter
// ============================================================================

/**
 * Converts thread messages to LMStudio message format
 */
export const convertMessagesToModelFormat = (
  messages: ThreadMessageLike[]
): LMStudioMessage[] => {
  const convertedMessages: LMStudioMessage[] = [];

  for (const message of messages) {
    if (message.role === "user") {
      convertedMessages.push(convertUserMessage(message));
    } else if (message.role === "system") {
      convertedMessages.push(convertSystemMessage(message));
    } else {
      const { assistantMessage, toolResultMessage } =
        convertAssistantMessage(message);
      convertedMessages.push(assistantMessage);

      if (toolResultMessage) {
        convertedMessages.push(toolResultMessage);
      }
    }
  }

  return convertedMessages;
};
