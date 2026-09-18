import { FairyGUI } from 'csharp';
import { Page, PageContext } from '../MainPanel';
import { Column, COLORS, UiButton, UiCheckbox, createLabel, toast } from '../UiKit';
import { Config } from '../../core/Config';
import { Store } from '../../core/Store';
import { App, nowStr, alert } from '../../Api';
import { getCurrentPackageName } from '../../services/EditorService';
import { getPackageByName } from '../../services/ScanService';
import { LAYOUT } from '../Layout';

const AUTO_STEP_INDEX = 3;

export class PublishPage implements Page {
    id = "publish";
    title = "发布流程";
    footerHeight = LAYOUT.FOOTER_H;

    build(ctx: PageContext): void {
        const content = ctx.content;
        const width = ctx.width;
        const col = new Column(width, 6);
        const cfg = Config.config;
        const steps = cfg.publishChecklist || [];
        const state = Store.publish;
        const self = this;

        col.add(createLabel("发布流程（标注 ⓟ 的步骤由插件检测，其余为人工确认项）", { size: 12, color: COLORS.textDim, width: width, wrap: true }), 32);

        for (let i = 0; i < steps.length; i++) {
            const label = steps[i];
            const isAuto = i == AUTO_STEP_INDEX;
            const checked = state.steps.length > i ? !!state.steps[i] : false;
            const box = new FairyGUI.GComponent();
            let y = 0;
            const cb = new UiCheckbox(`${i + 1}. ${label}${isAuto ? "  ⓟ" : ""}`, checked, (v) => {
                Store.setPublishStep(i, v, steps.length);
            }, { w: width });
            cb.view.SetXY(0, y);
            box.AddChild(cb.view);
            y += 22;

            if (i == 0) {
                const row: FairyGUI.GComponent = new FairyGUI.GComponent();
                const btn = new UiButton("记录本次 SVN Update 时间", {
                    w: 170, h: 20, size: 11,
                    onClick: () => {
                        Store.markSvnUpdate();
                        Store.setPublishStep(0, true, steps.length);
                        toast("已记录 " + nowStr());
                        ScanNotify();
                    }
                });
                btn.view.SetXY(24, 0);
                row.AddChild(btn.view);
                const lastStr = state.lastSvnUpdate ? `上次确认：${formatTime(state.lastSvnUpdate)}` : "尚未记录";
                const lb = createLabel(lastStr, { size: 11, color: COLORS.textDim });
                lb.SetXY(200, 3);
                row.AddChild(lb);
                row.SetSize(width, 22);
                box.AddChild(row);
                row.SetXY(0, y);
                y += 24;
            }
            if (i == 2) {
                const btn = new UiButton("检查发布设置", {
                    w: 150, h: 20, size: 11,
                    onClick: () => { self.showPublishSettings(); }
                });
                btn.view.SetXY(24, y);
                box.AddChild(btn.view);
                y += 24;
            }
            if (i == 4) {
                const lp = state.lastPublish;
                const text = lp ? `本次实际发布目录：\n${lp.exportPath}\n（${lp.pkg}，${formatTime(lp.time)}）` : "本次会话尚未检测到发布（发布后自动显示）";
                const lb = createLabel(text, { size: 11, color: lp ? COLORS.ok : COLORS.textDim, width: width - 30, wrap: true });
                lb.SetXY(24, y);
                box.AddChild(lb);
                y += lb.height + 4;
            }
            if (i == steps.length - 1) {
                const lb = createLabel("提交前请确认：\n□ 已重新 SVN Update\n□ 当前 Commit 仅涉及一个目标目录", { size: 11, color: COLORS.warning, width: width - 30, wrap: true });
                lb.SetXY(24, y);
                box.AddChild(lb);
                y += lb.height + 4;
            }
            box.SetSize(width, y);
            col.add(box, y);
        }

        col.finish();
        content.AddChild(col.com);
    }

    buildFooter(ctx: PageContext): void {
        const width = ctx.width;
        const content = ctx.content;
        const bw = (width - 6) / 2;
        const b1 = new UiButton("重置流程", {
            w: bw, h: 24, size: 11,
            onClick: () => {
                Store.resetPublishSteps();
                ScanNotify();
                toast("已重置");
            }
        });
        const b2 = new UiButton("全部标记完成", {
            w: bw, h: 24, size: 11,
            onClick: () => {
                const steps = (Config.config.publishChecklist || []).length;
                for (let i = 0; i < steps; i++) Store.setPublishStep(i, true, steps);
                ScanNotify();
            }
        });
        b1.view.SetXY(0, 0);
        b2.view.SetXY(bw + 6, 0);
        content.AddChild(b1.view);
        content.AddChild(b2.view);
    }

    private showPublishSettings(): void {
        const pkgName = getCurrentPackageName();
        if (!pkgName) { alert("没有打开的组件，无法确定 Package"); return; }
        const pkg = getPackageByName(pkgName);
        if (!pkg) { alert("未找到 Package: " + pkgName); return; }
        try {
            const ps = pkg.publishSettings;
            const msg = `Package：${pkgName}\n发布路径：${safeStr(() => ps.path)}\n文件名：${safeStr(() => ps.fileName)}\n生成代码：${safeBool(() => ps.genCode) ? "是" : "否"}\n代码路径：${safeStr(() => ps.codePath)}`;
            App.Alert(msg);
        } catch (e) {
            App.Alert("读取发布设置失败: " + e);
        }
    }
}

function safeStr(fn: () => any): string {
    try { const v = fn(); return v === null || v === undefined ? "(空)" : "" + v; } catch (e) { return "(读取失败)"; }
}
function safeBool(fn: () => any): boolean {
    try { return !!fn(); } catch (e) { return false; }
}

function formatTime(iso: string): string {
    try {
        const d = new Date(iso);
        const p = (n: number) => (n < 10 ? "0" + n : "" + n);
        const today = new Date();
        const sameDay = d.getFullYear() == today.getFullYear() && d.getMonth() == today.getMonth() && d.getDate() == today.getDate();
        if (sameDay) return `${p(d.getHours())}:${p(d.getMinutes())}`;
        return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    } catch (e) { return iso; }
}

import { ScanController } from '../../services/ScanController';
function ScanNotify(): void {
    ScanController.notify();
}
