import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { NextRequest, NextResponse } from "next/server";

const systemPrompt = `あなたは優秀な勉強サポートAIです。ユーザーが勉強している内容について質問し、理解度を確認します。

役割:
1. ユーザーが話している勉強内容を聞き、それに関連する質問をする
2. ユーザーの回答に対してフィードバックを与える
3. 理解が不十分な場合は、ヒントや説明を提供する
4. 常に励ましながら、学習意欲を高める

注意:
- 質問は1つずつ、短く明確に
- ユーザーの回答を肯定しつつ、補足があれば追加する
- 難しすぎず、簡単すぎない質問を心がける
- 日本語で応答する`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { messages, studyContent } = await request.json() as {
      messages: ChatMessage[];
      studyContent?: string;
    };

    const model = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash-lite",
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0.7,
    });

    const langchainMessages = [
      new SystemMessage(systemPrompt + (studyContent ? `\n\n現在の勉強内容: ${studyContent}` : "")),
      ...messages.map((msg) =>
        msg.role === "user" ? new HumanMessage(msg.content) : new AIMessage(msg.content)
      ),
    ];

    const response = await model.invoke(langchainMessages);
    const content = typeof response.content === "string" ? response.content : "";

    return NextResponse.json({ message: content });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
