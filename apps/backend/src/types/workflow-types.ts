import { z } from "zod";
import {
	nextAction,
	studyWorkflowInputSchema,
	workflowOutputSchema,
} from "../mastra/workflows/study";

/**
 * Type exports for workflow schemas
 * These can be imported by the frontend to ensure type safety
 */

export type NextAction = z.infer<typeof nextAction>;
export type WorkflowInput = z.infer<typeof studyWorkflowInputSchema>;
export type WorkflowOutput = z.infer<typeof workflowOutputSchema>;

/**
 * Helper types for conversation history
 */
export type ConversationMessage = {
	role: "user" | "assistant";
	content: string;
	timestamp: string;
};
