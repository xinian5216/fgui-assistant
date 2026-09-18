import { FairyGUI } from 'csharp';
import { Page } from '../MainPanel';
import { Column, COLORS, UiButton, UiCheckbox, createLabel, toast } from '../UiKit';
import { ScanController } from '../../services/ScanController';
import { getActiveDoc, getCurrentPackageName } from '../../services/EditorService';
import { buildIssueRow } from '../IssueView';
import { Issue, Severity } from '../../core/Types';
import { Store } from '../../core/Store';
import { Engine } from '../../core/RuleEngine';
import { applySafeFixes } from '../../services/FixService';

export class CheckPage implements Page {
    id = "check";
    title = "规范检查";
    private showIgnored: boolean = false;
    private filterSeverity: string = "";

    build(content: FairyGUI.GComponent, width: number): void {
        const col = new Column(width, 6);
        const self = this;

        col.row([
            {
                obj: new UiButton("当前组件", {
                    w: (width - 12) / 3, h: 26, size: 11, bg: COLORS.accent, hover: COLORS.accentHover, color: "#fff",
                    onClick: () => { if (!getActiveDoc()) { toast("没有打开的组件"); return; } ScanController.scanCurrentComponent(); }
                }).view, w: (width - 12) / 3
            },
            {
                obj: new UiButton("当前Package", {
                    w: (width - 12) / 3, h: 26, size: 11,
                    onClick: () => { if (!getCurrentPackageName()) { toast("没有打开的组件"); return; } ScanController.scanCurrentPackage(); }
                }).view, w: (width - 12) / 3
            },
            {
                obj: new UiButton("整个项目", {
                    w: (width - 12) / 3, h: 26, size: 11,
                    onClick: () => { ScanController.scanWholeProject(); }
                }).view, w: (width - 12) / 3
            }
        ], 26);

        if (ScanController.scanning) {
            const p = ScanController.progress;
            const line = p ? `正在扫描（${p.current} / ${p.total}）：\n${p.currentName}` : "正在扫描…";
            col.add(createLabel(line, { size: 12, color: COLORS.warning, width: width, wrap: true }), 38);
            col.finish();
            content.AddChild(col.com);
            return;
        }

        const result = ScanController.lastResult;
        if (!result) {
            col.add(createLabel("尚未执行检查。\n点击上方按钮开始检查当前组件、当前 Package 或整个项目。", { size: 12, color: COLORS.textDim, width: width, wrap: true }), 34);
            col.finish();
            content.AddChild(col.com);
            return;
        }

        const scopeName = ScanController.lastScope == "project" ? "整个项目"
            : ScanController.lastScope == "package" ? `Package「${result.model.packageName}」`
                : `组件「${result.model.componentName}」`;
        col.add(createLabel(`检查范围：${scopeName}`, { size: 12, color: COLORS.textDim, width: width, wrap: true }), 18);
        col.add(createLabel(`✕ ${result.errorCount} 错误    ⚠ ${result.warningCount} 警告    ⓘ ${result.infoCount} 建议`, { size: 13, color: COLORS.text, bold: true }), 20);

        const fixable = result.issues.filter(i => i.fixable && i.fixType && i.fixType != "ackProtected");
        if (fixable.length > 0) {
            const btnFixAll = new UiButton(`一键修复安全项（${fixable.length}）`, {
                w: width, h: 26,
                onClick: () => {
                    const r = applySafeFixes(result.issues);
                    toast(`修复完成：成功 ${r.success} / 失败 ${r.failed}`);
                    ScanController.scanCurrentComponent();
                }
            });
            col.add(btnFixAll.view, 26);
        }

        const filters: { sev: string; label: string }[] = [
            { sev: "", label: "全部" },
            { sev: "error", label: "错误" },
            { sev: "warning", label: "警告" },
            { sev: "info", label: "建议" }
        ];
        const filterRow: { obj: FairyGUI.GObject; w: number }[] = [];
        for (const f of filters) {
            const btn = new UiButton(f.label, {
                w: (width - 18) / 4, h: 22, size: 11,
                bg: this.filterSeverity == f.sev ? COLORS.accent : COLORS.btnBg,
                hover: this.filterSeverity == f.sev ? COLORS.accentHover : COLORS.btnHover,
                color: this.filterSeverity == f.sev ? "#fff" : COLORS.text,
                onClick: () => { self.filterSeverity = f.sev; ScanController.notify(); }
            });
            filterRow.push({ obj: btn.view, w: (width - 18) / 4 });
        }
        col.row(filterRow, 22, 6);

        const cbIgnored = new UiCheckbox("显示已忽略（本次 + 永久）", this.showIgnored, (v) => { self.showIgnored = v; ScanController.notify(); }, { w: width });
        col.add(cbIgnored.view, 20);

        let issues = result.issues;
        if (this.showIgnored && ScanController.lastScope == "component" && result.model && result.model.docUrl) {
            issues = Engine.runOnModel(result.model, true);
        }
        if (this.filterSeverity) issues = issues.filter(i => i.severity == this.filterSeverity);
        if (issues.length == 0) {
            col.add(createLabel("✓ 没有符合筛选的问题", { size: 13, color: COLORS.ok }), 22);
        } else {
            const shown = issues.slice(0, 200);
            for (const issue of shown) {
                buildIssueRow(col, issue, width, { rebuild: () => ScanController.notify() });
            }
            if (issues.length > 200) {
                col.add(createLabel(`（仅显示前 200 条，共 ${issues.length} 条）`, { size: 11, color: COLORS.textDim }), 16);
            }
        }

        if (Store.permanentIgnoreCount > 0) {
            col.space(4);
            const btnClearIgnore = new UiButton(`清除全部永久忽略（${Store.permanentIgnoreCount}）`, {
                w: width, h: 22, size: 11,
                onClick: () => {
                    const n = Store.clearPermanentIgnores();
                    toast(`已清除 ${n} 条永久忽略`);
                    ScanController.notify();
                }
            });
            col.add(btnClearIgnore.view, 22);
        }

        col.finish();
        content.AddChild(col.com);
    }
}
