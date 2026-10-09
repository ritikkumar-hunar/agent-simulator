import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { scenarioPrompt, expectedBehaviors } = body;

    if (!scenarioPrompt) {
      return NextResponse.json(
        { error: 'Missing Scenario Prompt' },
        { status: 400 }
      );
    }

    console.log(`[Simulator] Saving new scenario for Inbound Webhook...`);

    // Save the prompt to a local file so the webhook can read it when Sarvam calls
    const filePath = path.join(process.cwd(), 'current_scenario.json');
    fs.writeFileSync(filePath, JSON.stringify({
      scenarioPrompt,
      expectedBehaviors,
      timestamp: new Date().toISOString()
    }, null, 2));

    console.log(`[Simulator] Scenario saved successfully.`);

    // Return the behaviors so the UI can list them for the human evaluator to check while the call happens.
    const mockBehaviors = expectedBehaviors 
      ? expectedBehaviors.split('\n').filter((b: string) => b.trim().length > 0).map((b: string) => ({
          behavior: b,
          passed: false,
          note: ""
        }))
      : [];

    return NextResponse.json({
      transcript: [],
      score: 0,
      feedback: "Scenario Saved! Awaiting Call... Please trigger your real agent to call the Sarvam number.",
      behaviors: mockBehaviors,
    });

  } catch (error: any) {
    console.error('Simulation Error:', error);
    return NextResponse.json(
      { error: 'Failed to deploy simulator. Check server logs.' },
      { status: 500 }
    );
  }
}
