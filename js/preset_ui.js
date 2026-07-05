import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const NODE_CLASS = "Hezl-KSamplerPreset";
const PRESET_NONE = "(无预设)";

app.registerExtension({
    name: "Hezl.KSamplerPreset",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== NODE_CLASS) return;

        const origOnCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            origOnCreated?.apply(this, arguments);
            const node = this;

            const presetWidget = node.widgets?.find(w => w.name === "preset_name");
            if (!presetWidget) return;

            // 添加「保存预设」「删除预设」按钮
            const saveBtn = node.addWidget("button", "💾 保存预设", null, () => onSave(node));
            const delBtn = node.addWidget("button", "🗑️ 删除预设", null, () => onDelete(node));

            // 将 preset_name 移到参数区之后、按钮之前（节点底部）
            const widgets = node.widgets;
            const idxPreset = widgets.indexOf(presetWidget);
            widgets.splice(idxPreset, 1);
            widgets.splice(widgets.indexOf(saveBtn), 0, presetWidget);

            // COMBO 联动：选择预设时拉取参数并更新采样 widgets
            const origCallback = presetWidget.callback;
            presetWidget.callback = async function (...args) {
                origCallback?.apply(this, args);
                await applyPreset(node);
            };

            // 初始加载时若 preset_name 非「无预设」，自动应用一次
            if (presetWidget.value && presetWidget.value !== PRESET_NONE) {
                applyPreset(node);
            }
        };
    },

    loadedGraphNode(node) {
        if (node.comfyClass === NODE_CLASS) {
            refreshPresetList(node);
        }
    },
});

// 拉取预设列表并更新 COMBO 选项（保留当前值）
async function refreshPresetList(node) {
    const presetWidget = node.widgets?.find(w => w.name === "preset_name");
    if (!presetWidget) return;
    try {
        const resp = await api.fetchApi("/hezl_ksampler/list");
        const data = await resp.json();
        const newOptions = [PRESET_NONE, ...(data.presets || [])];
        presetWidget.options.values = newOptions;
        // 若当前值不在新列表中，回退到「无预设」
        if (!newOptions.includes(presetWidget.value)) {
            presetWidget.value = PRESET_NONE;
        }
    } catch (e) {
        console.warn("[Hezl-KSamplerPreset] 刷新预设列表失败", e);
    }
}

// 应用预设：拉取预设数据并更新采样参数 widgets
async function applyPreset(node) {
    const presetWidget = node.widgets.find(w => w.name === "preset_name");
    const name = presetWidget.value;

    if (!name || name === PRESET_NONE) {
        return;
    }
    try {
        const resp = await api.fetchApi(`/hezl_ksampler/get?name=${encodeURIComponent(name)}`);
        if (!resp.ok) {
            app.extensionManager.toast.add({ severity: "warn", summary: "预设加载失败", detail: name, life: 3000 });
            return;
        }
        const data = await resp.json();
        const params = data.params || {};
        // 更新 6 个采样参数 widgets
        for (const key of ["seed", "steps", "cfg", "sampler_name", "scheduler", "denoise"]) {
            const w = node.widgets.find(w => w.name === key);
            if (w && params[key] !== undefined) w.value = params[key];
        }
        app.extensionManager.toast.add({ severity: "success", summary: "已应用预设", detail: name, life: 2000 });
    } catch (e) {
        console.error("[Hezl-KSamplerPreset] 应用预设失败", e);
    }
}

// 保存预设：弹窗输入名称，收集当前参数，POST 到后端
async function onSave(node) {
    const presetWidget = node.widgets.find(w => w.name === "preset_name");
    const currentName = (presetWidget.value && presetWidget.value !== PRESET_NONE) ? presetWidget.value : "";

    const name = await app.extensionManager.dialog.prompt({
        title: "保存预设",
        message: "请输入预设名称：",
        defaultValue: currentName,
    });
    if (!name || !name.trim()) return;
    const trimmed = name.trim();

    // 检查是否已存在（让用户确认覆盖）
    const checkResp = await api.fetchApi(`/hezl_ksampler/get?name=${encodeURIComponent(trimmed)}`);
    if (checkResp.ok) {
        const ok = await app.extensionManager.dialog.confirm({
            title: "预设已存在",
            message: `预设「${trimmed}」已存在，是否覆盖更新？`,
        });
        if (!ok) return;
    }

    const params = {};
    for (const key of ["seed", "steps", "cfg", "sampler_name", "scheduler", "denoise"]) {
        const w = node.widgets.find(w => w.name === key);
        if (w) params[key] = w.value;
    }

    const resp = await api.fetchApi("/hezl_ksampler/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, params }),
    });
    const data = await resp.json();
    if (data.preset) {
        // 刷新 COMBO 选项并选中刚保存的预设
        presetWidget.options.values = [PRESET_NONE, ...(data.presets || [])];
        presetWidget.value = trimmed;
        app.extensionManager.toast.add({ severity: "success", summary: "预设已保存", detail: trimmed, life: 2500 });
    }
}

// 删除预设：确认后 POST 到后端
async function onDelete(node) {
    const presetWidget = node.widgets.find(w => w.name === "preset_name");
    const name = presetWidget.value;
    if (!name || name === PRESET_NONE) {
        app.extensionManager.toast.add({ severity: "info", summary: "未选择预设", detail: "请先选择要删除的预设", life: 2500 });
        return;
    }
    const ok = await app.extensionManager.dialog.confirm({
        title: "删除预设",
        message: `确定删除预设「${name}」吗？此操作不可撤销。`,
    });
    if (!ok) return;

    const resp = await api.fetchApi("/hezl_ksampler/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
    });
    const data = await resp.json();
    if (data.ok) {
        presetWidget.options.values = [PRESET_NONE, ...(data.presets || [])];
        presetWidget.value = PRESET_NONE;
        app.extensionManager.toast.add({ severity: "success", summary: "预设已删除", detail: name, life: 2500 });
    } else {
        app.extensionManager.toast.add({ severity: "error", summary: "删除失败", detail: name, life: 3000 });
    }
}
