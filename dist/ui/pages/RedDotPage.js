"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedDotPage = void 0;
const csharp_1 = require("csharp");
const UiKit_1 = require("../UiKit");
const EditorService_1 = require("../../services/EditorService");
const RedDotService_1 = require("../../services/RedDotService");
const ScanController_1 = require("../../services/ScanController");
const Api_1 = require("../../Api");
const Config_1 = require("../../core/Config");
class RedDotPage {
    constructor() {
        this.id = "reddot";
        this.title = "红点工具";
    }
    build(ctx) {
        const content = ctx.content;
        const width = ctx.width;
        const col = new UiKit_1.Column(width, 6);
        const cfg = Config_1.Config.config.redDot || { controllerNamePattern: "HongDian", pageOff: "0", pageOn: "1" };
        const doc = (0, EditorService_1.getActiveDoc)();
        if (!doc) {
            col.add((0, UiKit_1.createLabel)("请先打开一个组件", { size: 12, color: UiKit_1.COLORS.textDim }), 20);
            col.finish();
            content.AddChild(col.com);
            return;
        }
        let controllers = [];
        try {
            controllers = (0, EditorService_1.readControllers)(doc.content);
        }
        catch (e) { }
        const matched = controllers.filter(c => (c.name || "").toLowerCase().indexOf((cfg.controllerNamePattern || "HongDian").toLowerCase()) >= 0);
        col.add((0, UiKit_1.createLabel)(`当前组件：${(0, EditorService_1.getCurrentComponentName)()}`, { size: 12, color: UiKit_1.COLORS.textDim, width: width, wrap: true }), 18);
        const btnCreate = new UiKit_1.UiButton("一键创建红点（选中红点对象后点击）", {
            w: width, h: 26, size: 11, bg: UiKit_1.COLORS.accent, hover: UiKit_1.COLORS.accentHover, color: "#fff",
            onClick: () => {
                const res = (0, RedDotService_1.createRedDot)();
                if (!res.ok)
                    (0, Api_1.alert)(res.message);
                else
                    (0, UiKit_1.toast)(res.message);
                ScanController_1.ScanController.notify();
            }
        });
        col.add(btnCreate.view, 26);
        col.add((0, UiKit_1.createLabel)(`红点控制器（名称包含「${cfg.controllerNamePattern}」，共 ${matched.length} 个）`, { size: 13, bold: true, color: UiKit_1.COLORS.text, width: width, wrap: true }), 20);
        if (matched.length == 0) {
            col.add((0, UiKit_1.createLabel)("未找到红点控制器。\n可点击上方「一键创建红点」自动创建 0/1 控制器；若已选中红点图片，会尝试自动绑定显示控制（页 1 显示），可 Ctrl+Z 撤销。", { size: 11, color: UiKit_1.COLORS.textDim, width: width, wrap: true }), 68);
        }
        for (const ctrl of matched) {
            const box = new csharp_1.FairyGUI.GComponent();
            let y = 0;
            const title = (0, UiKit_1.createLabel)(ctrl.name, { size: 13, bold: true, color: UiKit_1.COLORS.text });
            title.SetXY(0, y);
            box.AddChild(title);
            y += 20;
            const hasOff = ctrl.pages.some(p => p.name == cfg.pageOff || p.id == cfg.pageOff);
            const hasOn = ctrl.pages.some(p => p.name == cfg.pageOn || p.id == cfg.pageOn);
            const offPage = ctrl.pages.find(p => p.name == cfg.pageOff || p.id == cfg.pageOff);
            const onPage = ctrl.pages.find(p => p.name == cfg.pageOn || p.id == cfg.pageOn);
            let defaultOk = false;
            if (offPage) {
                if (ctrl.homePage)
                    defaultOk = ctrl.homePage == offPage.id || ctrl.homePage == offPage.name;
                else if (ctrl.pages.length > 0)
                    defaultOk = ctrl.pages[0] == offPage || ctrl.pages[0].id == offPage.id;
            }
            const lines = [
                { text: `${cfg.pageOff}：无红点`, ok: hasOff },
                { text: `${cfg.pageOn}：有红点`, ok: hasOn },
                { text: `默认：${cfg.pageOff}`, ok: defaultOk }
            ];
            for (const line of lines) {
                const tag = (0, UiKit_1.createTag)(line.ok ? "✓" : "✕", line.ok ? UiKit_1.COLORS.ok : UiKit_1.COLORS.error);
                tag.SetXY(0, y);
                box.AddChild(tag);
                const lb = (0, UiKit_1.createLabel)(line.text, { size: 12, color: line.ok ? UiKit_1.COLORS.text : UiKit_1.COLORS.error });
                lb.SetXY(34, y + 1);
                box.AddChild(lb);
                y += 20;
            }
            const pagesDesc = (0, UiKit_1.createLabel)(`页面列表：${ctrl.pages.map(p => p.name || p.id).join(", ") || "(无)"}`, { size: 11, color: UiKit_1.COLORS.textDim, width: width - 8, wrap: true });
            pagesDesc.SetXY(0, y);
            box.AddChild(pagesDesc);
            y += pagesDesc.height + 4;
            const offIdx = offPage ? ctrl.pages.indexOf(offPage) : -1;
            const onIdx = onPage ? ctrl.pages.indexOf(onPage) : -1;
            const btn0 = new UiKit_1.UiButton(`测试 ${cfg.pageOff}`, {
                w: (width - 12) / 3, h: 24, size: 11,
                onClick: () => {
                    if (offIdx < 0) {
                        (0, UiKit_1.toast)("没有该页面");
                        return;
                    }
                    if ((0, EditorService_1.switchControllerPage)(ctrl.name, offIdx))
                        (0, UiKit_1.toast)(`已切换到页面 ${cfg.pageOff}`);
                }
            });
            btn0.setEnabled(offIdx >= 0);
            const btn1 = new UiKit_1.UiButton(`测试 ${cfg.pageOn}`, {
                w: (width - 12) / 3, h: 24, size: 11,
                onClick: () => {
                    if (onIdx < 0) {
                        (0, UiKit_1.toast)("没有该页面");
                        return;
                    }
                    if ((0, EditorService_1.switchControllerPage)(ctrl.name, onIdx))
                        (0, UiKit_1.toast)(`已切换到页面 ${cfg.pageOn}`);
                }
            });
            btn1.setEnabled(onIdx >= 0);
            btn0.view.SetXY(0, y);
            box.AddChild(btn0.view);
            btn1.view.SetXY((width - 12) / 3 + 6, y);
            box.AddChild(btn1.view);
            y += 30;
            if (!defaultOk && hasOff) {
                const warn = (0, UiKit_1.createLabel)("⚠ 默认状态不是 " + cfg.pageOff + "，请在 FairyGUI 中检查控制器首页设置（插件不自动修改）", { size: 11, color: UiKit_1.COLORS.warning, width: width - 8, wrap: true });
                warn.SetXY(0, y);
                box.AddChild(warn);
                y += warn.height + 2;
            }
            const line = (0, UiKit_1.createHLine)(width - 4);
            line.SetXY(0, y);
            box.AddChild(line);
            y += 1;
            box.SetSize(width, y);
            col.add(box, y);
        }
        col.add((0, UiKit_1.createLabel)("说明：如未自动绑定显示控制（gearDisplay），请选中红点对象并在『显示控制』中勾选页 1；所有修改支持 Ctrl+Z 撤销。", { size: 10, color: UiKit_1.COLORS.textDim, width: width, wrap: true }), 32);
        col.finish();
        content.AddChild(col.com);
    }
}
exports.RedDotPage = RedDotPage;
