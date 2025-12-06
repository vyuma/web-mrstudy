import { mastra } from "../mastra/index";

/**
 * Minimal example: Single message to Alice
 */
async function simpleExample() {
	const workflow = mastra.getWorkflow("studyWorkflow");
	const run = await workflow.createRunAsync();

	const result = await run.start({
		inputData: {
			message: "プログラミングって楽しいよ！一緒に学ぼう！",
		},
	});

	if (result.status !== "success") {
		console.error("Workflow failed:", result.status);
		return;
	}

	console.log("Alice's response:", result.result.response);
	console.log("Emotion:", result.result.metadata.emotion);
	console.log("Action taken:", result.result.action);
}

simpleExample().catch(console.error);
