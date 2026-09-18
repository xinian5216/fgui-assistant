import { FairyGUI } from 'csharp';
import { Issue } from '../core/Types';
import { COLORS, UiButton, createLabel, createTag, severityColor, severityText, createHLine, toast, clearChildren } from './UiKit';
import { locateObject } from '../services/EditorService';
import { applyFix } from '../services/FixService';
import { Store } from '../core/Store';
import { confirm } from '../Api';
import { LAYOUT } from './Layout';
import { applyClip } from './Scroll';

export interface IssueAction {
    rebuild: () => void;
}

function capLabel(t: FairyGUI.GTextField, w: number, maxH: number): void {
    try {
        if (t.height > maxH) {
            t.autoSize = FairyGUI.AutoSizeType.None;
            t.SetSize(w, maxH);
        }
    } catch (e) { }
}

export function renderIssueItem(rowCom: FairyGUI.GComponent, issue: Issue, width: number, ctx: IssueAction): void {
    clearChildren(rowCom);
    const w = Math.max(40, width);
    const h = LAYOUT.ISSUE_ITEM_H;
    rowCom.SetSize(w, h);
    try { rowCom.opaque = true; } catch (e) { }
    applyClip(rowCom, w, h);

    const sevColor = severityColor(issue.severity);
    const tag = createTag(severityText(issue.severity), sevColor);
    tag.SetXY(0, 4);
    rowCom.AddChild(tag);

    const titleW = Math.max(20, w - 50);
    const title = createLabel(issue.title || "", { size: 12, color: COLORS.text, bold: issue.severity == "error", width: titleW, wrap: true });
    title.SetXY(48, 3);
    capLabel(title, titleW, 16);
    rowCom.AddChild(title);

    let y = 22;
    const subW = Math.max(20, w - 10);
    if (issue.objectPath && issue.objectPath != issue.objectName) {
        const pathLabel = createLabel(issue.objectPath, { size: 11, color: COLORS.textDim, width: subW, wrap: false });
        pathLabel.SetXY(48, y);
        rowCom.AddChild(pathLabel);
        y += 15;
    }
    if (issue.detail) {
        const detail = createLabel(issue.detail, { size: 11, color: COLORS.textDim, width: subW, wrap: false });
        detail.SetXY(48, y);
        rowCom.AddChild(detail);
        y += 15;
    }

    y = Math.max(y + 2, 40);
    let bx = 48;
    const btnH = 20;
    const maxBtnX = w - 4;

    const place = (btnW: number, factory: () => UiButton): void => {
        if (bx + btnW > maxBtnX) return;
        const btn = factory();
        btn.view.SetXY(bx, y);
        rowCom.AddChild(btn.view);
        bx += btnW + 6;
    };

    if (issue.docUrl) {
        place(46, () => new UiButton("定位", {
            w: 46, h: btnH, size: 11, onClick: () => {
                locateObject(issue.docUrl, issue.targetId, issue.objectName);
            }
        }));
    }
    if (issue.fixable && issue.fixType) {
        const label = issue.fixLabel || "修复";
        const fw = Math.min(Math.max(52, label.length * 11 + 12), Math.max(52, maxBtnX - bx - 52));
        place(fw, () => new UiButton(label, {
            w: fw, h: btnH, size: 11,
            bg: "#2c4a38", hover: "#386048",
            onClick: () => {
                if (applyFix(issue)) {
                    toast("已修复: " + (issue.objectName || issue.title));
                    ctx.rebuild();
                } else {
                    toast("修复失败，请手动处理");
                }
            }
        }));
    } else if (issue.fixType == "ackProtected") {
        const fw = Math.min(150, Math.max(52, maxBtnX - bx - 52));
        place(fw, () => new UiButton(issue.fixLabel || "确认", {
            w: fw, h: btnH, size: 11, bg: "#4a3a2c", hover: "#604c38",
            onClick: () => {
                if (applyFix(issue)) ctx.rebuild();
            }
        }));
    }
    place(46, () => new UiButton("忽略", {
        w: 46, h: btnH, size: 11, onClick: () => {
            confirm("忽略该问题？\n「是」= 永久忽略（写入插件配置）\n「否」= 仅本次忽略", (ret) => {
                if (ret == "yes") Store.ignore(issue.ignoreKey, true);
                else Store.ignore(issue.ignoreKey, false);
                ctx.rebuild();
            });
        }
    }));

    const line = createHLine(w - 4);
    line.SetXY(0, h - 2);
    rowCom.AddChild(line);
}

export function createIssueItem(issue: Issue, width: number, ctx: IssueAction): FairyGUI.GComponent {
    const rowCom = new FairyGUI.GComponent();
    renderIssueItem(rowCom, issue, width, ctx);
    return rowCom;
}
