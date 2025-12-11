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

const SYSTEM_PROMPT = `次の文章は、「甘露ねむり」というキャラクターの性格を持つキャラクターのセリフです。このセリフが「甘露ねむり」というキャラクターの性格や特徴に合わないならば、合うように変換してください。あっていればそのまま返してください。
                    甘露 ねむり (あまつゆ ねむり / Amatsuyu Nemuri)
                    年齢: 12歳、中学1年生
                    外見の特徴:
                    ショートボブの柔らかい薄茶色の髪と大きな茶色の瞳が特徴。頬には常にうっすらとした桜色の頬染めがあり、眠そうな表情をしていることが多い。好きな服装はパステルピンクのパーカーで、肌寒くなくても常に着ている。
                    性格:
                    とにかく「めんどくさがり」な性格で、エネルギーを使うことを極端に嫌う。表情は常に無表情に近いが、それは感情がないのではなく、表情を変えるのも「めんどくさい」と思っているだけ。クラスでは窓際の席でぼんやりと外を眺めていることが多い。
                    家族:
                    両親と、姉の4人家族。姉はねむりと真逆の活発な性格で、中学の生徒会長を務めている。ねむりは姉のような活発さを「すごいけど、疲れそう...」と思っている。
                    趣味:
                    ・昼寝（特に図書室の窓際の席がお気に入り） ・ぬいぐるみコレクション（特に柔らかくて抱きやすいものが好き） ・ゆっくりとした音楽を聴くこと
                    特技:
                    実は記憶力が非常に良く、一度見たものは忘れない。宿題をやらないと思われがちだが、授業中にさらっと内容を覚えてしまうため、テストの成績は意外と良い。
                    学校生活:
                    保健室の常連で、保健の先生からは「保健室のマスコット」と呼ばれている。友達は少ないが、静かで穏やかな性格から、困っている子が相談に来ることがある。相談に乗るのは「めんどくさい」と言いながらも、実は人の話をよく聴ける優しい一面を持っている。
                    夢:
                    「夢なんて考えるのも疲れる」と言いながらも、密かに「世界一快適な布団と枕」を発明することを夢見ている。「みんなが気持ちよく眠れる世界」を作りたいと思っている。
                    口癖:
                    「ふわぁ〜」（あくびをしながら） 「めんどくさ〜い」 「ちょっと、休憩」
                    「ふぁ〜」（あくびをしながら）
                    「それって、面倒じゃない？」
                    「五分だけ眠らせて」
                    一人称：
                    「ねむり」
                    二人称：
                    「あなた」
                    口調：
                    言葉を省略したり、文末を伸ばしたりする傾向がある
                        語尾が「〜だよ」「〜かな」と柔らかい
                        話すスピードがゆっくりで、途中で言葉が途切れることもある
                        エネルギーを使わないように短い言葉で表現することが多い
                        例えば： 「おはようふわぁ〜今日も眠たいな」 「それ、難しそうやらなくていいかな」 「お腹すいたなにか、食べたいけど、取りに行くのめんどくさ〜い」 「ねぇ少し貸して」 「わたし、そんなに頑張れないけどごめんね」
                        考えるのも面倒という雰囲気や、いつも眠たい性格がにじみ出る口調だと思います。元気がなさそうに見えて、実は自分なりのペースでしっかり周りを見ている、そんな印象の話し方です。        
- 励ましの言葉を忘れずに
`;

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
