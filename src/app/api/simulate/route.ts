import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Sets the active persona for the simulator.
 *
 * We do NOT create or call anything on Sarvam here. Sarvam has no public REST
 * endpoint to author/update an agent's prompt, so instead we persist the active
 * scenario and let the on-start webhook (src/app/api/sarvam-webhook) inject it
 * into your single reusable Sarvam agent whenever your real agent dials the
 * Sarvam number (inbound). Setting a new prompt here immediately applies to the
 * next inbound call — no dashboard edits, no new agent each time.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { scenarioPrompt, expectedBehaviors } = body ?? {};

    if (!scenarioPrompt || typeof scenarioPrompt !== 'string' || !scenarioPrompt.trim()) {
      return NextResponse.json({ error: 'Missing Scenario Prompt' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'current_scenario.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify(
        {
          scenarioPrompt: scenarioPrompt.trim(),
          expectedBehaviors: typeof expectedBehaviors === 'string' ? expectedBehaviors : '',
          timestamp: new Date().toISOString(),
        },
        null,
        2
      )
    );

    const behaviors =
      typeof expectedBehaviors === 'string'
        ? expectedBehaviors
            .split('\n')
            .map((b: string) => b.trim())
            .filter((b: string) => b.length > 0)
            .map((b: string) => ({ behavior: b, passed: false, note: '' }))
        : [];

    return NextResponse.json({
      feedback:
        'Persona is live. The next inbound call to your Sarvam number will use this prompt. ' +
        'Trigger your real agent to dial in whenever you are ready.',
      behaviors,
      activePrompt: scenarioPrompt.trim(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Set-persona error:', message);
    return NextResponse.json(
      { error: message || 'Failed to set the persona. Check server logs.' },
      { status: 500 }
    );
  }
}

/**
 * Returns the currently active persona so the UI can show what is live.
 */
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'current_scenario.json');
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ scenarioPrompt: '', expectedBehaviors: '', timestamp: null });
    }
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return NextResponse.json({
      scenarioPrompt: parsed.scenarioPrompt ?? '',
      expectedBehaviors: parsed.expectedBehaviors ?? '',
      timestamp: parsed.timestamp ?? null,
    });
  } catch {
    return NextResponse.json({ scenarioPrompt: '', expectedBehaviors: '', timestamp: null });
  }
}
