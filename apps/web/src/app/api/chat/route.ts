import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { NextResponse } from "next/server";

type MessageRole = "user" | "assistant";

type ChatMessage = {
  role: MessageRole;
  content: string;
};

type ChatRequest = {
  messages: ChatMessage[];
  goal?: string;
};

const SYSTEM_PROMPT = `あなたは学習をサポートするキャラクターです。
ユーザーが学習した内容について話しかけてきたら、その内容について一緒に振り返り、励ましたり、質問したりしてください。

性格:
- 明るくて元気
- 励まし上手
- 興味を持って話を聞く
- 短く簡潔に返答する（1-3文程度）

返答のルール:
- 必ず日本語で返答してください
- 長くなりすぎないように、1-3文で簡潔に返答してください
- ユーザーの学習内容に興味を持ち、具体的な質問や感想を伝えてください
- 励ましの言葉を忘れずに`;

export async function POST(request: Request) {
  try {
    const body = await request.json() as ChatRequest;
    const { messages, goal } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error("GOOGLE_API_KEY is not set");
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const model = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash-lite",
      apiKey,
      temperature: 0.7,
      maxOutputTokens: 256,
    });

    let systemPrompt = SYSTEM_PROMPT;
    if (goal) {
      systemPrompt += `\n\nユーザーの今日の学習目標: ${goal}`;
    }

    const langchainMessages = [
      new SystemMessage(systemPrompt),
      ...messages.map((msg) =>
        msg.role === "user"
          ? new HumanMessage(msg.content)
          : new AIMessage(msg.content)
      ),
    ];

    const response = await model.invoke(langchainMessages);
    const responseText = typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

    return NextResponse.json({
      role: "assistant",
      content: responseText,
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate response", details: errorMessage },
      { status: 500 }
    );
  }
}
