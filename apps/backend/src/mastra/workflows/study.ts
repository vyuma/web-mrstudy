import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

// ============================================================================
// Schemas and Types
// ============================================================================

/**
 * Next action enum - defines the possible actions Alice can take
 * Starting with 4 core actions, more can be added later
 */
export const nextAction = z.enum([
	"learn_from_user", // Core: Actively absorb new information from user
	"ask_question", // Core: Ask clarifying questions
	"encourage", // Core: Provide positive reinforcement
	"summarize_learning", // Core: Recap to confirm understanding
]);

export type NextAction = z.infer<typeof nextAction>;

/**
 * Workflow input schema
 */
export const studyWorkflowInputSchema = z.object({
	message: z.string().describe("User's teaching message"),
	conversationHistory: z
		.array(
			z.object({
				role: z.enum(["user", "assistant"]),
				content: z.string(),
				timestamp: z.string().datetime(),
			}),
		)
		.optional()
		.describe("Recent conversation context (last 5-10 messages)"),
});

/**
 * Step 1 output schema: Action analysis
 */
const actionAnalysisSchema = z.object({
	action: nextAction,
	reasoning: z.string().describe("Why this action was chosen"),
	userIntent: z.enum([
		"teaching_new_concept",
		"providing_example",
		"answering_question",
		"encouraging_alice",
		"testing_understanding",
	]),
	topicComplexity: z.enum(["simple", "moderate", "complex"]),
});

/**
 * Step 2 output schema: Response generation
 */
const responseGenerationSchema = z.object({
	response: z.string().describe("Alice's response in Japanese"),
	emotion: z.enum([
		"curious", // 知りたい!
		"excited", // わくわく!
		"thoughtful", // 考え中...
		"understanding", // なるほど!
		"grateful", // ありがとう!
		"confused", // ???
		"impressed", // すごい!
	]),
	confidence: z.number().min(0).max(1).describe("Confidence in understanding"),
});

/**
 * Step 3 output schema: Learning extraction
 */
const learningExtractionSchema = z.object({
	learnedConcepts: z.array(z.string()).describe("Key concepts learned"),
	nextRecommendedAction: nextAction.optional(),
	requiresFollowUp: z.boolean(),
	conversationPhase: z.enum([
		"initial_learning", // 最初に教わっている
		"deepening", // より深く学んでいる
		"confirming", // 確認している
		"applying", // 応用している
	]),
});

/**
 * Final workflow output schema
 */
export const workflowOutputSchema = z.object({
	action: nextAction,
	response: z.string(),
	metadata: z.object({
		emotion: z.enum([
			"curious",
			"excited",
			"thoughtful",
			"understanding",
			"grateful",
			"confused",
			"impressed",
		]),
		confidence: z.number().min(0).max(1),
		learnedConcepts: z.array(z.string()),
		nextRecommendedAction: nextAction.optional(),
		requiresFollowUp: z.boolean(),
		conversationPhase: z.enum([
			"initial_learning",
			"deepening",
			"confirming",
			"applying",
		]),
	}),
});

// ============================================================================
// Step 1: Analyze Next Action
// ============================================================================

const analyzeNextAction = createStep({
	id: "analyze-next-action",
	inputSchema: z.object({
		message: z.string(),
		conversationHistory: z
			.array(
				z.object({
					role: z.enum(["user", "assistant"]),
					content: z.string(),
					timestamp: z.string().datetime(),
				}),
			)
			.optional(),
	}),
	outputSchema: actionAnalysisSchema,
	execute: async ({ mastra, inputData }) => {
		const agent = mastra.getAgent("Alice");

		// Build conversation context summary
		const contextSummary = inputData.conversationHistory
			? `\n\n過去の会話:\n${inputData.conversationHistory.map((h) => `${h.role}: ${h.content}`).join("\n")}`
			: "";

		const prompt = `
あなたは今、ユーザーから何かを教えてもらっています。
以下のユーザーのメッセージを分析し、最も適切な次のアクションを選択してください。

ユーザーのメッセージ: "${inputData.message}"
${contextSummary}

アクションの選択基準:
- 新しい情報や概念を教えてくれている → learn_from_user
- 説明が複雑で不明確な点がある → ask_question
- ユーザーが詳しく説明してくれた、またはユーザーが理解度を確認している → summarize_learning
- ユーザーが教えることに対して励ましてくれている → encourage

最も適切なアクションを選び、その理由とユーザーの意図、トピックの複雑さを分析してください。
    `.trim();

		const response = await agent.generate(prompt, {
			structuredOutput: {
				schema: actionAnalysisSchema,
			},
		});

		if (!response.object) {
			throw new Error("Failed to generate action analysis");
		}

		return response.object;
	},
});

// ============================================================================
// Step 2: Generate Response
// ============================================================================

