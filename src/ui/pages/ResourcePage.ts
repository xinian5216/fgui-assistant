import { FairyGUI } from 'csharp';
import { Page, PageContext } from '../MainPanel';
import { Column, COLORS, UiButton, clearChildren, createHLine, createLabel, createTag, severityColor, severityText, toast } from '../UiKit';
import { getCurrentPackageName } from '../../services/EditorService';
import { ResourceAuditController, ResourceIssue, ResourceIssueKind, locateResource } from '../../services/ResourceAudit';
import { fileExists, revealInExplorer } from '../../Api';
import { LAYOUT } from '../Layout';
import { VirtualList, applyClip } from '../Scroll';

export class ResourcePage implements Page {
    id = "resource";
    title = "资源体检";
    shortTitle = "资源";
    manageLayout = true;
    private filterKind: "" | ResourceIssueKind = "";

    build(ctx: PageContext): void {
        const content = ctx.content;
        const width = ctx.width;
        const height = ctx.height;
        const col = new Column(width, 6);
        const self = this;

        const halfW = (width - 6) / 2;
        col.row([
            {
                obj: new UiButton("当前Package", {
                    w: halfW, h: 26, size: 11, bg: COLORS.accent, hover: COLORS.accentHover, color: "#fff",
                    onClick: () => {
                        if (!getCurrentPackageName()) { toast("没有打开的组件"); return; }
                        ResourceAuditController.scanCurrentPackage();
                    }
                }).view, w: halfW
            },
            {
                obj: new UiButton("整个项目", {
                    w: halfW, h: 26, size: 11,
                    onClick: () => { ResourceAuditController.scanWholeProject(); }
                }).view, w: halfW
            }
        ], 26);

        if (ResourceAuditController.scanning) {
            const p = ResourceAuditController.progress;
            const line = p ? `正在体检（${p.current} / ${p.total}）：\n${p.currentName}` : "正在体检…";
            col.add(createLabel(line, { size: 12, color: COLORS.warning, width: width, wrap: true }), 38);
            col.finish();
            content.AddChild(col.com);
            return;
        }

        const all = ResourceAuditController.lastIssues;
        if (!all) {
            col.add(createLabel("尚未执行资源体检。\n可检测：未使用资源、跨包引用未导出资源、超大图片、重复图片（只读扫描）。", { size: 12, color: COLORS.textDim, width: width, wrap: true }), 40);
            col.finish();
            content.AddChild(col.com);
            return;
        }

        const errCnt = all.filter(i => i.severity === "error").length;
        const warnCnt = all.filter(i => i.severity === "warning").length;
        const infoCnt = all.filter(i => i.severity === "info").length;

        col.add(createLabel(`体检范围：${ResourceAuditController.lastScopeLabel || "当前"}`, { size: 12, color: COLORS.textDim, width: width, wrap: true }), 18);
        col.add(createLabel(`✕ ${errCnt} 错误    ⚠ ${warnCnt} 警告    ⓘ ${infoCnt} 建议`, { size: 13, color: COLORS.text, bold: true, width: width, wrap: true }), 20);

        const filters: { kind: "" | ResourceIssueKind; label: string }[] = [
            { kind: "", label: "全部" },
            { kind: "crossUnexported", label: "未导出" },
            { kind: "unused", label: "未使用" },
            { kind: "largeImage", label: "大图" },
            { kind: "duplicateImage", label: "重复" }
        ];
        const fw = (width - 24) / 5;
        const filterRow: { obj: FairyGUI.GObject; w: number }[] = [];
        for (const f of filters) {
            const active = self.filterKind === f.kind;
            const btn = new UiButton(f.label, {
                w: fw, h: 22, size: 10,
                bg: active ? COLORS.accent : COLORS.btnBg,
                hover: active ? COLORS.accentHover : COLORS.btnHover,
                color: active ? "#fff" : COLORS.text,
                onClick: () => {
                    self.filterKind = f.kind;
                    ResourceAuditController.notify();
                }
            });
            filterRow.push({ obj: btn.view, w: fw });
        }
        col.row(filterRow, 22, 6);

        const filtered = self.filterKind ? all.filter(i => i.kind === self.filterKind) : all;
        if (filtered.length === 0) {
            col.add(createLabel("✓ 没有符合筛选的资源问题", { size: 13, color: COLORS.ok }), 22);
            col.finish();
            content.AddChild(col.com);
            return;
        }

        col.finish();
        content.AddChild(col.com);

        const headerH = col.cursorY;
        const listH = Math.max(40, height - headerH);
        const list = new VirtualList(width, listH, LAYOUT.ISSUE_ITEM_H, (_i, item, issue, itemW) => {
            renderResourceIssueItem(item, issue, itemW);
        });
        list.view.SetXY(0, headerH);
        list.setData(filtered);
        content.AddChild(list.view);
    }
}

function renderResourceIssueItem(rowCom: FairyGUI.GComponent, issue: ResourceIssue, width: number): void {
    clearChildren(rowCom);
    const w = Math.max(40, width);
    const h = LAYOUT.ISSUE_ITEM_H;
    rowCom.SetSize(w, h);
    try { rowCom.opaque = true; } catch (e) { }
    applyClip(rowCom, w, h);

    const tag = createTag(severityText(issue.severity), severityColor(issue.severity));
    tag.SetXY(0, 4);
    rowCom.AddChild(tag);

    const titleW = Math.max(20, w - 52);
    const title = createLabel(issue.title || "", { size: 12, color: COLORS.text, bold: issue.severity === "error", width: titleW, wrap: false });
    title.SetXY(48, 3);
    rowCom.AddChild(title);

    const detail = createLabel(issue.detail || "", { size: 11, color: COLORS.textDim, width: titleW, wrap: false });
    detail.SetXY(48, 24);
    rowCom.AddChild(detail);

    const y = 46;
    let bx = 48;
    const btnH = 20;
    const maxBtnX = w - 4;

    if ((issue.url || issue.filePath) && bx + 54 <= maxBtnX) {
        const b1 = new UiButton("定位", {
            w: 54, h: btnH, size: 11,
            onClick: () => { locateResource(issue); }
        });
        b1.view.SetXY(bx, y);
        rowCom.AddChild(b1.view);
        bx += 60;
    }

    if (issue.filePath && bx + 70 <= maxBtnX) {
        const b2 = new UiButton("打开目录", {
            w: 70, h: btnH, size: 11,
            onClick: () => {
                if (!fileExists(issue.filePath)) { toast("文件不存在"); return; }
                if (!revealInExplorer(issue.filePath)) toast("打开目录失败");
            }
        });
        b2.view.SetXY(bx, y);
        rowCom.AddChild(b2.view);
    }

    const line = createHLine(w - 4);
    line.SetXY(0, h - 2);
    rowCom.AddChild(line);
}
