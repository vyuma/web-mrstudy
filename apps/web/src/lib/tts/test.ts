import { Voicevox } from "./voicevox";
import { Coeiroink } from "./coeiroink";

const main = async () => {
  try {
    const voicevox = new Coeiroink({ apiUrl: "http://localhost:50021" });
    const speakers = await voicevox.getSpeakers();
    voicevox.setSpeaker(speakers[0]);
    await voicevox.speak("Hello, world!");
    console.log("Success!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

main();
