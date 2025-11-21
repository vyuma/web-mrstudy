import { ayaCompanionCard, ayaHistory } from "./cards/aya";
import { kyokoCompanionCard, kyokoHistory } from "./cards/kyoko";
import { createCompanionServer } from "./utils/companion";
import { createFirehoseServer } from "./utils/firehose";

(async () => {
  createCompanionServer(
    [
      { agent: kyokoCompanionCard, history: kyokoHistory },
      { agent: ayaCompanionCard, history: ayaHistory },
    ],
    5000,
  );
  createFirehoseServer(8080);
})();
