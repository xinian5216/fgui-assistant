"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourcePage = void 0;
const UiKit_1 = require("../UiKit");
const EditorService_1 = require("../../services/EditorService");
const ResourceAudit_1 = require("../../services/ResourceAudit");
const Api_1 = require("../../Api");
const Layout_1 = require("../Layout");
const Scroll_1 = require("../Scroll");
class ResourcePage {
    constructor() {
        this.id = "resource";
        this.title = "资源体检";
        this.shortTitle = "资源";
        this.manageLayout = true;
        this.filterKind = "";
    }
    build(ctx) {
        const content = ctx.content;
        const width = ctx.width;
        const height = ctx.height;
        const col = new UiKit_1.Column(width, 6);
        const self = this;
        const halfW = (width - 6) / 2;
        col.row([
            {
                obj: new UiKit_1.UiButton("当前Package", {
                    w: halfW, h: 26, size: 11, bg: UiKit_1.COLORS.accent, hover: UiKit_1.COLORS.accentHover, color: "#fff",
                    onClick: () => {
                        if (!(0, EditorService_1.getCurrentPackageName)()) {
                            (0, UiKit_1.toast)("没有打开的组件");
                            return;
                        }
                        ResourceAudit_1.ResourceAuditController.scanCurrentPackage();
                    }
                }).view, w: halfW
            },
            {
                obj: new UiKit_1.UiButton("整个项目", {
                    w: halfW, h: 26, size: 11,
                    onClick: () => { ResourceAudit_1.ResourceAuditController.scanWholeProject(); }
                }).view, w: halfW
            }
        ], 26);
        if (ResourceAudit_1.ResourceAuditController.scanning) {
            const p = ResourceAudit_1.ResourceAuditController.progress;
            const line = p ? `正在体检（${p.current} / ${p.total}）：\n${p.currentName}` : "正在体检…";
            col.add((0, UiKit_1.createLabel)(line, { size: 12, color: UiKit_1.COLORS.warning, width: width, wrap: true }), 38);
            col.finish();
            content.AddChild(col.com);
            return;
        }
        const all = ResourceAudit_1.ResourceAuditController.lastIssues;
        if (!all) {
            col.add((0, UiKit_1.createLabel)("尚未执行资源体检。\n可检测：未使用资源、跨包引用未导出资源、超大图片、重复图片（只读扫描）。", { size: 12, color: UiKit_1.COLORS.textDim, width: width, wrap: true }), 40);
            col.finish();
            content.AddChild(col.com);
            return;
        }
        const errCnt = all.filter(i => i.severity === "error").length;
        const warnCnt = all.filter(i => i.severity === "warning").length;
        const infoCnt = all.filter(i => i.severity === "info").length;
        col.add((0, UiKit_1.createLabel)(`体检范围：${ResourceAudit_1.ResourceAuditController.lastScopeLabel || "当前"}`, { size: 12, color: UiKit_1.COLORS.textDim, width: width, wrap: true }), 18);
        col.add((0, UiKit_1.createLabel)(`✕ ${errCnt} 错误    ⚠ ${warnCnt} 警告    ⓘ ${infoCnt} 建议`, { size: 13, color: UiKit_1.COLORS.text, bold: true, width: width, wrap: true }), 20);
        const filters = [
            { kind: "", label: "全部" },
            { kind: "crossUnexported", label: "未导出" },
            { kind: "unused", label: "未使用" },
            { kind: "largeImage", label: "大图" },
            { kind: "duplicateImage", label: "重复" }
        ];
        const fw = (width - 24) / 5;
        const filterRow = [];
        for (const f of filters) {
            const active = self.filterKind === f.kind;
            const btn = new UiKit_1.UiButton(f.label, {
                w: fw, h: 22, size: 10,
                bg: active ? UiKit_1.COLORS.accent : UiKit_1.COLORS.btnBg,
                hover: active ? UiKit_1.COLORS.accentHover : UiKit_1.COLORS.btnHover,
                color: active ? "#fff" : UiKit_1.COLORS.text,
                onClick: () => {
                    self.filterKind = f.kind;
                    ResourceAudit_1.ResourceAuditController.notify();
                }
            });
            filterRow.push({ obj: btn.view, w: fw });
        }
        col.row(filterRow, 22, 6);
        const filtered = self.filterKind ? all.filter(i => i.kind === self.filterKind) : all;
        if (filtered.length === 0) {
            col.add((0, UiKit_1.createLabel)("✓ 没有符合筛选的资源问题", { size: 13, color: UiKit_1.COLORS.ok }), 22);
            col.finish();
            content.AddChild(col.com);
            return;
        }
        col.finish();
        content.AddChild(col.com);
        const headerH = col.cursorY;
        const listH = Math.max(40, height - headerH);
        const list = new Scroll_1.VirtualList(width, listH, Layout_1.LAYOUT.ISSUE_ITEM_H, (_i, item, issue, itemW) => {
            renderResourceIssueItem(item, issue, itemW);
        });
        list.view.SetXY(0, headerH);
        list.setData(filtered);
        content.AddChild(list.view);
    }
}
exports.ResourcePage = ResourcePage;
function renderResourceIssueItem(rowCom, issue, width) {
    (0, UiKit_1.clearChildren)(rowCom);
    const w = Math.max(40, width);
    const h = Layout_1.LAYOUT.ISSUE_ITEM_H;
    rowCom.SetSize(w, h);
    try {
        rowCom.opaque = true;
    }
    catch (e) { }
    (0, Scroll_1.applyClip)(rowCom, w, h);
    const tag = (0, UiKit_1.createTag)((0, UiKit_1.severityText)(issue.severity), (0, UiKit_1.severityColor)(issue.severity));
    tag.SetXY(0, 4);
    rowCom.AddChild(tag);
    const titleW = Math.max(20, w - 52);
    const title = (0, UiKit_1.createLabel)(issue.title || "", { size: 12, color: UiKit_1.COLORS.text, bold: issue.severity === "error", width: titleW, wrap: false });
    title.SetXY(48, 3);
    rowCom.AddChild(title);
    const detail = (0, UiKit_1.createLabel)(issue.detail || "", { size: 11, color: UiKit_1.COLORS.textDim, width: titleW, wrap: false });
    detail.SetXY(48, 24);
    rowCom.AddChild(detail);
    const y = 46;
    let bx = 48;
    const btnH = 20;
    const maxBtnX = w - 4;
    if ((issue.url || issue.filePath) && bx + 54 <= maxBtnX) {
        const b1 = new UiKit_1.UiButton("定位", {
            w: 54, h: btnH, size: 11,
            onClick: () => { (0, ResourceAudit_1.locateResource)(issue); }
        });
        b1.view.SetXY(bx, y);
        rowCom.AddChild(b1.view);
        bx += 60;
    }
    if (issue.filePath && bx + 70 <= maxBtnX) {
        const b2 = new UiKit_1.UiButton("打开目录", {
            w: 70, h: btnH, size: 11,
            onClick: () => {
                if (!(0, Api_1.fileExists)(issue.filePath)) {
                    (0, UiKit_1.toast)("文件不存在");
                    return;
                }
                if (!(0, Api_1.revealInExplorer)(issue.filePath))
                    (0, UiKit_1.toast)("打开目录失败");
            }
        });
        b2.view.SetXY(bx, y);
        rowCom.AddChild(b2.view);
    }
    const line = (0, UiKit_1.createHLine)(w - 4);
    line.SetXY(0, h - 2);
    rowCom.AddChild(line);
}
