"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomePage = void 0;
const csharp_1 = require("csharp");
const UiKit_1 = require("../UiKit");
const ScanController_1 = require("../../services/ScanController");
const EditorService_1 = require("../../services/EditorService");
const Config_1 = require("../../core/Config");
const Store_1 = require("../../core/Store");
const FixService_1 = require("../../services/FixService");
const IssueView_1 = require("../IssueView");
class HomePage {
    constructor() {
        this.id = "home";
        this.title = "首页";
    }
    build(content, width) {
        const col = new UiKit_1.Column(width, 6);
        const pkgName = (0, EditorService_1.getCurrentPackageName)();
        const comName = (0, EditorService_1.getCurrentComponentName)();
        const doc = (0, EditorService_1.getActiveDoc)();
        col.add((0, UiKit_1.createLabel)("FGUI Assistant", { size: 16, bold: true, color: UiKit_1.COLORS.text }), 22);
        const isProtected = pkgName && (Config_1.Config.config.protectedPackages || []).indexOf(pkgName) >= 0;
        if (isProtected) {
            const banner = new csharp_1.FairyGUI.GComponent();
            const bh = 52;
            banner.SetSize(width, bh);
            const bg = (0, UiKit_1.createGraph)(width, bh, "#4a3525");
            banner.AddChild(bg);
            const t1 = (0, UiKit_1.createLabel)("🔒 公共资源：" + pkgName, { size: 13, bold: true, color: "#e8b45a" });
            t1.SetXY(8, 5);
            banner.AddChild(t1);
            const t2 = (0, UiKit_1.createLabel)("原则上不要修改源组件，只允许在引用实例表面调整。", { size: 11, color: "#d9c29a", width: width - 16, wrap: true });
            t2.SetXY(8, 24);
            banner.AddChild(t2);
            col.add(banner, bh);
        }
        const infoText = doc
            ? `当前 Package：${pkgName || "-"}\n当前组件：${comName || "-"}`
            : "当前没有打开的组件\n打开组件后可使用检查与快速设置";
        col.add((0, UiKit_1.createLabel)(infoText, { size: 12, color: UiKit_1.COLORS.textDim, width: width, wrap: true }), doc ? 34 : 34);
        const result = ScanController_1.ScanController.lastResult;
        if (result) {
            const summary = `最近检查（${result.model.componentName}）\n✕ ${result.errorCount} 项错误    ⚠ ${result.warningCount} 项警告    ⓘ ${result.infoCount} 项建议`;
            col.add((0, UiKit_1.createLabel)(summary, { size: 12, color: UiKit_1.COLORS.text, width: width, wrap: true }), 34);
            const important = result.issues.filter(i => i.severity == "error" || i.severity == "warning").slice(0, 3);
            if (important.length > 0) {
                col.add((0, UiKit_1.createLabel)("最近问题：", { size: 12, color: UiKit_1.COLORS.textDim }), 16);
                const self = this;
                for (const issue of important) {
                    (0, IssueView_1.buildIssueRow)(col, issue, width, { rebuild: () => self.rebuild(content, width) });
                }
            }
        }
        else {
            col.add((0, UiKit_1.createLabel)("尚未执行检查", { size: 12, color: UiKit_1.COLORS.textDim }), 16);
        }
        const btnScan = new UiKit_1.UiButton("检查当前组件", {
            w: width, h: 28, bg: UiKit_1.COLORS.accent, hover: UiKit_1.COLORS.accentHover, color: "#ffffff",
            onClick: () => {
                if (!(0, EditorService_1.getActiveDoc)()) {
                    (0, UiKit_1.toast)("没有打开的组件");
                    return;
                }
                ScanController_1.ScanController.scanCurrentComponent();
                (0, UiKit_1.toast)("检查完成");
            }
        });
        col.add(btnScan.view, 28);
        const fixableCount = result ? result.issues.filter(i => i.fixable && i.fixType && i.fixType != "ackProtected").length : 0;
        const btnFixAll = new UiKit_1.UiButton(`一键修复安全项（${fixableCount}）`, {
            w: width, h: 28,
            onClick: () => {
                if (!result) {
                    (0, UiKit_1.toast)("请先执行检查");
                    return;
                }
                const r = (0, FixService_1.applySafeFixes)(result.issues);
                (0, UiKit_1.toast)(`修复完成：成功 ${r.success} / 失败 ${r.failed}`);
                ScanController_1.ScanController.scanCurrentComponent();
            }
        });
        btnFixAll.setEnabled(fixableCount > 0);
        col.add(btnFixAll.view, 28);
        const btnScanPkg = new UiKit_1.UiButton("检查当前 Package", {
            w: width, h: 26,
            onClick: () => {
                const pkg = (0, EditorService_1.getCurrentPackageName)();
                if (!pkg) {
                    (0, UiKit_1.toast)("没有打开的组件");
                    return;
                }
                ScanController_1.ScanController.scanCurrentPackage();
            }
        });
        col.add(btnScanPkg.view, 26);
        const btnScanProject = new UiKit_1.UiButton("检查整个项目", {
            w: width, h: 26,
            onClick: () => {
                ScanController_1.ScanController.scanWholeProject();
            }
        });
        col.add(btnScanProject.view, 26);
        const publish = Store_1.Store.publish;
        if (publish.lastPublish) {
            const lp = publish.lastPublish;
            col.space(4);
            col.add((0, UiKit_1.createLabel)(`最近发布：${lp.pkg}\n${lp.exportPath}`, { size: 11, color: UiKit_1.COLORS.textDim, width: width, wrap: true }), 30);
        }
        col.finish();
        content.AddChild(col.com);
    }
    rebuild(content, width) {
        ScanController_1.ScanController.scanCurrentComponent();
    }
}
exports.HomePage = HomePage;