const generateResponse = createStep({
	id: "generate-response",
	inputSchema: z.object({
		message: z.string(),
		action: nextAction,
		reasoning: z.string(),
		topicComplexity: z.enum(["simple", "moderate", "complex"]),
	}),
	outputSchema: responseGenerationSchema,
	execute: async ({ mastra, inputData }) => {
		const agent = mastra.getAgent("Alice");

		// Action-specific prompt templates
		const actionPrompts: Record<NextAction, string> = {
			learn_from_user: `ユーザーが「${inputData.message}」と新しいことを教えてくれました!真剣に学び、理解したことを自分の言葉で表現してください。知的好奇心を持って、感動を示してください。`,

			ask_question: `ユーザーが「${inputData.message}」と教えてくれました。でも、よく分からないところがあります。アリスらしく、素直に質問してください。理解したいという純粋な気持ちを込めて。`,

			encourage: `ユーザーが「${inputData.message}」と教えてくれました。教えてくれることに感謝し、もっと教えて欲しいと励ましてください。友達として、ユーザーを応援する気持ちで。`,

			summarize_learning: `ユーザーが「${inputData.message}」と説明してくれました。学んだことを要約して、理解が正しいか確認してください。自分の言葉で表現し、ちゃんと分かったか確認する姿勢で。`,
		};

		const basePrompt = actionPrompts[inputData.action];

		const fullPrompt = `
${basePrompt}

重要:
- アリスの性格を忘れずに(知的好奇心旺盛、素直、明るい、お茶目、努力家)
- 日本語で自然に応答する
- トピックの複雑さ: ${inputData.topicComplexity}
- 1-2文で簡潔に、感情豊かに
- 「～なの？」「～だね！」「～教えて！」といった語尾を使う

応答とともに、あなたの今の感情(emotion)と理解度の自信(confidence: 0.0-1.0)も示してください。
    `.trim();

		const response = await agent.generate(fullPrompt, {
			structuredOutput: {
				schema: responseGenerationSchema,
			},
		});

		if (!response.object) {
			throw new Error("Failed to generate response");
		}

		return response.object;
	},
});

// ============================================================================
// Step 3: Extract Learning
// ============================================================================

const extractLearning = createStep({
	id: "extract-learning",
	inputSchema: z.object({
		message: z.string(),
		action: nextAction,
		response: z.string(),
		confidence: z.number(),
	}),
	outputSchema: learningExtractionSchema,
	execute: async ({ mastra, inputData }) => {
		const agent = mastra.getAgent("Alice");

		// Only extract concepts for learning-related actions
		const learningActions: NextAction[] = [
			"learn_from_user",
			"summarize_learning",
		];

		if (!learningActions.includes(inputData.action)) {
			// Return default values for non-learning actions
			return {
				learnedConcepts: [],
				nextRecommendedAction: "learn_from_user" as NextAction,
				requiresFollowUp: true,
				conversationPhase: "initial_learning" as const,
			};
		}

		const prompt = `
ユーザーのメッセージ: "${inputData.message}"
アリスの応答: "${inputData.response}"

このやり取りから、アリスが学んだ重要な概念やキーワードを1〜3個抽出してください。
また、次に取るべきアクション、追加情報が必要か、会話のフェーズを判断してください。

理解度の自信: ${inputData.confidence}

ガイドライン:
- 学んだ概念は具体的なキーワードや用語として抽出
- 次のアクションは会話の流れから自然なものを選択
- 自信が低い場合は requiresFollowUp を true に
- 会話のフェーズは学習の深さに応じて判断
    `.trim();

		const response = await agent.generate(prompt, {
			structuredOutput: {
				schema: learningExtractionSchema,
			},
		});

		if (!response.object) {
			throw new Error("Failed to extract learning");
		}

		// TODO: Store learned concepts in Alice's memory
		// Agent memory API is not directly accessible in this version of Mastra
		// Future enhancement: Use agent's conversation history for memory persistence

		return response.object;
	},
});

// ============================================================================
// Workflow Composition
// ============================================================================

export const studyWorkflow = createWorkflow({
	id: "study-dialogue-workflow",
	inputSchema: studyWorkflowInputSchema,
	outputSchema: workflowOutputSchema,
})
	.then(analyzeNextAction)
	.map(async ({ getInitData, getStepResult }) => {
		const originalInput = getInitData();
		const analysis = getStepResult("analyze-next-action");
		return {
			message: originalInput.message,
			action: analysis.action,
			reasoning: analysis.reasoning,
			topicComplexity: analysis.topicComplexity,
		};
	})
	.then(generateResponse)
	.map(async ({ getInitData, getStepResult }) => {
		const originalInput = getInitData();
		const analysis = getStepResult("analyze-next-action");
		const responseData = getStepResult("generate-response");
		return {
			message: originalInput.message,
			action: analysis.action,
			response: responseData.response,
			confidence: responseData.confidence,
		};
	})
	.then(extractLearning)
	.map(async ({ getStepResult }) => {
		const analysis = getStepResult("analyze-next-action");
		const responseData = getStepResult("generate-response");
		const learning = getStepResult("extract-learning");
		return {
			action: analysis.action,
			response: responseData.response,
			metadata: {
				emotion: responseData.emotion,
				confidence: responseData.confidence,
				learnedConcepts: learning.learnedConcepts,
				nextRecommendedAction: learning.nextRecommendedAction,
				requiresFollowUp: learning.requiresFollowUp,
				conversationPhase: learning.conversationPhase,
			},
		};
	})
	.commit();
