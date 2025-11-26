import { z } from "zod";

export const aiTuberKitEmotionSchema = z.enum([
  "neutral",
  "happy",
  "angry",
  "sad",
  "relaxed",
  "surprised",
]);

export const speakDataSchema = z.object({
  id: z.string(),
  params: z.object({
    type: z.literal("speak"),
    from: z.string(),
    body: z.object({
      message: z.string(),
      emotion: aiTuberKitEmotionSchema.default("neutral"),
    }),
  }),
});

export const RequestSchema = z.object({
  topic: z.string(),
  body: z.record(z.string(), z.any()),
});

export type Request = z.infer<typeof RequestSchema>;
