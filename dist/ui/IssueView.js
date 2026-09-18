"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildIssueRow = buildIssueRow;
const csharp_1 = require("csharp");
const UiKit_1 = require("./UiKit");
const EditorService_1 = require("../services/EditorService");
const FixService_1 = require("../services/FixService");
const Store_1 = require("../core/Store");
const Api_1 = require("../Api");
function buildIssueRow(col, issue, width, ctx) {
    const rowCom = new csharp_1.FairyGUI.GComponent();
    const sevColor = (0, UiKit_1.severityColor)(issue.severity);
    let y = 0;
    const tag = (0, UiKit_1.createTag)((0, UiKit_1.severityText)(issue.severity), sevColor);
    tag.SetXY(0, y + 1);
    rowCom.AddChild(tag);
    const title = (0, UiKit_1.createLabel)(issue.title, { size: 12, color: UiKit_1.COLORS.text, bold: issue.severity == "error", width: width - 50, wrap: true });
    title.SetXY(48, y);
    rowCom.AddChild(title);
    y += Math.max(18, title.height + 2);
    if (issue.objectPath && issue.objectPath != issue.objectName) {
        const pathLabel = (0, UiKit_1.createLabel)(issue.objectPath, { size: 11, color: UiKit_1.COLORS.textDim, width: width - 10, wrap: true });
        pathLabel.SetXY(48, y);
        rowCom.AddChild(pathLabel);
        y += pathLabel.height + 2;
    }
    if (issue.detail) {
        const detail = (0, UiKit_1.createLabel)(issue.detail, { size: 11, color: UiKit_1.COLORS.textDim, width: width - 10, wrap: true });
        detail.SetXY(48, y);
        rowCom.AddChild(detail);
        y += detail.height + 2;
    }
    y += 2;
    let bx = 48;
    const btnH = 20;
    if (issue.docUrl) {
        const btnLocate = new UiKit_1.UiButton("定位", {
            w: 46, h: btnH, size: 11, onClick: () => {
                (0, EditorService_1.locateObject)(issue.docUrl, issue.targetId, issue.objectName);
            }
        });
        btnLocate.view.SetXY(bx, y);
        rowCom.AddChild(btnLocate.view);
        bx += 52;
    }
    if (issue.fixable && issue.fixType) {
        const btnFix = new UiKit_1.UiButton(issue.fixLabel || "修复", {
            w: Math.max(52, (issue.fixLabel || "修复").length * 12 + 14), h: btnH, size: 11,
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
        });
        btnFix.view.SetXY(bx, y);
        rowCom.AddChild(btnFix.view);
        bx += Math.max(52, (issue.fixLabel || "修复").length * 12 + 14) + 6;
    }
    else if (issue.fixType == "ackProtected") {
        const btnAck = new UiKit_1.UiButton(issue.fixLabel || "确认", {
            w: 150, h: btnH, size: 11, bg: "#4a3a2c", hover: "#604c38",
            onClick: () => {
                if ((0, FixService_1.applyFix)(issue))
                    ctx.rebuild();
            }
        });
        btnAck.view.SetXY(bx, y);
        rowCom.AddChild(btnAck.view);
        bx += 156;
    }
    const btnIgnore = new UiKit_1.UiButton("忽略", {
        w: 46, h: btnH, size: 11, onClick: () => {
            (0, Api_1.confirm)("忽略该问题？\n「是」= 永久忽略（写入插件配置）\n「否」= 仅本次忽略", (ret) => {
                if (ret == "yes")
                    Store_1.Store.ignore(issue.ignoreKey, true);
                else
                    Store_1.Store.ignore(issue.ignoreKey, false);
                ctx.rebuild();
            });
        }
    });
    btnIgnore.view.SetXY(bx, y);
    rowCom.AddChild(btnIgnore.view);
    y += btnH;
    y += 4;
    const line = (0, UiKit_1.createHLine)(width - 4);
    line.SetXY(0, y);
    rowCom.AddChild(line);
    y += 1;
    rowCom.SetSize(width, y);
    col.add(rowCom, y);
}
