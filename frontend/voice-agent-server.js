import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { createClient } from '@deepgram/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const fastify = Fastify({ logger: true });
fastify.register(fastifyWebsocket);

// Initialize APIs
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const PORT = process.env.VOICE_PORT || 8080;

// Read the scenario from the file saved by Next.js UI
function getScenario() {
  const filePath = path.join(process.cwd(), 'current_scenario.json');
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return data.scenarioPrompt || "You are a customer.";
  }
  return "You are a candidate looking for a job. Keep your answers extremely short.";
}

fastify.register(async function (fastify) {
  // HTTP Endpoint for Twilio Webhook
  fastify.all('/incoming-call', async (request, reply) => {
    console.log('[Twilio] Incoming call received!');
    const host = request.headers.host;
    
    // Generate TwiML to connect the call to our WebSocket stream
    const twiml = `
      <Response>
        <Say voice="Polly.Aditi">Connecting you to the candidate.</Say>
        <Connect>
          <Stream url="wss://${host}/media-stream" />
        </Connect>
      </Response>
    `;
    
    reply.type('text/xml').send(twiml);
  });

  fastify.get('/media-stream', { websocket: true }, (connection, req) => {
    console.log('[WebSocket] Call connected!');
    const ws = connection.socket;
    let streamSid = null;
    
    // Initialize Deepgram STT
    const deepgramLive = deepgram.listen.live({
      model: "nova-2",
      language: "en-IN", // Hinglish / Indian English
      smart_format: true,
      encoding: "mulaw",
      sample_rate: 8000,
      channels: 1,
      endpointing: 500, // Trigger response after 500ms of silence
    });

    deepgramLive.addListener('open', () => console.log('[Deepgram] STT Connection Opened'));
    deepgramLive.addListener('error', (err) => console.error('[Deepgram] Error:', err));

    // Handle incoming audio from the phone provider (Twilio/Plivo/Exotel)
    ws.on('message', async (message) => {
      const msg = JSON.parse(message);
      
      // Handle standard Media Stream start event
      if (msg.event === 'start') {
        streamSid = msg.start.streamSid;
        console.log(`[Media] Stream started: ${streamSid}`);
      }
      
      // Handle audio chunks
      if (msg.event === 'media' && deepgramLive.getReadyState() === 1) {
        const payload = Buffer.from(msg.media.payload, 'base64');
        deepgramLive.send(payload);
      }
    });

    // When Deepgram detects speech and finishes a sentence
    deepgramLive.addListener('Results', async (data) => {
      const transcript = data.channel.alternatives[0].transcript;
      if (transcript && data.is_final) {
        console.log(`[User (Neha)]: ${transcript}`);
        
        // 1. Send Transcript to Gemini
        const scenario = getScenario();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        try {
          const result = await model.generateContent({
            contents: [
              { role: "user", parts: [{ text: `System: ${scenario}\n\nRecruiter says: ${transcript}` }] }
            ],
            generationConfig: {
              maxOutputTokens: 100, // Keep responses short
              temperature: 0.7,
            }
          });
          
          const aiResponseText = result.response.text();
          console.log(`[Simulator Agent]: ${aiResponseText}`);
          
          // 2. Convert Gemini Text to Speech using Deepgram Aura (optimized for phone calls)
          const ttsResponse = await fetch('https://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=mulaw&sample_rate=8000', {
            method: 'POST',
            headers: {
              'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: aiResponseText })
          });
          
          if (ttsResponse.ok) {
            const arrayBuffer = await ttsResponse.arrayBuffer();
            const audioBuffer = Buffer.from(arrayBuffer);
            
            // 3. Send audio back to the phone call
            const payload = audioBuffer.toString('base64');
            const mediaMessage = {
              event: 'media',
              streamSid: streamSid,
              media: { payload: payload }
            };
            ws.send(JSON.stringify(mediaMessage));
          } else {
             console.error("[TTS] Failed to generate audio");
          }
          
        } catch (e) {
          console.error('[Gemini/TTS Error]', e);
        }
      }
    });

    ws.on('close', () => {
      console.log('[WebSocket] Call disconnected.');
      deepgramLive.finish();
    });
  });
});

fastify.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`[Voice Server] Listening on ${address}`);
  console.log(`[Voice Server] WebSocket URL: ws://localhost:${PORT}/media-stream`);
});
