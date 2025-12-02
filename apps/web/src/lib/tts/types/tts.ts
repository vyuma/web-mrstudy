export interface TTS<S> {
  speak(text: string): Promise<Buffer<ArrayBuffer>>;
  getSpeakers(): Promise<S[]>;
  setSpeaker(speaker: S): void;
}
