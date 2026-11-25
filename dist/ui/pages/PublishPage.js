"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublishPage = void 0;
const csharp_1 = require("csharp");
const UiKit_1 = require("../UiKit");
const Config_1 = require("../../core/Config");
const Store_1 = require("../../core/Store");
const Api_1 = require("../../Api");
const EditorService_1 = require("../../services/EditorService");
const ScanService_1 = require("../../services/ScanService");
const SvnService_1 = require("../../services/SvnService");
const Layout_1 = require("../Layout");
const AUTO_STEP_INDEX = 3;
class PublishPage {
    constructor() {
        this.id = "publish";
        this.title = "发布流程";
        this.footerHeight = Layout_1.LAYOUT.FOOTER_H;
    }
    build(ctx) {
        const content = ctx.content;
        const width = ctx.width;
        const col = new UiKit_1.Column(width, 6);
        const cfg = Config_1.Config.config;
        const steps = cfg.publishChecklist || [];
        const state = Store_1.Store.publish;
        const self = this;
        col.add((0, UiKit_1.createLabel)("发布流程（标注 ⓟ 的步骤由插件检测，其余为人工确认项）", { size: 12, color: UiKit_1.COLORS.textDim, width: width, wrap: true }), 32);
        for (let i = 0; i < steps.length; i++) {
            const label = steps[i];
            const isAuto = i == AUTO_STEP_INDEX;
            const checked = state.steps.length > i ? !!state.steps[i] : false;
            const box = new csharp_1.FairyGUI.GComponent();
            let y = 0;
            const cb = new UiKit_1.UiCheckbox(`${i + 1}. ${label}${isAuto ? "  ⓟ" : ""}`, checked, (v) => {
                Store_1.Store.setPublishStep(i, v, steps.length);
            }, { w: width });
            cb.view.SetXY(0, y);
            box.AddChild(cb.view);
            y += 22;
            if (i == 0) {
                const bw = Math.max(80, Math.min(125, Math.floor((width - 30) / 2)));
                const row = new csharp_1.FairyGUI.GComponent();
                const btnSvn = new UiKit_1.UiButton("执行 SVN 更新", {
                    w: bw, h: 20, size: 11,
                    onClick: () => { (0, SvnService_1.svnUpdateProject)(); }
                });
                btnSvn.view.SetXY(24, 0);
                row.AddChild(btnSvn.view);
                const btn = new UiKit_1.UiButton("记录 Update 时间", {
                    w: bw, h: 20, size: 11,
                    onClick: () => {
                        Store_1.Store.markSvnUpdate();
                        Store_1.Store.setPublishStep(0, true, steps.length);
                        (0, UiKit_1.toast)("已记录 " + (0, Api_1.nowStr)());
                        ScanNotify();
                    }
                });
                btn.view.SetXY(24 + bw + 6, 0);
                row.AddChild(btn.view);
                row.SetSize(width, 22);
                box.AddChild(row);
                row.SetXY(0, y);
                y += 24;
                const lastStr = state.lastSvnUpdate ? `上次确认：${formatTime(state.lastSvnUpdate)}` : "尚未记录";
                const lb = (0, UiKit_1.createLabel)(lastStr, { size: 11, color: UiKit_1.COLORS.textDim, width: width - 30, wrap: true });
                lb.SetXY(24, y);
                box.AddChild(lb);
                y += lb.height + 4;
            }
            if (i == 2) {
                const btn = new UiKit_1.UiButton("检查发布设置", {
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
                const lb = (0, UiKit_1.createLabel)(text, { size: 11, color: lp ? UiKit_1.COLORS.ok : UiKit_1.COLORS.textDim, width: width - 30, wrap: true });
                lb.SetXY(24, y);
                box.AddChild(lb);
                y += lb.height + 4;
                if (lp && lp.exportPath) {
                    const bw = Math.max(80, Math.min(115, Math.floor((width - 30) / 2)));
                    const bOpen = new UiKit_1.UiButton("打开发布目录", {
                        w: bw, h: 20, size: 11,
                        onClick: () => {
                            if (!(0, Api_1.dirExists)(lp.exportPath)) {
                                (0, Api_1.alert)("目录不存在：" + lp.exportPath);
                                return;
                            }
                            if (!(0, Api_1.revealInExplorer)(lp.exportPath))
                                (0, UiKit_1.toast)("打开目录失败");
                        }
                    });
                    bOpen.view.SetXY(24, y);
                    box.AddChild(bOpen.view);
                    const bCopy = new UiKit_1.UiButton("复制路径", {
                        w: bw, h: 20, size: 11,
                        onClick: () => {
                            if ((0, Api_1.copyToClipboard)(lp.exportPath))
                                (0, UiKit_1.toast)("已复制发布路径");
                            else
                                (0, UiKit_1.toast)("复制失败，路径：" + lp.exportPath);
                        }
                    });
                    bCopy.view.SetXY(24 + bw + 6, y);
                    box.AddChild(bCopy.view);
                    y += 24;
                }
            }
            if (i == steps.length - 1) {
                const lb = (0, UiKit_1.createLabel)("提交前请确认：\n□ 已重新 SVN Update\n□ 当前 Commit 仅涉及一个目标目录", { size: 11, color: UiKit_1.COLORS.warning, width: width - 30, wrap: true });
                lb.SetXY(24, y);
                box.AddChild(lb);
                y += lb.height + 4;
                const bCi = new UiKit_1.UiButton("SVN 提交当前包", {
                    w: Math.min(160, Math.max(100, width - 30)), h: 22, size: 11,
                    onClick: () => { (0, SvnService_1.svnCommitCurrentPackage)(); }
                });
                bCi.view.SetXY(24, y);
                box.AddChild(bCi.view);
                y += 26;
            }
            box.SetSize(width, y);
            col.add(box, y);
        }
        col.finish();
        content.AddChild(col.com);
    }
    buildFooter(ctx) {
        const width = ctx.width;
        const content = ctx.content;
        const bw = (width - 6) / 2;
        const b1 = new UiKit_1.UiButton("重置流程", {
            w: bw, h: 24, size: 11,
            onClick: () => {
                Store_1.Store.resetPublishSteps();
                ScanNotify();
                (0, UiKit_1.toast)("已重置");
            }
        });
        const b2 = new UiKit_1.UiButton("全部标记完成", {
            w: bw, h: 24, size: 11,
            onClick: () => {
                const steps = (Config_1.Config.config.publishChecklist || []).length;
                for (let i = 0; i < steps; i++)
                    Store_1.Store.setPublishStep(i, true, steps);
                ScanNotify();
            }
        });
        b1.view.SetXY(0, 0);
        b2.view.SetXY(bw + 6, 0);
        content.AddChild(b1.view);
        content.AddChild(b2.view);
    }
    showPublishSettings() {
        const pkgName = (0, EditorService_1.getCurrentPackageName)();
        if (!pkgName) {
            (0, Api_1.alert)("没有打开的组件，无法确定 Package");
            return;
        }
        const pkg = (0, ScanService_1.getPackageByName)(pkgName);
        if (!pkg) {
            (0, Api_1.alert)("未找到 Package: " + pkgName);
            return;
        }
        try {
            const ps = pkg.publishSettings;
            const msg = `Package：${pkgName}\n发布路径：${safeStr(() => ps.path)}\n文件名：${safeStr(() => ps.fileName)}\n生成代码：${safeBool(() => ps.genCode) ? "是" : "否"}\n代码路径：${safeStr(() => ps.codePath)}`;
            Api_1.App.Alert(msg);
        }
        catch (e) {
            Api_1.App.Alert("读取发布设置失败: " + e);
        }
    }
}
exports.PublishPage = PublishPage;
function safeStr(fn) {
    try {
        const v = fn();
        return v === null || v === undefined ? "(空)" : "" + v;
    }
    catch (e) {
        return "(读取失败)";
    }
}
function safeBool(fn) {
    try {
        return !!fn();
    }
    catch (e) {
        return false;
    }
}
function formatTime(iso) {
    try {
        const d = new Date(iso);
        const p = (n) => (n < 10 ? "0" + n : "" + n);
        const today = new Date();
        const sameDay = d.getFullYear() == today.getFullYear() && d.getMonth() == today.getMonth() && d.getDate() == today.getDate();
        if (sameDay)
            return `${p(d.getHours())}:${p(d.getMinutes())}`;
        return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    }
    catch (e) {
        return iso;
    }
}
const ScanController_1 = require("../../services/ScanController");
function ScanNotify() {
    ScanController_1.ScanController.notify();
}
