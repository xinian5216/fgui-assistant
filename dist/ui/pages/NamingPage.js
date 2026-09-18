"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NamingPage = void 0;
const UiKit_1 = require("../UiKit");
const EditorService_1 = require("../../services/EditorService");
const NamingRule_1 = require("../../rules/NamingRule");
const EditorService_2 = require("../../services/EditorService");
const Config_1 = require("../../core/Config");
const ScanController_1 = require("../../services/ScanController");
const Api_1 = require("../../Api");
class NamingPage {
    constructor() {
        this.id = "naming";
        this.title = "命名助手";
        this.input = null;
    }
    build(ctx) {
        const content = ctx.content;
        const width = ctx.width;
        const col = new UiKit_1.Column(width, 6);
        const self = this;
        const cfg = Config_1.Config.config;
        const selection = (0, EditorService_1.getSelection)();
        const first = selection.length > 0 ? selection[0] : null;
        if (!first) {
            col.add((0, UiKit_1.createLabel)("请先选中一个对象", { size: 12, color: UiKit_1.COLORS.textDim, width: width, wrap: true }), 20);
        }
        else {
            const info = (0, EditorService_2.objToInfo)(first, "", 1);
            const type = (0, NamingRule_1.getNamingType)(info) || info.objectType || "未知";
            const prefix = (cfg.namingRules || {})[type] || "";
            col.add((0, UiKit_1.createLabel)(`当前类型：${type}`, { size: 13, bold: true, color: UiKit_1.COLORS.text }), 20);
            col.add((0, UiKit_1.createLabel)(`要求前缀：${prefix || "（未配置该类型的命名规则）"}`, { size: 12, color: UiKit_1.COLORS.textDim }), 18);
            col.add((0, UiKit_1.createLabel)(`当前名称：${info.name}`, { size: 12, color: UiKit_1.COLORS.text, width: width, wrap: true }), 18);
            let suggestion = "";
            if (prefix && info.name.indexOf(prefix) != 0)
                suggestion = prefix + info.name;
            else
                suggestion = info.name;
            col.add((0, UiKit_1.createLabel)(prefix ? `建议：${suggestion}` : "建议：该类型无前缀要求", { size: 12, color: prefix && info.name.indexOf(prefix) != 0 ? UiKit_1.COLORS.warning : UiKit_1.COLORS.ok, width: width, wrap: true }), 18);
            this.input = (0, UiKit_1.createInput)(width, suggestion, "输入新名称");
            col.add(this.input, 26);
            col.row([
                {
                    obj: new UiKit_1.UiButton("应用", {
                        w: (width - 12) / 3, h: 26, bg: UiKit_1.COLORS.accent, hover: UiKit_1.COLORS.accentHover, color: "#fff",
                        onClick: () => { self.applyRename(first); }
                    }).view, w: (width - 12) / 3
                },
                {
                    obj: new UiKit_1.UiButton("加前缀", {
                        w: (width - 12) / 3, h: 26,
                        onClick: () => {
                            if (!prefix) {
                                (0, UiKit_1.toast)("该类型没有配置前缀");
                                return;
                            }
                            let cur = "";
                            try {
                                cur = "" + first.name;
                            }
                            catch (e) { }
                            if (cur.indexOf(prefix) == 0) {
                                (0, UiKit_1.toast)("已有正确前缀");
                                return;
                            }
                            if ((0, EditorService_1.setObjProperty)(first, "name", prefix + cur)) {
                                (0, UiKit_1.toast)(`已重命名为 ${prefix}${cur}`);
                                ScanController_1.ScanController.scanCurrentComponent();
                                ScanController_1.ScanController.notify();
                            }
                        }
                    }).view, w: (width - 12) / 3
                },
                {
                    obj: new UiKit_1.UiButton("定位命名异常", {
                        w: (width - 12) / 3, h: 26,
                        onClick: () => {
                            ScanController_1.ScanController.scanCurrentComponent();
                            const r = ScanController_1.ScanController.lastResult;
                            if (!r) {
                                (0, UiKit_1.toast)("请先打开组件");
                                return;
                            }
                            const bad = r.issues.find(i => i.ruleId == "naming");
                            if (!bad) {
                                (0, UiKit_1.toast)("当前组件没有命名异常");
                                return;
                            }
                            ScanController_1.ScanController.notify();
                            (0, UiKit_1.toast)("发现命名异常，请查看规范检查页");
                        }
                    }).view, w: (width - 12) / 3
                }
            ], 26, 6);
            if (selection.length > 1) {
                col.add((0, UiKit_1.createLabel)(`（多选 ${selection.length} 个对象时，重命名仅应用于第一个）`, { size: 10, color: UiKit_1.COLORS.textDim, width: width, wrap: true }), 14);
            }
        }
        col.space(4);
        col.add((0, UiKit_1.createLabel)("命名规则（在设置页修改）", { size: 13, bold: true, color: UiKit_1.COLORS.text }), 18);
        const rules = cfg.namingRules || {};
        const lines = [];
        const ruleKeys = (0, Config_1.orderedNamingKeys)(rules);
        for (const k of ruleKeys)
            lines.push(`${k}  →  ${rules[k]}`);
        col.add((0, UiKit_1.createLabel)(lines.join("\n") || "（无）", { size: 12, color: UiKit_1.COLORS.textDim, width: width, wrap: true }), lines.length * 17 + 4);
        col.space(2);
        col.add((0, UiKit_1.createLabel)("扫描", { size: 13, bold: true, color: UiKit_1.COLORS.text }), 18);
        col.row([
            {
                obj: new UiKit_1.UiButton("扫描当前组件", {
                    w: (width - 6) / 2, h: 26,
                    onClick: () => {
                        if (!ScanController_1.ScanController.scanCurrentComponent()) {
                            (0, UiKit_1.toast)("没有打开的组件");
                            return;
                        }
                        (0, UiKit_1.toast)("扫描完成，结果见规范检查页");
                    }
                }).view, w: (width - 6) / 2
            },
            {
                obj: new UiKit_1.UiButton("扫描当前 Package", {
                    w: (width - 6) / 2, h: 26,
                    onClick: () => {
                        ScanController_1.ScanController.scanCurrentPackage();
                    }
                }).view, w: (width - 6) / 2
            }
        ], 26, 6);
        col.finish();
        content.AddChild(col.com);
    }
    applyRename(obj) {
        if (!this.input)
            return;
        let newName = "";
        try {
            newName = this.input.text;
        }
        catch (e) { }
        newName = (newName || "").replace(/^\s+|\s+$/g, "");
        if (!newName) {
            (0, UiKit_1.toast)("名称不能为空");
            return;
        }
        if ((0, EditorService_1.setObjProperty)(obj, "name", newName)) {
            (0, UiKit_1.toast)("已重命名为 " + newName);
            ScanController_1.ScanController.scanCurrentComponent();
            ScanController_1.ScanController.notify();
        }
        else {
            (0, Api_1.alert)("重命名失败");
        }
    }
}
exports.NamingPage = NamingPage;
