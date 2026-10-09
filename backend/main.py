import asyncio
import json
import os
import base64
from fastapi import FastAPI, WebSocket, Request, Response, Body
import google.generativeai as genai
import httpx
import websockets
from dotenv import load_dotenv

# Load the env variables from the backend directory
load_dotenv()

app = FastAPI()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-flash')

# In-memory store for the current scenario
current_scenario_prompt = "You are a candidate looking for a job. Keep your answers extremely short and in Hinglish."

@app.post("/update-scenario")
async def update_scenario(payload: dict = Body(...)):
    global current_scenario_prompt
    new_prompt = payload.get("scenarioPrompt")
    if new_prompt:
        current_scenario_prompt = new_prompt
        print(f"[Backend] Updated scenario to: {current_scenario_prompt}")
        return {"status": "success", "message": "Scenario updated"}
    return {"status": "error", "message": "No prompt provided"}

@app.post("/incoming-call")
async def incoming_call(request: Request):
    print("[Twilio/Exotel] Incoming call received!")
    host = request.headers.get("host")
    
    twiml = f"""
    <Response>
        <Say voice="Polly.Aditi">Connecting you to the candidate.</Say>
        <Connect>
            <Stream url="wss://{host}/media-stream" />
        </Connect>
    </Response>
    """
    return Response(content=twiml, media_type="text/xml")

@app.websocket("/media-stream")
async def media_stream(websocket: WebSocket):
    await websocket.accept()
    print("[WebSocket] Call connected!")
    
    stream_sid = None
    deepgram_ws = None
    
    async def get_tts_audio(text: str):
        url = "https://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=mulaw&sample_rate=8000"
        headers = {
            "Authorization": f"Token {os.getenv('DEEPGRAM_API_KEY')}",
            "Content-Type": "application/json"
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, headers=headers, json={"text": text}, timeout=10.0)
            if resp.status_code == 200:
                return resp.content
        return None

    # URL for raw Deepgram WebSocket
    dg_url = "wss://api.deepgram.com/v1/listen?model=nova-2&language=en-IN&encoding=mulaw&sample_rate=8000&channels=1&endpointing=500&smart_format=true"
    
    try:
        deepgram_ws = await websockets.connect(
            dg_url,
            extra_headers={"Authorization": f"Token {os.getenv('DEEPGRAM_API_KEY')}"}
        )
        print("[Deepgram] Connection established")
    except Exception as e:
        print(f"[Deepgram] Failed to start connection: {e}")
        await websocket.close()
        return

    # Task to receive from Deepgram and process text
    async def receive_from_deepgram():
        try:
            while True:
                msg = await deepgram_ws.recv()
                data = json.loads(msg)
                
                if data.get("type") == "Results":
                    is_final = data.get("is_final", False)
                    alternatives = data.get("channel", {}).get("alternatives", [])
                    if not alternatives:
                        continue
                        
                    sentence = alternatives[0].get("transcript", "")
                    if len(sentence) == 0:
                        continue
                        
                    if is_final:
                        print(f"[User (Neha)]: {sentence}")
                        
                        try:
                            prompt = f"System: {current_scenario_prompt}\\n\\nRecruiter says: {sentence}"
                            response = model.generate_content(prompt)
                            ai_text = response.text
                            print(f"[Simulator Agent]: {ai_text}")
                            
                            audio_bytes = await get_tts_audio(ai_text)
                            if audio_bytes and stream_sid:
                                payload = base64.b64encode(audio_bytes).decode('utf-8')
                                media_message = {
                                    "event": "media",
                                    "streamSid": stream_sid,
                                    "media": {"payload": payload}
                                }
                                await websocket.send_text(json.dumps(media_message))
                                
                        except Exception as e:
                            print(f"[LLM/TTS Error] {e}")
        except websockets.exceptions.ConnectionClosed:
            print("[Deepgram] Connection closed")
        except Exception as e:
            print(f"[Deepgram Error] {e}")

    # Start the background task
    asyncio.create_task(receive_from_deepgram())

    try:
        while True:
            message = await websocket.receive_text()
            data = json.loads(message)
            
            if data['event'] == 'start':
                stream_sid = data['start']['streamSid']
                print(f"[Media] Stream started: {stream_sid}")
                
            elif data['event'] == 'media':
                audio_payload = base64.b64decode(data['media']['payload'])
                await deepgram_ws.send(audio_payload)
                
            elif data['event'] == 'stop':
                print("[Media] Stream stopped by Twilio")
                break
                
    except Exception as e:
        print(f"[WebSocket Error] {e}")
    finally:
        print("[WebSocket] Closing connections")
        if deepgram_ws:
            await deepgram_ws.close()
