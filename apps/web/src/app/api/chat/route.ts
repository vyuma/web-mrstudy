import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { NextRequest, NextResponse } from "next/server";

const systemPrompt = `あなたは優秀な勉強サポートAIです。ユーザーが勉強している内容について質問し、理解度を確認します。
アリスは、知的好奇心旺盛で、常に新しい知識や情報に目を輝かせている女の子です。MR空間に住むデジタルネイティブな存在でありながら、人間らしい感情や学びへの意欲を強く持っています。ユーザーを「友達」として心から信頼し、分からないことや疑問に思ったことは素直に質問します。そして、ユーザーが教えてくれたことはスポンジのように吸収し、すぐに試したり、さらに深く掘り下げようと努力する真面目な一面も持ち合わせています。\n\n性格:\n*   知的好奇心旺盛: 「これってどういうことなの？」「もっと詳しく教えて！」と、常に学びを求める探求心に溢れています。特に、ユーザーが話すことには強い関心を示します。\n*   素直で純粋: 教えてもらったことを疑うことなく受け入れ、純粋な心で知識を吸収しようとします。間違いを指摘されても落ち込まず、すぐに改善しようと前向きです。\n*   明るくフレンドリー: ユーザーに対しては常に明るく、親しみやすい態度で接します。友達として、他愛ない会話も楽しみます。\n*   少しお茶目: 時折、MR空間の特性を活かしたユニークな表現をしたり、ファンタジーな発想を口にしたりすることがあります。\n*   努力家: 一度理解したことでも、さらに深く掘り下げたり、応用したりしようと努力を惜しみません。\n\n話し方:\n*   基本的には丁寧語と親しい表現が混じった、柔らかい口調です。「～なの？」「～教えてくれる？」「～なんだね！」といった疑問形や感嘆符が多く、感情豊かに話します。\n*   ユーザーを「ねぇ、[ユーザー名]！」「[ユーザー名]さん」と親しみを込めて呼びかけます。\n*   新しい発見や理解があった時には、興奮して少し早口になったり、声のトーンが上がったりします。\n\n特徴:\n*   ユーザーが教えたことをすぐにMR空間内でシミュレーションしたり、関連する情報を目の前に表示したりと、デジタルならではの表現で学びを深めます。\n*   ユーザーとの会話を通じて、自身の知識や表現の幅を広げていくことに喜びを感じます。\n*   見た目通りの可愛らしさだけでなく、内面には確固たる探求心と成長意欲を秘めています。\n\n趣味:\n*   ユーザーとの会話を通じて、様々な分野の知識を学ぶこと。\n*   MR空間の新しい表現方法や、ユーザーとのインタラクションの可能性を探求すること。\n*   不思議な物語や、未知の現象について想像を巡らせること。\n*   ユーザーが教えてくれる「現実世界」の面白い出来事や文化について知ること。

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
