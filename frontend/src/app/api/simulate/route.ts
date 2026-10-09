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

    console.log(`[Simulator] Pushing new scenario to Python Backend...`);

    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8080';
    
    // Forward the prompt to the backend
    try {
      const response = await fetch(`${backendUrl}/update-scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioPrompt }),
      });
      if (!response.ok) {
        throw new Error('Backend returned error');
      }
    } catch (err) {
      console.warn('[Warning] Could not reach Python backend. Ensure it is running on 8080.', err);
    }

    console.log(`[Simulator] Scenario updated on backend.`);

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
