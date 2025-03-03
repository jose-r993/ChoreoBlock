import essentia.standard as es
import json
from fastapi import FastAPI, UploadFile, File
import numpy as np
import tempfile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def detect_bpm(file_path):
    # Load the audio file
    audio = es.MonoLoader(filename=file_path)()
    
    # Compute BPM
    rhythm_extractor = es.RhythmExtractor2013(method="multifeature")
    bpm, beats, _, _, _ = rhythm_extractor(audio)
    
    return {
        "bpm": round(bpm, 2),
        "beat_timestamps": beats.tolist()
    }

@app.post("/analyze-bpm/")
async def analyze_bpm(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=True, suffix=".mp3") as temp:
        temp.write(await file.read())
        temp.flush()
        result = detect_bpm(temp.name)
    return result
