import comfy
import comfy.sample
from nodes import common_ksampler  # 复用原版 KSampler 的采样逻辑，行为与原版完全一致
from .preset_manager import list_preset_names

PRESET_NONE = "(无预设)"


class HezlKSamplerPreset:
    @classmethod
    def INPUT_TYPES(cls):
        # 初始列表读取一次；后续由前端 JS 调 /hezl_ksampler/list 动态刷新
        names = list_preset_names()
        options = [PRESET_NONE] + names
        return {
            "required": {
                "preset_name": (options, {"default": PRESET_NONE}),
                "model": ("MODEL",),
                "positive": ("CONDITIONING",),
                "negative": ("CONDITIONING",),
                "latent_image": ("LATENT",),
                "seed": ("INT", {"default": 0, "min": 0, "max": 0xffffffffffffffff, "control_after_generate": True}),
                "steps": ("INT", {"default": 20, "min": 1, "max": 10000}),
                "cfg": ("FLOAT", {"default": 8.0, "min": 0.0, "max": 100.0, "step": 0.1, "round": 0.01}),
                "sampler_name": (comfy.samplers.SAMPLER_NAMES,),
                "scheduler": (comfy.samplers.SCHEDULER_NAMES,),
                "denoise": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01}),
            }
        }

    RETURN_TYPES = ("LATENT",)
    FUNCTION = "sample"
    CATEGORY = "Hezl-Node/采样器"

    def sample(self, preset_name, model, positive, negative, latent_image,
               seed, steps, cfg, sampler_name, scheduler, denoise):
        # preset_name 仅用于工作流持久化与前端联动，采样时忽略
        # 直接调用原版 KSampler 使用的 common_ksampler，行为与原版完全一致
        return common_ksampler(
            model, seed, steps, cfg, sampler_name, scheduler,
            positive, negative, latent_image, denoise=denoise
        )
