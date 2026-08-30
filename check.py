import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
pipe_files = [
    ROOT / "deduction_defender_chat.pipe",
    ROOT / "deduction_defender_upload.pipe",
]

for pipe_file in pipe_files:
    data = json.loads(pipe_file.read_text(encoding="utf-8"))
    required = ["components", "project_id", "viewport", "version"]
    missing = [key for key in required if key not in data]
    if missing:
        raise ValueError(f"{pipe_file.name} is missing: {missing}")
    if data["version"] != 1:
        raise ValueError(f"{pipe_file.name} has invalid version: {data['version']}")
    print(f"{pipe_file.name}: valid RocketRide pipeline JSON")

print("Deduction Defender prototype setup looks valid.")
