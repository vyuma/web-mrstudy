# Study Workflow Examples

このディレクトリには、`studyWorkflow` を使用するサンプルコードが含まれています。

## サンプルコードの実行方法

### study-workflow-client.ts

このサンプルは、Alice学習ワークフローの基本的な使い方を示しています。

**実行方法:**

```bash
# バックエンドディレクトリから実行
cd apps/backend

# 環境変数が設定されていることを確認
# .env ファイルに GOOGLE_GENERATIVE_AI_API_KEY が必要

# サンプルを実行
npx tsx src/examples/study-workflow-client.ts
```

**サンプルの内容:**

1. **Example 1**: 基本的な教育メッセージ（履歴なし）
2. **Example 2**: 会話履歴を含む教育メッセージ
3. **Example 3**: 複雑な概念の教育（質問を引き出す可能性）
4. **Example 4**: 完全な会話フローのシミュレーション

## ワークフローの基本的な使い方

```typescript
import { mastra } from "../mastra/index";

// ワークフローを取得
const workflow = mastra.getWorkflow("studyWorkflow");

// 実行インスタンスを作成
const run = await workflow.createRunAsync();

// ワークフローを実行
const result = await run.start({
  inputData: {
    message: "あなたの教えるメッセージ",
    conversationHistory: [ // オプション
      {
        role: "user",
        content: "過去のメッセージ",
        timestamp: new Date().toISOString(),
      },
    ],
  },
});

// ステータスをチェック
if (result.status !== "success") {
  console.error("Workflow failed:", result.status);
  return;
}

// 結果を使用
console.log(result.result.action);        // 'learn_from_user' | 'ask_question' | ...
console.log(result.result.response);      // Aliceの応答
console.log(result.result.metadata);      // 感情、自信度、学んだ概念など
```

## 返り値の型

```typescript
{
  action: 'learn_from_user' | 'ask_question' | 'encourage' | 'summarize_learning',
  response: string,  // Aliceの日本語応答
  metadata: {
    emotion: 'curious' | 'excited' | 'thoughtful' | 'understanding' | 'grateful' | 'confused' | 'impressed',
    confidence: number,  // 0.0 - 1.0
    learnedConcepts: string[],  // 学んだキーワード/概念
    nextRecommendedAction?: NextAction,  // 推奨される次のアクション
    requiresFollowUp: boolean,  // フォローアップが必要か
    conversationPhase: 'initial_learning' | 'deepening' | 'confirming' | 'applying',
  }
}
```

## Tips

- **会話履歴**: 最後の5-10メッセージを含めると、より文脈を理解した応答が得られます
- **タイムスタンプ**: ISO 8601形式の日時文字列を使用してください
- **エラーハンドリング**: ワークフローはエラー時に例外をスローするので、try-catchで囲むことを推奨します
