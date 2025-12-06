import { NextResponse } from "next/server";

export async function POST(request: Request) {
	try {
		// Parse request body
		const body = await request.json();
		const { message, conversationHistory } = body;

		// Validate required fields
		if (!message || typeof message !== "string") {
			return NextResponse.json(
				{
					success: false,
					error: "Message is required",
				},
				{ status: 400 },
			);
		}

		// Get backend URL from environment variable
		const backendUrl =
			process.env.BACKEND_API_URL || "http://localhost:4111";

		// Call Mastra backend workflow
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

		const response = await fetch(
			`${backendUrl}/api/workflows/studyWorkflow/start-async`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					inputData: {
						message,
						conversationHistory: conversationHistory || [],
					},
				}),
				signal: controller.signal,
			},
		);

		clearTimeout(timeoutId);

		if (!response.ok) {
			console.error("Backend workflow error:", await response.text());
			return NextResponse.json(
				{
					success: false,
					error: "Failed to generate response",
				},
				{ status: 500 },
			);
		}

		const result = await response.json();

		// Return success response
		return NextResponse.json({
			success: true,
			data: result.result, // Extract result from workflow response
		});
	} catch (error) {
		console.error("API Route error:", error);

		// Handle timeout error
		if (error instanceof Error && error.name === "AbortError") {
			return NextResponse.json(
				{
					success: false,
					error: "Request timeout",
				},
				{ status: 504 },
			);
		}

		// Handle network error
		return NextResponse.json(
			{
				success: false,
				error: "Connection failed",
			},
			{ status: 500 },
		);
	}
}
