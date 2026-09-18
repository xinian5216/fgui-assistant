import { FairyGUI } from 'csharp';
import { Page, PageContext } from '../MainPanel';
import { Column, COLORS, UiButton, createLabel, createGraph, toast } from '../UiKit';
import { ScanController } from '../../services/ScanController';
import { getCurrentPackageName, getCurrentComponentName, getActiveDoc } from '../../services/EditorService';
import { Config } from '../../core/Config';
import { Store } from '../../core/Store';
import { applySafeFixes } from '../../services/FixService';
import { createIssueItem } from '../IssueView';
import { LAYOUT } from '../Layout';

export class HomePage implements Page {
    id = "home";
    title = "首页";

    build(ctx: PageContext): void {
        const content = ctx.content;
        const width = ctx.width;
        const col = new Column(width, 6);
        const pkgName = getCurrentPackageName();
        const comName = getCurrentComponentName();
        const doc = getActiveDoc();

        col.add(createLabel("FGUI Assistant", { size: 16, bold: true, color: COLORS.text }), 22);

        const isProtected = pkgName && (Config.config.protectedPackages || []).indexOf(pkgName) >= 0;
        if (isProtected) {
            const banner = new FairyGUI.GComponent();
            const bh = 52;
            banner.SetSize(width, bh);
            const bg = createGraph(width, bh, "#4a3525");
            banner.AddChild(bg);
            const t1 = createLabel("🔒 公共资源：" + pkgName, { size: 13, bold: true, color: "#e8b45a" });
            t1.SetXY(8, 5);
            banner.AddChild(t1);
            const t2 = createLabel("原则上不要修改源组件，只允许在引用实例表面调整。", { size: 11, color: "#d9c29a", width: width - 16, wrap: true });
            t2.SetXY(8, 24);
            banner.AddChild(t2);
            col.add(banner, bh);
        }

        const infoText = doc
            ? `当前 Package：${pkgName || "-"}\n当前组件：${comName || "-"}`
            : "当前没有打开的组件\n打开组件后可使用检查与快速设置";
        col.add(createLabel(infoText, { size: 12, color: COLORS.textDim, width: width, wrap: true }), 34);

        const result = ScanController.lastResult;
        if (result) {
            const summary = `最近检查（${result.model.componentName}）\n✕ ${result.errorCount} 项错误    ⚠ ${result.warningCount} 项警告    ⓘ ${result.infoCount} 项建议`;
            col.add(createLabel(summary, { size: 12, color: COLORS.text, width: width, wrap: true }), 34);
            const important = result.issues.filter(i => i.severity == "error" || i.severity == "warning");
            const rest = result.issues.filter(i => i.severity != "error" && i.severity != "warning");
            const shown = important.concat(rest).slice(0, LAYOUT.HOME_MAX_ISSUES);
            if (shown.length > 0) {
                col.add(createLabel("最近问题：", { size: 12, color: COLORS.textDim }), 16);
                for (const issue of shown) {
                    const row = createIssueItem(issue, width, { rebuild: () => ScanController.scanCurrentComponent() });
                    col.add(row, LAYOUT.ISSUE_ITEM_H);
                }
            }
            const btnAll = new UiButton("查看全部问题 →", {
                w: width, h: 24, size: 12,
                onClick: () => { ctx.navigate("check"); }
            });
            col.add(btnAll.view, 24);
        } else {
            col.add(createLabel("尚未执行检查", { size: 12, color: COLORS.textDim }), 16);
        }

        const btnScan = new UiButton("检查当前组件", {
            w: width, h: 28, bg: COLORS.accent, hover: COLORS.accentHover, color: "#ffffff",
            onClick: () => {
                if (!getActiveDoc()) { toast("没有打开的组件"); return; }
                ScanController.scanCurrentComponent();
                toast("检查完成");
            }
        });
        col.add(btnScan.view, 28);

        const fixableCount = result ? result.issues.filter(i => i.fixable && i.fixType && i.fixType != "ackProtected").length : 0;
        const btnFixAll = new UiButton(`一键修复安全项（${fixableCount}）`, {
            w: width, h: 28,
            onClick: () => {
                if (!result) { toast("请先执行检查"); return; }
                const r = applySafeFixes(result.issues);
                toast(`修复完成：成功 ${r.success} / 失败 ${r.failed}`);
                ScanController.scanCurrentComponent();
            }
        });
        btnFixAll.setEnabled(fixableCount > 0);
        col.add(btnFixAll.view, 28);

        const btnScanPkg = new UiButton("检查当前 Package", {
            w: width, h: 26,
            onClick: () => {
                const pkg = getCurrentPackageName();
                if (!pkg) { toast("没有打开的组件"); return; }
                ScanController.scanCurrentPackage();
            }
        });
        col.add(btnScanPkg.view, 26);

        const btnScanProject = new UiButton("检查整个项目", {
            w: width, h: 26,
            onClick: () => {
                ScanController.scanWholeProject();
            }
        });
        col.add(btnScanProject.view, 26);

        const publish = Store.publish;
        if (publish.lastPublish) {
            const lp = publish.lastPublish;
            col.space(4);
            col.add(createLabel(`最近发布：${lp.pkg}\n${lp.exportPath}`, { size: 11, color: COLORS.textDim, width: width, wrap: true }), 30);
        }

        col.finish();
        content.AddChild(col.com);
    }
}
