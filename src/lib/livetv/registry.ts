import type { LiveProvider } from "./types";

import { sportHDProvider } from "./providers/sportHD";
import { loopProvider } from "./providers/loop";
import { daddyLiveProvider } from "./providers/daddylive";
import { madTitanProvider } from "./providers/madTitan";
import { risingTidesProvider } from "./providers/risingTides";

export const providers: LiveProvider[] = [
  sportHDProvider,
  loopProvider,
  daddyLiveProvider,
  madTitanProvider,
  risingTidesProvider,
].sort((a, b) => a.priority - b.priority);
