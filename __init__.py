from .nodes import HezlKSamplerPreset
from . import server  # 导入即触发 @PromptServer.instance.routes 装饰器注册

NODE_CLASS_MAPPINGS = {
    "Hezl-KSamplerPreset": HezlKSamplerPreset,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "Hezl-KSamplerPreset": "Hezl KSampler Preset",
}

WEB_DIRECTORY = "./js"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
