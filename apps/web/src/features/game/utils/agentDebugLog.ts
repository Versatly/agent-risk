const AGENT_DEBUG_PREFIX = "__agent_debug__";

export function agentDebugLog(payload: {
  hypothesisId: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
}) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const entry = {
      ...payload,
      timestamp: Date.now(),
    };
    console.info(`${AGENT_DEBUG_PREFIX}${JSON.stringify(entry)}`);
  } catch {
    // Swallow serialization errors to avoid impacting UI behavior during debug.
  }
}

export { AGENT_DEBUG_PREFIX };
