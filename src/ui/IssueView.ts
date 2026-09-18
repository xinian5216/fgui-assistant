import { FairyGUI } from 'csharp';
import { Issue } from '../core/Types';
import { COLORS, Column, UiButton, createLabel, createTag, severityColor, severityText, createHLine, toast } from './UiKit';
import { locateObject } from '../services/EditorService';
import { applyFix } from '../services/FixService';
import { Store } from '../core/Store';
import { confirm } from '../Api';

export interface IssueAction {
    rebuild: () => void;
}

export function buildIssueRow(col: Column, issue: Issue, width: number, ctx: IssueAction): void {
    const rowCom = new FairyGUI.GComponent();
    const sevColor = severityColor(issue.severity);
    let y = 0;
    const tag = createTag(severityText(issue.severity), sevColor);
    tag.SetXY(0, y + 1);
    rowCom.AddChild(tag);
    const title = createLabel(issue.title, { size: 12, color: COLORS.text, bold: issue.severity == "error", width: width - 50, wrap: true });
    title.SetXY(48, y);
    rowCom.AddChild(title);
    y += Math.max(18, title.height + 2);
    if (issue.objectPath && issue.objectPath != issue.objectName) {
        const pathLabel = createLabel(issue.objectPath, { size: 11, color: COLORS.textDim, width: width - 10, wrap: true });
        pathLabel.SetXY(48, y);
        rowCom.AddChild(pathLabel);
        y += pathLabel.height + 2;
    }
    if (issue.detail) {
        const detail = createLabel(issue.detail, { size: 11, color: COLORS.textDim, width: width - 10, wrap: true });
        detail.SetXY(48, y);
        rowCom.AddChild(detail);
        y += detail.height + 2;
    }
    y += 2;
    let bx = 48;
    const btnH = 20;
    if (issue.docUrl) {
        const btnLocate = new UiButton("定位", {
            w: 46, h: btnH, size: 11, onClick: () => {
                locateObject(issue.docUrl, issue.targetId, issue.objectName);
            }
        });
        btnLocate.view.SetXY(bx, y);
        rowCom.AddChild(btnLocate.view);
        bx += 52;
    }
    if (issue.fixable && issue.fixType) {
        const btnFix = new UiButton(issue.fixLabel || "修复", {
            w: Math.max(52, (issue.fixLabel || "修复").length * 12 + 14), h: btnH, size: 11,
            bg: "#2c4a38", hover: "#386048",
            onClick: () => {
                if (applyFix(issue)) {
                    toast("已修复: " + (issue.objectName || issue.title));
                    ctx.rebuild();
                } else {
                    toast("修复失败，请手动处理");
                }
            }
        });
        btnFix.view.SetXY(bx, y);
        rowCom.AddChild(btnFix.view);
        bx += Math.max(52, (issue.fixLabel || "修复").length * 12 + 14) + 6;
    } else if (issue.fixType == "ackProtected") {
        const btnAck = new UiButton(issue.fixLabel || "确认", {
            w: 150, h: btnH, size: 11, bg: "#4a3a2c", hover: "#604c38",
            onClick: () => {
                if (applyFix(issue)) ctx.rebuild();
            }
        });
        btnAck.view.SetXY(bx, y);
        rowCom.AddChild(btnAck.view);
        bx += 156;
    }
    const btnIgnore = new UiButton("忽略", {
        w: 46, h: btnH, size: 11, onClick: () => {
            confirm("忽略该问题？\n「是」= 永久忽略（写入插件配置）\n「否」= 仅本次忽略", (ret) => {
                if (ret == "yes") Store.ignore(issue.ignoreKey, true);
                else Store.ignore(issue.ignoreKey, false);
                ctx.rebuild();
            });
        }
    });
    btnIgnore.view.SetXY(bx, y);
    rowCom.AddChild(btnIgnore.view);
    y += btnH;
    y += 4;
    const line = createHLine(width - 4);
    line.SetXY(0, y);
    rowCom.AddChild(line);
    y += 1;
    rowCom.SetSize(width, y);
    col.add(rowCom, y);
}
