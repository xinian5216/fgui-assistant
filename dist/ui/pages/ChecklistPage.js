"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChecklistPage = void 0;
const UiKit_1 = require("../UiKit");
const Config_1 = require("../../core/Config");
const Store_1 = require("../../core/Store");
const EditorService_1 = require("../../services/EditorService");
const ScanController_1 = require("../../services/ScanController");
class ChecklistPage {
    constructor() {
        this.id = "checklist";
        this.title = "PS 清单";
    }
    build(ctx) {
        const content = ctx.content;
        const width = ctx.width;
        const col = new UiKit_1.Column(width, 6);
        const cfg = Config_1.Config.config;
        const items = cfg.psChecklist || [];
        const doc = (0, EditorService_1.getActiveDoc)();
        col.add((0, UiKit_1.createLabel)("设计稿核对清单", { size: 14, bold: true, color: UiKit_1.COLORS.text }), 20);
        if (!doc) {
            col.add((0, UiKit_1.createLabel)("请先打开一个组件，清单状态将与组件绑定", { size: 12, color: UiKit_1.COLORS.textDim, width: width, wrap: true }), 20);
            col.finish();
            content.AddChild(col.com);
            return;
        }
        let docUrl = "";
        try {
            docUrl = "" + doc.docURL;
        }
        catch (e) { }
        col.add((0, UiKit_1.createLabel)(`当前组件：${(0, EditorService_1.getCurrentComponentName)()}`, { size: 12, color: UiKit_1.COLORS.textDim, width: width, wrap: true }), 18);
        const state = Store_1.Store.getPsChecklist(docUrl);
        for (let i = 0; i < items.length; i++) {
            const checked = state.length > i ? !!state[i] : false;
            const cb = new UiKit_1.UiCheckbox(items[i], checked, (v) => {
                Store_1.Store.setPsItem(docUrl, i, v);
            }, { w: width });
            col.add(cb.view, 22);
        }
        const doneCount = state.filter(v => v).length;
        col.space(4);
        col.add((0, UiKit_1.createLabel)(`已完成 ${doneCount}/${items.length}`, { size: 12, color: doneCount == items.length ? UiKit_1.COLORS.ok : UiKit_1.COLORS.textDim }), 18);
        const btnReset = new UiKit_1.UiButton("重置本组件清单", {
            w: width, h: 24, size: 11,
            onClick: () => {
                Store_1.Store.resetPsChecklist(docUrl);
                ScanController_1.ScanController.notify();
                (0, UiKit_1.toast)("已重置");
            }
        });
        col.add(btnReset.view, 24);
        col.add((0, UiKit_1.createLabel)("说明：清单状态保存在插件本地配置中，不会写入业务 Package。", { size: 10, color: UiKit_1.COLORS.textDim, width: width, wrap: true }), 28);
        col.finish();
        content.AddChild(col.com);
    }
}
exports.ChecklistPage = ChecklistPage;
