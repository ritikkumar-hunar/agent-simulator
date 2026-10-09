'use client';

import { useState } from 'react';
import { Settings, Play, CheckCircle2, XCircle, Loader2, Sparkles, AlertCircle } from 'lucide-react';

export default function Home() {
  const [scenarioPrompt, setScenarioPrompt] = useState('');
  const [expectedBehaviors, setExpectedBehaviors] = useState('');
  
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [results, setResults] = useState<{
    transcript: Array<{ speaker: string; text: string }>;
    score: number;
    feedback: string;
    behaviors: Array<{ behavior: string; passed: boolean; note: string }>;
  } | null>(null);

  const createSimulator = async () => {
    if (!scenarioPrompt) {
      setErrorMessage('Please provide a Scenario Prompt.');
      return;
    }
    
    setStatus('running');
    setErrorMessage('');
    
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioPrompt,
          expectedBehaviors,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create simulator agent');
      }
      
      const data = await res.json();
      setResults(data);
      setStatus('completed');
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred');
      setStatus('error');
    }
  };

  return (
    <main className="container mx-auto max-w-5xl px-4 py-12">
      {/* Header */}
      <div className="mb-12 text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 bg-blue-900/40 rounded-2xl mb-4 border border-blue-500/30">
          <Sparkles className="w-8 h-8 text-blue-400" />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
          Voice Agent Simulator
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          Deploy a dynamic customer persona to your Sarvam phone number in seconds. 
          Your real agent can then dial in to test the scenario.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Configuration */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Scenario Panel */}
          <div className="glass-panel rounded-2xl p-6 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
            
            <div className="flex items-center gap-2 border-b border-white/10 pb-4">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">Simulation Scenario</h2>
            </div>
            
            <div className="space-y-4 relative z-10">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Customer Persona & Prompt</label>
                <textarea 
                  rows={6}
                  value={scenarioPrompt}
                  onChange={(e) => setScenarioPrompt(e.target.value)}
                  placeholder="e.g. You are an angry customer trying to cancel a subscription. Do not accept the first retention offer."
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 transition-all resize-none"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Expected Behaviors (Optional)</label>
                <textarea 
                  rows={4}
                  value={expectedBehaviors}
                  onChange={(e) => setExpectedBehaviors(e.target.value)}
                  placeholder="1. Agent should remain calm&#10;2. Agent should offer exactly one discount"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 transition-all resize-none"
                />
              </div>
            </div>

            <button
              onClick={createSimulator}
              disabled={status === 'running'}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {status === 'running' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Deploying to Sarvam...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  Deploy Simulator Agent
                </>
              )}
            </button>
            
            {errorMessage && (
              <div className="mt-4 p-4 rounded-xl bg-red-950/50 border border-red-500/20 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-200">{errorMessage}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-7">
          <div className="glass-panel rounded-2xl p-6 h-full min-h-[600px] flex flex-col">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 border-b border-white/10 pb-4 text-white">
              Agent Status & Results
            </h2>

            {status === 'idle' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-50">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <Settings className="w-6 h-6 ml-1 text-white" />
                </div>
                <p className="text-lg font-medium text-white">No agent deployed</p>
                <p className="text-sm text-slate-400 mt-2 max-w-xs">
                  Enter your persona and deploy. Your real agent can then dial your Sarvam number to interact with it.
                </p>
              </div>
            )}

            {status === 'running' && (
              <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-white/10 border-t-blue-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Settings className="w-6 h-6 text-blue-500 animate-pulse" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-medium text-white">Provisioning on Sarvam...</p>
                  <p className="text-sm text-slate-400 max-w-[250px] mx-auto">
                    Creating the agent and assigning it to your Sarvam phone number.
                  </p>
                </div>
              </div>
            )}

            {status === 'completed' && results && (
              <div className="flex-1 flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Score Card / Status */}
                <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-blue-950/30 border border-blue-500/20 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Simulator Deployed!</h3>
                  <p className="text-slate-300 max-w-md">
                    The simulator agent has been created and assigned to your Sarvam number. 
                    <br/><br/>
                    <strong className="text-white">Action Required:</strong> Trigger your real agent to make an outbound call to your Sarvam number now to test the scenario.
                  </p>
                </div>

                {/* Expected Behaviors mapped for later */}
                {results.behaviors.length > 0 && (
                  <div className="space-y-3 opacity-50 pointer-events-none mt-8">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Evaluation Criteria (Awaiting Call)</h3>
                    <div className="space-y-2">
                      {results.behaviors.map((b, i) => (
                        <div key={i} className="flex gap-3 p-4 rounded-xl bg-black/40 border border-white/5">
                          <Settings className="w-5 h-5 text-slate-500 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-slate-200">{b.behavior}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
