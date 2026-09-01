import asyncio
import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from rocketride import RocketRideClient
except Exception:
    RocketRideClient = None

load_dotenv()

app = FastAPI(title="Deduction Defender API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PIPE_DIR = Path(__file__).resolve().parent.parent
CHAT_PIPE = PIPE_DIR / "deduction_defender_chat.pipe"
UPLOAD_PIPE = PIPE_DIR / "deduction_defender_upload.pipe"
PIPE_LOCK = asyncio.Lock()


class ChatRequest(BaseModel):
    question: str


class ResultResponse(BaseModel):
    ok: bool
    pipeline: str
    answer: str
    metadata: dict


def extract_rocketride_answer(response):
    if not isinstance(response, dict):
        return "No detailed analysis returned by RocketRide."

    result_types = response.get("result_types") or {}
    for key, lane_type in result_types.items():
        if lane_type == "answers":
            answers = response.get(key, [])
            if isinstance(answers, list) and answers:
                first = answers[0]
                if isinstance(first, str) and first.strip():
                    return first.strip()

    for key in ("answer", "answers", "deduction_review", "analysis", "result", "output", "text"):
        value = response.get(key)
        if isinstance(value, list) and value:
            first = value[0]
            if isinstance(first, str) and first.strip():
                return first.strip()
        if isinstance(value, str) and value.strip():
            return value.strip()

    return "No detailed analysis returned by RocketRide."


async def call_rocketride_pipeline(pipe_path: str, payload: str, file_name: Optional[str] = None):
    if RocketRideClient is None:
        raise HTTPException(status_code=500, detail="rocketride package is not installed")

    uri = os.getenv("ROCKETRIDE_URI")
    api_key = os.getenv("ROCKETRIDE_APIKEY")
    gemini_key = os.getenv("ROCKETRIDE_GEMINI_KEY")
    if not uri or not api_key:
        raise HTTPException(status_code=500, detail="ROCKETRIDE_URI and ROCKETRIDE_APIKEY are required")
    if not gemini_key:
        raise HTTPException(status_code=500, detail="ROCKETRIDE_GEMINI_KEY is required for Gemini-powered pipeline execution")

    async with PIPE_LOCK:
        client = RocketRideClient(uri=uri, auth=api_key)
        token = None
        try:
            await client.connect()
            result = await client.use(
                filepath=pipe_path,
                env={"ROCKETRIDE_GEMINI_KEY": gemini_key},
            )
            token = result.get("token") if isinstance(result, dict) else None

            if not token:
                raise HTTPException(status_code=500, detail="RocketRide pipeline did not return a token")

            send_result = await client.send(token, payload)
            answer = extract_rocketride_answer(send_result)
            status = await client.get_task_status(token)

            if file_name:
                metadata = {"file_name": file_name, "status": status}
            else:
                metadata = {"status": status}

            return {"ok": True, "token": token, "answer": answer, "metadata": metadata}
        finally:
            # Always terminate the pipeline task before disconnecting.
            # use() starts a pipeline keyed by the .pipe file's project_id/source,
            # not by the websocket connection - disconnect() alone leaves it
            # marked "running" server-side and the next use() call for the same
            # pipe file fails with "Pipeline is already running."
            if token:
                try:
                    await client.terminate(token)
                except Exception:
                    # Don't let cleanup failure mask the real result/error
                    pass
            await client.disconnect()


@app.get("/health")
def health():
    return {"ok": True, "service": "deduction-defender-api"}


@app.post("/api/chat", response_model=ResultResponse)
async def chat_route(payload: ChatRequest):
    try:
        pipe_path = str(CHAT_PIPE)
        result = await call_rocketride_pipeline(pipe_path, payload.question)
        return {
            "ok": True,
            "pipeline": "deduction_defender_chat.pipe",
            "answer": result.get("answer") or "No detailed analysis returned by RocketRide.",
            "metadata": result["metadata"],
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/upload")
async def upload_route(file: UploadFile = File(...), note: str = Form("")):
    if not file.filename:
        raise HTTPException(status_code=400, detail="A file is required")

    try:
        contents = await file.read()
        text = contents.decode("utf-8", errors="ignore")
        if not text.strip():
            text = f"Uploaded file: {file.filename}. Analyst note: {note}"

        result = await call_rocketride_pipeline(str(UPLOAD_PIPE), text, file_name=file.filename)
        return {
            "ok": True,
            "pipeline": "deduction_defender_upload.pipe",
            "message": "Upload processed and reviewed.",
            "answer": result.get("answer") or "No detailed analysis returned by RocketRide.",
            "metadata": result["metadata"],
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/pipelines")
def pipeline_names():
    return {
        "pipelines": [
            "deduction_defender_chat.pipe",
            "deduction_defender_upload.pipe",
        ]
    }