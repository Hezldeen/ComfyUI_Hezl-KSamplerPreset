import os
import json
from datetime import datetime

# 插件根目录 = 本文件所在目录（preset_manager.py 在根目录）
PRESET_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Preset")

# 预设涵盖的 6 个参数（顺序仅用于 JSON 美观）
PRESET_PARAMS = ["seed", "steps", "cfg", "sampler_name", "scheduler", "denoise"]


def _ensure_dir():
    os.makedirs(PRESET_DIR, exist_ok=True)


def _path(name: str) -> str:
    # 防止路径穿越：仅允许文件名，不含 / \ : 且不以 . 开头
    if not name or any(c in name for c in r'\/:') or name.startswith('.'):
        raise ValueError(f"非法预设名: {name!r}")
    return os.path.join(PRESET_DIR, f"{name}.json")


def list_preset_names() -> list:
    _ensure_dir()
    if not os.path.isdir(PRESET_DIR):
        return []
    return sorted(
        f[:-5] for f in os.listdir(PRESET_DIR)
        if f.endswith(".json") and os.path.isfile(os.path.join(PRESET_DIR, f))
    )


def load_preset(name: str):
    try:
        with open(_path(name), "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, ValueError):
        return None


def save_preset(name: str, params: dict) -> dict:
    _ensure_dir()
    existing = load_preset(name)
    now = datetime.now().isoformat(timespec="seconds")
    data = {
        "name": name,
        "params": {k: params.get(k) for k in PRESET_PARAMS},
        "created_at": existing["created_at"] if existing else now,
        "updated_at": now,
    }
    with open(_path(name), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return data


def delete_preset(name: str) -> bool:
    try:
        os.remove(_path(name))
        return True
    except (FileNotFoundError, ValueError):
        return False
