import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    console.log(`[Sarvam Webhook] Received On-Start trigger from Sarvam...`);

    const filePath = path.join(process.cwd(), 'current_scenario.json');
    
    // Default fallback scenario if the file doesn't exist yet
    let scenarioPrompt = "You are a customer. Act normally.";
    
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed.scenarioPrompt) {
        scenarioPrompt = parsed.scenarioPrompt;
      }
    }

    console.log(`[Sarvam Webhook] Injecting scenario: ${scenarioPrompt.substring(0, 50)}...`);

    // We return exactly the JSON format Sarvam expects for variable injection
    return NextResponse.json({
      scenario_prompt: scenarioPrompt
    });

  } catch (error: any) {
    console.error('[Sarvam Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed.' },
      { status: 500 }
    );
  }
}
