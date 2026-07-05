import json
from aiohttp import web
from server import PromptServer
from . import preset_manager

routes = PromptServer.instance.routes


@routes.get("/hezl_ksampler/list")
async def list_presets(request):
    return web.json_response({"presets": preset_manager.list_preset_names()})


@routes.get("/hezl_ksampler/get")
async def get_preset(request):
    name = request.query.get("name", "")
    data = preset_manager.load_preset(name)
    if data is None:
        return web.json_response({"error": "预设不存在"}, status=404)
    return web.json_response(data)


@routes.post("/hezl_ksampler/save")
async def save_preset(request):
    body = await request.json()
    name = body.get("name", "").strip()
    params = body.get("params", {})
    if not name:
        return web.json_response({"error": "预设名不能为空"}, status=400)
    existed = preset_manager.load_preset(name) is not None
    data = preset_manager.save_preset(name, params)
    return web.json_response({"preset": data, "existed": existed, "presets": preset_manager.list_preset_names()})


@routes.post("/hezl_ksampler/delete")
async def delete_preset(request):
    body = await request.json()
    name = body.get("name", "").strip()
    ok = preset_manager.delete_preset(name)
    return web.json_response({"ok": ok, "presets": preset_manager.list_preset_names()})
