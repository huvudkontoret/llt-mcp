import worker from "../../src/worker.ts";

// Block all outbound Worker requests, even if a test accidentally selects live mode.
globalThis.fetch = async () => {
  throw new Error("Outbound requests are disabled in tests");
};
export default worker;
