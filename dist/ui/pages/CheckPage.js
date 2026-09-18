"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckPage = void 0;
const UiKit_1 = require("../UiKit");
const ScanController_1 = require("../../services/ScanController");
const EditorService_1 = require("../../services/EditorService");
const IssueView_1 = require("../IssueView");
const Store_1 = require("../../core/Store");
const RuleEngine_1 = require("../../core/RuleEngine");
const FixService_1 = require("../../services/FixService");
class CheckPage {
    constructor() {
        this.id = "check";
        this.title = "规范检查";
        this.showIgnored = false;
        this.filterSeverity = "";
    }
    build(content, width) {
        const col = new UiKit_1.Column(width, 6);
        const self = this;
        col.row([
            {
                obj: new UiKit_1.UiButton("当前组件", {
                    w: (width - 12) / 3, h: 26, size: 11, bg: UiKit_1.COLORS.accent, hover: UiKit_1.COLORS.accentHover, color: "#fff",
                    onClick: () => { if (!(0, EditorService_1.getActiveDoc)()) {
                        (0, UiKit_1.toast)("没有打开的组件");
                        return;
                    } ScanController_1.ScanController.scanCurrentComponent(); }
                }).view, w: (width - 12) / 3
            },
            {
                obj: new UiKit_1.UiButton("当前Package", {
                    w: (width - 12) / 3, h: 26, size: 11,
                    onClick: () => { if (!(0, EditorService_1.getCurrentPackageName)()) {
                        (0, UiKit_1.toast)("没有打开的组件");
                        return;
                    } ScanController_1.ScanController.scanCurrentPackage(); }
                }).view, w: (width - 12) / 3
            },
            {
                obj: new UiKit_1.UiButton("整个项目", {
                    w: (width - 12) / 3, h: 26, size: 11,
                    onClick: () => { ScanController_1.ScanController.scanWholeProject(); }
                }).view, w: (width - 12) / 3
            }
        ], 26);
        if (ScanController_1.ScanController.scanning) {
            const p = ScanController_1.ScanController.progress;
            const line = p ? `正在扫描（${p.current} / ${p.total}）：\n${p.currentName}` : "正在扫描…";
            col.add((0, UiKit_1.createLabel)(line, { size: 12, color: UiKit_1.COLORS.warning, width: width, wrap: true }), 38);
            col.finish();
            content.AddChild(col.com);
            return;
        }
        const result = ScanController_1.ScanController.lastResult;
        if (!result) {
            col.add((0, UiKit_1.createLabel)("尚未执行检查。\n点击上方按钮开始检查当前组件、当前 Package 或整个项目。", { size: 12, color: UiKit_1.COLORS.textDim, width: width, wrap: true }), 34);
            col.finish();
            content.AddChild(col.com);
            return;
        }
        const scopeName = ScanController_1.ScanController.lastScope == "project" ? "整个项目"
            : ScanController_1.ScanController.lastScope == "package" ? `Package「${result.model.packageName}」`
                : `组件「${result.model.componentName}」`;
        col.add((0, UiKit_1.createLabel)(`检查范围：${scopeName}`, { size: 12, color: UiKit_1.COLORS.textDim, width: width, wrap: true }), 18);
        col.add((0, UiKit_1.createLabel)(`✕ ${result.errorCount} 错误    ⚠ ${result.warningCount} 警告    ⓘ ${result.infoCount} 建议`, { size: 13, color: UiKit_1.COLORS.text, bold: true }), 20);
        const fixable = result.issues.filter(i => i.fixable && i.fixType && i.fixType != "ackProtected");
        if (fixable.length > 0) {
            const btnFixAll = new UiKit_1.UiButton(`一键修复安全项（${fixable.length}）`, {
                w: width, h: 26,
                onClick: () => {
                    const r = (0, FixService_1.applySafeFixes)(result.issues);
                    (0, UiKit_1.toast)(`修复完成：成功 ${r.success} / 失败 ${r.failed}`);
                    ScanController_1.ScanController.scanCurrentComponent();
                }
            });
            col.add(btnFixAll.view, 26);
        }
        const filters = [
            { sev: "", label: "全部" },
            { sev: "error", label: "错误" },
            { sev: "warning", label: "警告" },
            { sev: "info", label: "建议" }
        ];
        const filterRow = [];
        for (const f of filters) {
            const btn = new UiKit_1.UiButton(f.label, {
                w: (width - 18) / 4, h: 22, size: 11,
                bg: this.filterSeverity == f.sev ? UiKit_1.COLORS.accent : UiKit_1.COLORS.btnBg,
                hover: this.filterSeverity == f.sev ? UiKit_1.COLORS.accentHover : UiKit_1.COLORS.btnHover,
                color: this.filterSeverity == f.sev ? "#fff" : UiKit_1.COLORS.text,
                onClick: () => { self.filterSeverity = f.sev; ScanController_1.ScanController.notify(); }
            });
            filterRow.push({ obj: btn.view, w: (width - 18) / 4 });
        }
        col.row(filterRow, 22, 6);
        const cbIgnored = new UiKit_1.UiCheckbox("显示已忽略（本次 + 永久）", this.showIgnored, (v) => { self.showIgnored = v; ScanController_1.ScanController.notify(); }, { w: width });
        col.add(cbIgnored.view, 20);
        let issues = result.issues;
        if (this.showIgnored && ScanController_1.ScanController.lastScope == "component" && result.model && result.model.docUrl) {
            issues = RuleEngine_1.Engine.runOnModel(result.model, true);
        }
        if (this.filterSeverity)
            issues = issues.filter(i => i.severity == this.filterSeverity);
        if (issues.length == 0) {
            col.add((0, UiKit_1.createLabel)("✓ 没有符合筛选的问题", { size: 13, color: UiKit_1.COLORS.ok }), 22);
        }
        else {
            const shown = issues.slice(0, 200);
            for (const issue of shown) {
                (0, IssueView_1.buildIssueRow)(col, issue, width, { rebuild: () => ScanController_1.ScanController.notify() });
            }
            if (issues.length > 200) {
                col.add((0, UiKit_1.createLabel)(`（仅显示前 200 条，共 ${issues.length} 条）`, { size: 11, color: UiKit_1.COLORS.textDim }), 16);
            }
        }
        if (Store_1.Store.permanentIgnoreCount > 0) {
            col.space(4);
            const btnClearIgnore = new UiKit_1.UiButton(`清除全部永久忽略（${Store_1.Store.permanentIgnoreCount}）`, {
                w: width, h: 22, size: 11,
                onClick: () => {
                    const n = Store_1.Store.clearPermanentIgnores();
                    (0, UiKit_1.toast)(`已清除 ${n} 条永久忽略`);
                    ScanController_1.ScanController.notify();
                }
            });
            col.add(btnClearIgnore.view, 22);
        }
        col.finish();
        content.AddChild(col.com);
    }
}
exports.CheckPage = CheckPage;
