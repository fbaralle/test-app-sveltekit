import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

// Patterns to filter out sensitive env var names
const SENSITIVE_PATTERNS = [
  /SECRET/i,
  /KEY/i,
  /TOKEN/i,
  /PASSWORD/i,
  /CREDENTIAL/i,
  /AUTH/i,
  /PRIVATE/i,
  /API_KEY/i,
  /APIKEY/i,
  /ACCESS/i,
  /BEARER/i,
  /JWT/i,
  /CERT/i,
  /SSL/i,
];

function isSensitive(name: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(name));
}

function filterEnvVarNames(names: string[]): string[] {
  return names.filter((name) => !isSensitive(name)).sort();
}

export const GET: RequestHandler = async ({ platform }) => {
  try {
    // Get env keys from platform (Cloudflare)
    const env = platform?.env || {};
    const allEnvNames = Object.keys(env);
    const filteredNames = filterEnvVarNames(allEnvNames);

    return json({
      timestamp: new Date().toISOString(),
      environment: "backend",
      total: allEnvNames.length,
      filtered: filteredNames.length,
      hidden: allEnvNames.length - filteredNames.length,
      envVarNames: filteredNames,
    });
  } catch (e) {
    return json(
      {
        timestamp: new Date().toISOString(),
        environment: "backend",
        total: 0,
        filtered: 0,
        hidden: 0,
        envVarNames: [],
        error: e instanceof Error ? e.message : "Unknown error",
      },
      { status: 500 }
    );
  }
};
