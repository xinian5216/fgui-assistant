"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderIssueItem = renderIssueItem;
exports.createIssueItem = createIssueItem;
const csharp_1 = require("csharp");
const UiKit_1 = require("./UiKit");
const EditorService_1 = require("../services/EditorService");
const FixService_1 = require("../services/FixService");
const Store_1 = require("../core/Store");
const Api_1 = require("../Api");
const Layout_1 = require("./Layout");
const Scroll_1 = require("./Scroll");
function capLabel(t, w, maxH) {
    try {
        if (t.height > maxH) {
            t.autoSize = csharp_1.FairyGUI.AutoSizeType.None;
            t.SetSize(w, maxH);
        }
    }
    catch (e) { }
}
function renderIssueItem(rowCom, issue, width, ctx) {
    (0, UiKit_1.clearChildren)(rowCom);
    const w = Math.max(40, width);
    const h = Layout_1.LAYOUT.ISSUE_ITEM_H;
    rowCom.SetSize(w, h);
    try {
        rowCom.opaque = true;
    }
    catch (e) { }
    (0, Scroll_1.applyClip)(rowCom, w, h);
    const sevColor = (0, UiKit_1.severityColor)(issue.severity);
    const tag = (0, UiKit_1.createTag)((0, UiKit_1.severityText)(issue.severity), sevColor);
    tag.SetXY(0, 4);
    rowCom.AddChild(tag);
    const titleW = Math.max(20, w - 50);
    const title = (0, UiKit_1.createLabel)(issue.title || "", { size: 12, color: UiKit_1.COLORS.text, bold: issue.severity == "error", width: titleW, wrap: true });
    title.SetXY(48, 3);
    capLabel(title, titleW, 16);
    rowCom.AddChild(title);
    let y = 22;
    const subW = Math.max(20, w - 10);
    if (issue.objectPath && issue.objectPath != issue.objectName) {
        const pathLabel = (0, UiKit_1.createLabel)(issue.objectPath, { size: 11, color: UiKit_1.COLORS.textDim, width: subW, wrap: false });
        pathLabel.SetXY(48, y);
        rowCom.AddChild(pathLabel);
        y += 15;
    }
    if (issue.detail) {
        const detail = (0, UiKit_1.createLabel)(issue.detail, { size: 11, color: UiKit_1.COLORS.textDim, width: subW, wrap: false });
        detail.SetXY(48, y);
        rowCom.AddChild(detail);
        y += 15;
    }
    y = Math.max(y + 2, 40);
    let bx = 48;
    const btnH = 20;
    const maxBtnX = w - 4;
    const place = (btnW, factory) => {
        if (bx + btnW > maxBtnX)
            return;
        const btn = factory();
        btn.view.SetXY(bx, y);
        rowCom.AddChild(btn.view);
        bx += btnW + 6;
    };
    if (issue.docUrl) {
        place(46, () => new UiKit_1.UiButton("定位", {
            w: 46, h: btnH, size: 11, onClick: () => {
                (0, EditorService_1.locateObject)(issue.docUrl, issue.targetId, issue.objectName);
            }
        }));
    }
    if (issue.fixable && issue.fixType) {
        const label = issue.fixLabel || "修复";
        const fw = Math.min(Math.max(52, label.length * 11 + 12), Math.max(52, maxBtnX - bx - 52));
        place(fw, () => new UiKit_1.UiButton(label, {
            w: fw, h: btnH, size: 11,
            bg: "#2c4a38", hover: "#386048",
            onClick: () => {
                if ((0, FixService_1.applyFix)(issue)) {
                    (0, UiKit_1.toast)("已修复: " + (issue.objectName || issue.title));
                    ctx.rebuild();
                }
                else {
                    (0, UiKit_1.toast)("修复失败，请手动处理");
                }
            }
        }));
    }
    else if (issue.fixType == "ackProtected") {
        const fw = Math.min(150, Math.max(52, maxBtnX - bx - 52));
        place(fw, () => new UiKit_1.UiButton(issue.fixLabel || "确认", {
            w: fw, h: btnH, size: 11, bg: "#4a3a2c", hover: "#604c38",
            onClick: () => {
                if ((0, FixService_1.applyFix)(issue))
                    ctx.rebuild();
            }
        }));
    }
    place(46, () => new UiKit_1.UiButton("忽略", {
        w: 46, h: btnH, size: 11, onClick: () => {
            (0, Api_1.confirm)("忽略该问题？\n「是」= 永久忽略（写入插件配置）\n「否」= 仅本次忽略", (ret) => {
                if (ret == "yes")
                    Store_1.Store.ignore(issue.ignoreKey, true);
                else
                    Store_1.Store.ignore(issue.ignoreKey, false);
                ctx.rebuild();
            });
        }
    }));
    const line = (0, UiKit_1.createHLine)(w - 4);
    line.SetXY(0, h - 2);
    rowCom.AddChild(line);
}
function createIssueItem(issue, width, ctx) {
    const rowCom = new csharp_1.FairyGUI.GComponent();
    renderIssueItem(rowCom, issue, width, ctx);
    return rowCom;
}
