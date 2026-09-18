"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LayoutPage = void 0;
const csharp_1 = require("csharp");
const UiKit_1 = require("../UiKit");
const EditorService_1 = require("../../services/EditorService");
const Config_1 = require("../../core/Config");
const Api_1 = require("../../Api");
const ScanController_1 = require("../../services/ScanController");
class LayoutPage {
    constructor() {
        this.id = "layout";
        this.title = "布局模板";
    }
    build(content, width) {
        const col = new UiKit_1.Column(width, 6);
        const self = this;
        const cfg = Config_1.Config.config;
        const selection = (0, EditorService_1.getSelection)();
        const first = selection.length > 0 ? selection[0] : null;
        col.add((0, UiKit_1.createLabel)("固定位置模板（返回 / 主页 / 关闭等按钮的标准位置）", { size: 12, color: UiKit_1.COLORS.textDim, width: width, wrap: true }), 32);
        const btnSave = new UiKit_1.UiButton("将选中对象保存为新模板", {
            w: width, h: 26, bg: UiKit_1.COLORS.accent, hover: UiKit_1.COLORS.accentHover, color: "#fff",
            onClick: () => { self.savePreset(first); }
        });
        btnSave.setEnabled(!!first);
        col.add(btnSave.view, 26);
        if (!first) {
            col.add((0, UiKit_1.createLabel)("请先选中一个对象（如 Btn_FanHui）", { size: 11, color: UiKit_1.COLORS.textDim }), 15);
        }
        const presets = cfg.layoutPresets || [];
        col.add((0, UiKit_1.createLabel)(`已保存模板（${presets.length}）`, { size: 13, bold: true, color: UiKit_1.COLORS.text }), 20);
        if (presets.length == 0) {
            col.add((0, UiKit_1.createLabel)("暂无模板。\n用法：在一个标准页面中选中按钮 → 保存为模板 → 在其他页面选中同名按钮 → 应用模板。", { size: 11, color: UiKit_1.COLORS.textDim, width: width, wrap: true }), 48);
        }
        for (let i = 0; i < presets.length; i++) {
            const preset = presets[i];
            const box = new csharp_1.FairyGUI.GComponent();
            let y = 0;
            const title = (0, UiKit_1.createLabel)(preset.name, { size: 12, bold: true, color: UiKit_1.COLORS.text });
            title.SetXY(0, y);
            box.AddChild(title);
            y += 18;
            const detail = (0, UiKit_1.createLabel)(`X=${preset.x}  Y=${preset.y}  宽=${preset.width}  高=${preset.height}\npivot=(${preset.pivotX}, ${preset.pivotY})  anchor=${preset.anchor}${preset.note ? "\n" + preset.note : ""}`, { size: 11, color: UiKit_1.COLORS.textDim, width: width - 8, wrap: true });
            detail.SetXY(0, y);
            box.AddChild(detail);
            y += detail.height + 2;
            let statusText = "";
            let statusColor = UiKit_1.COLORS.textDim;
            if (first) {
                let curName = "";
                try {
                    curName = ("" + first.name).toLowerCase();
                }
                catch (e) { }
                if (curName.indexOf(preset.name.toLowerCase()) >= 0) {
                    let cx = 0, cy = 0;
                    try {
                        cx = first.x;
                        cy = first.y;
                    }
                    catch (e) { }
                    const match = Math.abs(cx - preset.x) < 0.51 && Math.abs(cy - preset.y) < 0.51;
                    statusText = match ? `当前选中对象位置一致（X=${cx} Y=${cy}）` : `当前选中对象：X=${cx} Y=${cy}（与模板不一致）`;
                    statusColor = match ? UiKit_1.COLORS.ok : UiKit_1.COLORS.warning;
                }
            }
            if (statusText) {
                const st = (0, UiKit_1.createLabel)(statusText, { size: 11, color: statusColor, width: width - 8, wrap: true });
                st.SetXY(0, y);
                box.AddChild(st);
                y += st.height + 2;
            }
            const btnApply = new UiKit_1.UiButton("应用到选中对象", {
                w: (width - 12) / 3, h: 22, size: 11,
                onClick: () => { self.applyPreset(preset, first); }
            });
            btnApply.setEnabled(!!first);
            const btnDelete = new UiKit_1.UiButton("删除", {
                w: (width - 12) / 3, h: 22, size: 11,
                onClick: () => {
                    (0, Api_1.confirm)(`删除模板「${preset.name}」？`, (ret) => {
                        if (ret != "yes")
                            return;
                        Config_1.Config.update(c => { c.layoutPresets.splice(c.layoutPresets.indexOf(preset), 1); });
                        ScanController_1.ScanController.notify();
                    });
                }
            });
            btnApply.view.SetXY(0, y);
            box.AddChild(btnApply.view);
            btnDelete.view.SetXY((width - 12) / 3 + 6, y);
            box.AddChild(btnDelete.view);
            y += 26;
            const line = (0, UiKit_1.createHLine)(width - 4);
            line.SetXY(0, y);
            box.AddChild(line);
            y += 1;
            box.SetSize(width, y);
            col.add(box, y);
        }
        col.finish();
        content.AddChild(col.com);
    }
    savePreset(obj) {
        if (!obj) {
            (0, UiKit_1.toast)("请先选中对象");
            return;
        }
        let name = "";
        try {
            name = "" + obj.name;
        }
        catch (e) { }
        if (!name) {
            (0, UiKit_1.toast)("选中对象没有名称");
            return;
        }
        const self = this;
        Api_1.App.Input("模板名称（用于按名称匹配对象，如 Btn_FanHui 或 FanHui）", name, (ret) => {
            if (!ret)
                return;
            const preset = {
                name: ret,
                x: 0, y: 0, width: 0, height: 0, pivotX: 0, pivotY: 0, anchor: false
            };
            try {
                preset.x = obj.x;
                preset.y = obj.y;
            }
            catch (e) { }
            try {
                preset.width = obj.width;
                preset.height = obj.height;
            }
            catch (e) { }
            try {
                preset.pivotX = obj.pivotX;
                preset.pivotY = obj.pivotY;
                preset.anchor = obj.anchor;
            }
            catch (e) { }
            Config_1.Config.update(c => {
                c.layoutPresets = c.layoutPresets.filter(p => p.name != ret);
                c.layoutPresets.push(preset);
            });
            (0, UiKit_1.toast)("模板已保存: " + ret);
            ScanController_1.ScanController.notify();
        });
    }
    applyPreset(preset, obj) {
        if (!obj) {
            (0, UiKit_1.toast)("请先选中目标对象");
            return;
        }
        let ok = (0, EditorService_1.setObjProperty)(obj, "x", preset.x);
        ok = (0, EditorService_1.setObjProperty)(obj, "y", preset.y) && ok;
        if (preset.width > 0 && preset.height > 0) {
            ok = (0, EditorService_1.setObjProperty)(obj, "width", preset.width) && ok;
            ok = (0, EditorService_1.setObjProperty)(obj, "height", preset.height) && ok;
        }
        if (preset.pivotX != 0 || preset.pivotY != 0 || preset.anchor) {
            (0, EditorService_1.setObjProperty)(obj, "pivotX", preset.pivotX);
            (0, EditorService_1.setObjProperty)(obj, "pivotY", preset.pivotY);
            (0, EditorService_1.setObjProperty)(obj, "anchor", preset.anchor);
        }
        (0, UiKit_1.toast)(ok ? "已应用模板位置" : "应用失败，请手动设置");
        ScanController_1.ScanController.scanCurrentComponent();
        ScanController_1.ScanController.notify();
    }
}
exports.LayoutPage = LayoutPage;
