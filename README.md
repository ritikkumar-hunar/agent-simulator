# Call Simulator

Set a customer **persona** from the web UI, then have your real agent (from your
other portal) dial your Sarvam number. Sarvam answers in character using the
persona you set — no dashboard edits, and no need to recreate an agent for every
scenario.

## How it works

Sarvam has **no public REST API to author or update an agent's prompt** — agent
authoring only exists in the dashboard Canvas/Genie or over the MCP server. So
instead of recreating an agent per scenario, you create **one reusable agent
once**, and swap its persona per call using Sarvam's dynamic-variables webhook:

```
UI (set persona)
  -> POST /api/simulate      saves the active persona to current_scenario.json
Real agent dials Sarvam number (inbound)
  -> Sarvam calls /api/sarvam-webhook on conversation start
  -> webhook returns { scenario_prompt, expected_behaviors }
  -> agent plays that persona for this call
```

Setting a new persona in the UI applies to the **next** inbound call.

## One-time Sarvam setup

1. **Create one agent** in the Sarvam dashboard (Build → Agents).
2. In its **Instructions / system prompt**, use variables instead of a fixed
   persona, e.g.:

   ```
   {{scenario_prompt}}

   Expected behaviours to keep in mind:
   {{expected_behaviors}}
   ```

3. Configure the agent's **on-start dynamic-variables webhook** to call this
   app's webhook and map the returned fields onto `scenario_prompt` and
   `expected_behaviors`:

   ```
   https://<your-public-host>/api/sarvam-webhook
   ```

   During local development, expose your dev server with a tunnel (ngrok,
   Cloudflare Tunnel, etc.) and use that HTTPS URL.
4. Deploy the agent to your Sarvam **phone number** for inbound calls.

The webhook returns the fields both at the top level and under a `variables`
object, so it works regardless of how your agent reads dynamic variables. If
your prompt uses different variable names, rename the keys in
`src/app/api/sarvam-webhook/route.ts`.

## Run locally

```bash
npm run dev
```

Open http://localhost:3000, write a persona, and click **Set Agent Persona**.
Verify the webhook returns your persona:

```bash
curl http://localhost:3000/api/sarvam-webhook
```

## API

- `POST /api/simulate` — set the active persona.
  Body: `{ "scenarioPrompt": string, "expectedBehaviors"?: string }`
- `GET /api/simulate` — read the active persona (used by the UI on load).
- `GET|POST /api/sarvam-webhook` — returns the active persona as Sarvam
  variables. Point your agent's on-start webhook here.

The active persona is stored in `current_scenario.json` at the project root.
