'use client';

import { useEffect, useState } from 'react';
import { Settings, CheckCircle2, Loader2, Sparkles, AlertCircle, Save, Phone } from 'lucide-react';

export default function Home() {
  const [scenarioPrompt, setScenarioPrompt] = useState('');
  const [expectedBehaviors, setExpectedBehaviors] = useState('');

  const [status, setStatus] = useState<'idle' | 'saving' | 'active' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeSince, setActiveSince] = useState<string | null>(null);
  const [results, setResults] = useState<{
    feedback: string;
    behaviors: Array<{ behavior: string; passed: boolean; note: string }>;
  } | null>(null);

  // Load whatever persona is currently live so the UI reflects the real state.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/simulate');
        if (!res.ok) return;
        const data = await res.json();
        if (data.scenarioPrompt) {
          setScenarioPrompt(data.scenarioPrompt);
          setExpectedBehaviors(data.expectedBehaviors ?? '');
          setActiveSince(data.timestamp ?? null);
          setStatus('active');
        }
      } catch {
        // non-fatal: start with an empty form
      }
    })();
  }, []);

  const setPersona = async () => {
    if (!scenarioPrompt.trim()) {
      setErrorMessage('Please provide a persona prompt.');
      return;
    }

    setStatus('saving');
    setErrorMessage('');

    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioPrompt, expectedBehaviors }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to set the persona');
      }

      const data = await res.json();
      setResults(data);
      setActiveSince(new Date().toISOString());
      setStatus('active');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred');
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
          Set the customer persona your Sarvam agent should play. Then have your real agent dial the
          Sarvam number — it answers in character, no dashboard edits required.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Configuration */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel rounded-2xl p-6 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

            <div className="flex items-center gap-2 border-b border-white/10 pb-4">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">Agent Persona</h2>
            </div>

            <div className="space-y-4 relative z-10">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Customer Persona &amp; Prompt</label>
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
              onClick={setPersona}
              disabled={status === 'saving'}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {status === 'saving' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Setting persona...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Set Agent Persona
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

        {/* Right Column: Status */}
        <div className="lg:col-span-7">
          <div className="glass-panel rounded-2xl p-6 h-full min-h-[600px] flex flex-col">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 border-b border-white/10 pb-4 text-white">
              Live Persona Status
            </h2>

            {status === 'idle' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-50">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <Settings className="w-6 h-6 ml-1 text-white" />
                </div>
                <p className="text-lg font-medium text-white">No persona set</p>
                <p className="text-sm text-slate-400 mt-2 max-w-xs">
                  Write a persona and set it. Your Sarvam agent will play it on the next inbound call.
                </p>
              </div>
            )}

            {status === 'saving' && (
              <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-white/10 border-t-blue-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Save className="w-6 h-6 text-blue-500 animate-pulse" />
                  </div>
                </div>
                <p className="text-lg font-medium text-white">Saving persona...</p>
              </div>
            )}

            {status === 'active' && (
              <div className="flex-1 flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-blue-950/30 border border-blue-500/20 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Persona is live</h3>
                  <p className="text-slate-300 max-w-md">
                    {results?.feedback ??
                      'The next inbound call to your Sarvam number will use this persona.'}
                  </p>
                  {activeSince && (
                    <p className="text-xs text-slate-500">
                      Set at {new Date(activeSince).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 p-4 rounded-xl bg-black/40 border border-white/5">
                  <Phone className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-300">
                    <strong className="text-white">Next step:</strong> trigger your real agent (from your
                    other portal) to call the Sarvam number. Sarvam&apos;s on-start webhook pulls this
                    persona in automatically.
                  </p>
                </div>

                {(results?.behaviors?.length ?? 0) > 0 && (
                  <div className="space-y-3 mt-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                      Evaluation Criteria
                    </h3>
                    <div className="space-y-2">
                      {results!.behaviors.map((b, i) => (
                        <div key={i} className="flex gap-3 p-4 rounded-xl bg-black/40 border border-white/5">
                          <Settings className="w-5 h-5 text-slate-500 shrink-0" />
                          <p className="text-sm font-medium text-slate-200">{b.behavior}</p>
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
