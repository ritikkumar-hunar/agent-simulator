import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * On-start webhook for the Sarvam agent.
 *
 * Configure your single reusable Sarvam agent so that, at conversation start,
 * it calls this endpoint and maps the returned fields onto agent variables.
 * The agent's system prompt should reference those variables, e.g.:
 *
 *   {{scenario_prompt}}
 *
 *   Expected behaviours to keep in mind:
 *   {{expected_behaviors}}
 *
 * Whatever persona you set from the UI is injected here for the next inbound
 * call, so you never have to edit the agent in the dashboard again.
 */
function readActiveScenario() {
  const filePath = path.join(process.cwd(), 'current_scenario.json');
  const fallback = {
    scenarioPrompt: 'You are a customer. Act normally.',
    expectedBehaviors: '',
  };

  if (!fs.existsSync(filePath)) return fallback;

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return {
      scenarioPrompt:
        typeof parsed.scenarioPrompt === 'string' && parsed.scenarioPrompt.trim()
          ? parsed.scenarioPrompt
          : fallback.scenarioPrompt,
      expectedBehaviors:
        typeof parsed.expectedBehaviors === 'string' ? parsed.expectedBehaviors : '',
    };
  } catch {
    return fallback;
  }
}

/**
 * If SIMULATOR_WEBHOOK_SECRET is set, require it on each request (header or
 * query param). Returns null when authorized, or a 401 response when not.
 * When the secret is unset, the webhook stays open (backward compatible).
 */
function checkAuth(req: Request): NextResponse | null {
  const secret = process.env.SIMULATOR_WEBHOOK_SECRET?.trim();
  if (!secret) return null;

  const headerSecret = req.headers.get('x-webhook-secret')?.trim();
  const querySecret = new URL(req.url).searchParams.get('secret')?.trim();

  if (headerSecret === secret || querySecret === secret) return null;

  console.warn('[Sarvam Webhook] Rejected request: bad or missing secret.');
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function buildPayload() {
  const { scenarioPrompt, expectedBehaviors } = readActiveScenario();
  console.log(`[Sarvam Webhook] Injecting persona: ${scenarioPrompt.substring(0, 60)}...`);

  // Return the fields both at the top level and under `variables` so the payload
  // works regardless of how your agent is configured to read dynamic variables.
  const variables = {
    scenario_prompt: scenarioPrompt,
    expected_behaviors: expectedBehaviors,
  };

  return { ...variables, variables };
}

export async function POST(req: Request) {
  try {
    const unauthorized = checkAuth(req);
    if (unauthorized) return unauthorized;

    console.log('[Sarvam Webhook] Received on-start trigger from Sarvam...');
    return NextResponse.json(buildPayload());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Sarvam Webhook] Error:', message);
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}

// Some setups probe the webhook with GET; return the same payload for easy testing.
export async function GET(req: Request) {
  const unauthorized = checkAuth(req);
  if (unauthorized) return unauthorized;
  return NextResponse.json(buildPayload());
}
