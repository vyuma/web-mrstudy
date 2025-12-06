import { mastra } from "../mastra/index";

/**
 * Example client code for using the study workflow
 * This demonstrates how to interact with Alice's learning workflow
 */

async function runStudyWorkflowExample() {
	// Get the workflow from the Mastra instance
	const workflow = mastra.getWorkflow("studyWorkflow");

	// Example 1: Simple teaching message without history
	console.log("=== Example 1: Teaching a new concept ===");
	const run1 = await workflow.createRunAsync();
	const result1 = await run1.start({
		inputData: {
			message: "TypeScriptは型安全なJavaScriptだよ。静的型付けができるんだ。",
		},
	});

	if (result1.status !== "success") {
		console.error("Example 1 failed:", result1.status);
		return;
	}

	console.log("Action:", result1.result.action);
	console.log("Response:", result1.result.response);
	console.log("Emotion:", result1.result.metadata.emotion);
	console.log("Confidence:", result1.result.metadata.confidence);
	console.log("Learned Concepts:", result1.result.metadata.learnedConcepts);
	console.log("Conversation Phase:", result1.result.metadata.conversationPhase);
	console.log("---\n");

	// Example 2: Teaching with conversation history
	console.log("=== Example 2: Teaching with conversation context ===");
	const run2 = await workflow.createRunAsync();
	const result2 = await run2.start({
		inputData: {
			message: "さっき話したTypeScriptで、インターフェースを使うと型を定義できるよ。",
			conversationHistory: [
				{
					role: "user" as const,
					content: "TypeScriptは型安全なJavaScriptだよ。",
					timestamp: new Date(Date.now() - 60000).toISOString(),
				},
				{
					role: "alice" as const,
					content: "TypeScript！型安全って面白そう！もっと教えて！",
					timestamp: new Date(Date.now() - 50000).toISOString(),
				},
			],
		},
	});

	if (result2.status !== "success") {
		console.error("Example 2 failed:", result2.status);
		return;
	}

	console.log("Action:", result2.result.action);
	console.log("Response:", result2.result.response);
	console.log("Emotion:", result2.result.metadata.emotion);
	console.log("Learned Concepts:", result2.result.metadata.learnedConcepts);
	console.log("Requires Follow-up:", result2.result.metadata.requiresFollowUp);
	console.log("---\n");

	// Example 3: Complex teaching that might trigger questions
	console.log("=== Example 3: Complex concept ===");
	const run3 = await workflow.createRunAsync();
	const result3 = await run3.start({
		inputData: {
			message:
				"ジェネリック型を使うと、型パラメータで柔軟な型定義ができて再利用性が高まるんだ。",
		},
	});

	if (result3.status !== "success") {
		console.error("Example 3 failed:", result3.status);
		return;
	}

	console.log("Action:", result3.result.action);
	console.log("Response:", result3.result.response);
	console.log("Emotion:", result3.result.metadata.emotion);
	console.log("Topic Complexity: complex (likely)");
	console.log(
		"Next Recommended Action:",
		result3.result.metadata.nextRecommendedAction,
	);
	console.log("---\n");

	// Example 4: Simulate a full conversation flow
	console.log("=== Example 4: Full conversation simulation ===");
	const conversationHistory: Array<{
		role: "user" | "alice";
		content: string;
		timestamp: string;
	}> = [];

	const messages = [
		"今日はReactについて教えるね。Reactはコンポーネントベースのライブラリだよ。",
		"コンポーネントは再利用可能なUI部品なんだ。関数として定義できるよ。",
		"Hooksを使うと、関数コンポーネントでも状態管理ができるんだよ。",
	];

	for (const message of messages) {
		const run = await workflow.createRunAsync();
		const result = await run.start({
			inputData: {
				message,
				conversationHistory:
					conversationHistory.length > 0 ? conversationHistory : undefined,
			},
		});

		if (result.status !== "success") {
			console.error("Workflow failed:", result.status);
			break;
		}

		// Add user message to history
		conversationHistory.push({
			role: "user",
			content: message,
			timestamp: new Date().toISOString(),
		});

		// Add Alice's response to history
		conversationHistory.push({
			role: "alice",
			content: result.result.response,
			timestamp: new Date().toISOString(),
		});

		console.log(`User: ${message}`);
		console.log(
			`Alice [${result.result.metadata.emotion}]: ${result.result.response}`,
		);
		console.log(
			`  (Action: ${result.result.action}, Confidence: ${result.result.metadata.confidence})`,
		);
		console.log(
			`  Learned: ${result.result.metadata.learnedConcepts.join(", ") || "N/A"}`,
		);
		console.log();

		// Keep only last 10 messages
		if (conversationHistory.length > 10) {
			conversationHistory.splice(0, conversationHistory.length - 10);
		}
	}

	console.log("=== Conversation Summary ===");
	console.log("Total messages exchanged:", conversationHistory.length);
	const allConcepts = conversationHistory
		.filter((msg) => msg.role === "alice")
		.map((msg) => msg.content);
	console.log("Alice's learning journey captured in conversation history");
}

// Run the example
runStudyWorkflowExample()
	.then(() => {
		console.log("\n✅ Study workflow examples completed successfully");
		process.exit(0);
	})
	.catch((error) => {
		console.error("❌ Error running study workflow:", error);
		process.exit(1);
	});
