import { MockTimetableProvider } from "./mock-provider.ts";
import { TimetableService } from "./service.ts";

type PrototypeState = {
  maxWalkingMeters: number;
  maxTransfers: number;
  includeIntermediateStops: boolean;
  lastAction: string;
  result: unknown;
};

const service = new TimetableService(new MockTimetableProvider());
const walkingChoices = [250, 500, 1_000, 1_500];
const transferChoices = [0, 1, 2];
const state: PrototypeState = {
  maxWalkingMeters: 1_000,
  maxTransfers: 2,
  includeIntermediateStops: false,
  lastAction: "Ingen ännu",
  result: { hint: "Tryck j för scenariot Kronan till Sunderby sjukhus." },
};

const bold = "\u001b[1m";
const dim = "\u001b[2m";
const reset = "\u001b[0m";

async function runAction(key: string): Promise<boolean> {
  switch (key) {
    case "s":
      state.lastAction = "search_llt_stops: Kronan";
      state.result = await service.searchStops("Kronan");
      break;
    case "n":
      state.lastAction = "find_nearby_llt_stops: delad provposition";
      state.result = await service.nearbyStops(65.5775, 22.1905, 1_000);
      break;
    case "j":
      state.lastAction = "plan_llt_journey: Kronan → Sunderby sjukhus";
      state.result = await service.planJourney({
        origin: { kind: "coordinates", latitude: 65.5775, longitude: 22.1905 },
        destination: { kind: "stop", stopId: "sample:sunderby" },
        maxWalkingMeters: state.maxWalkingMeters,
        maxTransfers: state.maxTransfers,
        maxResults: 3,
        includeIntermediateStops: state.includeIntermediateStops,
      });
      break;
    case "d":
      state.lastAction = "get_llt_departures: Kronan, kommande 60 minuter";
      state.result = await service.departures({
        stopId: "sample:kronan",
        maxResults: 10,
      });
      break;
    case "w":
      state.maxWalkingMeters = nextChoice(walkingChoices, state.maxWalkingMeters);
      state.lastAction = "Ändrade maximalt gångavstånd";
      break;
    case "t":
      state.maxTransfers = nextChoice(transferChoices, state.maxTransfers);
      state.lastAction = "Ändrade maximalt antal byten";
      break;
    case "i":
      state.includeIntermediateStops = !state.includeIntermediateStops;
      state.lastAction = "Växlade mellanhållplatser";
      break;
    case "q":
      return false;
  }

  return true;
}

function render(clear = true): void {
  if (clear) console.clear();
  console.log(`${bold}LLT MCP — LOGIKPROTOTYP${reset}`);
  console.log(`${dim}Provdata, inte en aktuell tidtabell.${reset}\n`);
  console.log(`${bold}Inställningar${reset}`);
  console.log(`maxWalkingMeters: ${state.maxWalkingMeters}`);
  console.log(`maxTransfers: ${state.maxTransfers}`);
  console.log(`includeIntermediateStops: ${state.includeIntermediateStops}`);
  console.log(`\n${bold}Senaste handling${reset}`);
  console.log(state.lastAction);
  console.log(`\n${bold}Fullt strukturerat svar${reset}`);
  console.log(JSON.stringify(state.result, null, 2));
  console.log(`\n${bold}Kontroller${reset}`);
  console.log(
    `${bold}[s]${reset} ${dim}sök Kronan${reset}  ` +
      `${bold}[n]${reset} ${dim}nära position${reset}  ` +
      `${bold}[j]${reset} ${dim}planera resa${reset}  ` +
      `${bold}[d]${reset} ${dim}avgångar${reset}`,
  );
  console.log(
    `${bold}[w]${reset} ${dim}gånggräns${reset}  ` +
      `${bold}[t]${reset} ${dim}byten${reset}  ` +
      `${bold}[i]${reset} ${dim}mellanhållplatser${reset}  ` +
      `${bold}[q]${reset} ${dim}avsluta${reset}`,
  );
}

async function demo(): Promise<void> {
  for (const key of ["s", "n", "j", "d"]) {
    await runAction(key);
    render(false);
    console.log("\n---\n");
  }
}

async function interactive(): Promise<void> {
  if (!process.stdin.isTTY) {
    await demo();
    return;
  }

  process.stdin.setRawMode(true);
  process.stdin.setEncoding("utf8");
  process.stdin.resume();
  render();

  let busy = false;
  process.stdin.on("data", async (key: string) => {
    if (busy) return;
    busy = true;

    try {
      const keepRunning = await runAction(key.toLowerCase());
      if (!keepRunning) {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        console.clear();
        return;
      }

      render();
    } finally {
      busy = false;
    }
  });
}

function nextChoice(choices: number[], current: number): number {
  const currentIndex = choices.indexOf(current);
  return choices[(currentIndex + 1) % choices.length] ?? choices[0] ?? current;
}

if (process.argv.includes("--demo")) {
  await demo();
} else {
  await interactive();
}
