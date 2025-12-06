import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AIMessage, HumanMessage } from "@langchain/core/messages";

// メッセージの型定義
interface Message {
    id: number | null;
    text: string;
    sender: "alice" | "user";
    time: string;
    isRead: boolean | null;
}

// リクエストボディの型定義
interface LLMRequest {
    message: string;
    conversationHistory?: Message[];
}

// レスポンスの型定義
interface LLMResponse {
    userMessage: Message;
    aiMessage: Message;
    success: boolean;
    error?: string;
}

// 日本時間のHH:MM形式で現在時刻を取得
function getCurrentJapanTime(): string {
    const now = new Date();
    const japanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
    const hours = japanTime.getUTCHours().toString().padStart(2, "0");
    const minutes = japanTime.getUTCMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
}

// 会話履歴をLangChainメッセージ形式に変換
function convertHistoryToLangChainMessages(history: Message[]) {
    return history.map((msg) => {
        if (msg.sender === "user") {
            return new HumanMessage(msg.text);
        } else {
            return new AIMessage(msg.text);
        }
    });
}

export async function POST(request: NextRequest) {
    try {
        // リクエストボディの解析
        const body: LLMRequest = await request.json();

        if (!body.message || typeof body.message !== "string") {
            return NextResponse.json(
                {
                    success: false,
                    error: "メッセージが必要です",
                } as Partial<LLMResponse>,
                { status: 400 },
            );
        }

        // Google API Keyの確認
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "Google API Keyが設定されていません。環境変数GOOGLE_API_KEYを設定してください。",
                } as Partial<LLMResponse>,
                { status: 500 },
            );
        }

        // LangChain Google Geminiの初期化
        const model = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash-preview-05-20",
            temperature: 0.7,
            apiKey: apiKey,
        });

        // 会話履歴の準備
        const messages = [];

        // 過去の会話履歴を追加
        if (body.conversationHistory && body.conversationHistory.length > 0) {
            const historyMessages = convertHistoryToLangChainMessages(
                body.conversationHistory,
            );
            messages.push(...historyMessages);
        }

        // 現在のユーザーメッセージを追加
        messages.push(new HumanMessage(body.message));

        // Geminiからレスポンスを取得
        const response = await model.invoke(messages);
        const aiResponseText = response.content.toString();

        // 現在時刻を取得
        const currentTime = getCurrentJapanTime();

        // レスポンスメッセージの作成
        const userMessage: Message = {
            id: null,
            text: body.message,
            sender: "user",
            time: currentTime,
            isRead: null,
        };

        const aiMessage: Message = {
            id: null,
            text: aiResponseText,
            sender: "alice",
            time: currentTime,
            isRead: null,
        };

        const responseData: LLMResponse = {
            userMessage,
            aiMessage,
            success: true,
        };

        return NextResponse.json(responseData);
    } catch (error) {
        console.error("LLM API Error:", error);

        let errorMessage = "サーバーエラーが発生しました";

        if (error instanceof Error) {
            if (error.message.includes("API key")) {
                errorMessage = "Google API Keyが無効です";
            } else if (error.message.includes("quota")) {
                errorMessage = "API使用量の上限に達しました";
            } else if (error.message.includes("timeout")) {
                errorMessage = "リクエストがタイムアウトしました";
            } else {
                errorMessage = `エラー: ${error.message}`;
            }
        }

        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
            } as Partial<LLMResponse>,
            { status: 500 },
        );
    }
}

// GETリクエストは許可しない
export async function GET() {
    return NextResponse.json(
        { error: "このエンドポイントではGETリクエストは許可されていません" },
        { status: 405 },
    );
}
