import { FairyGUI } from 'csharp';
import { Page, PageContext } from '../MainPanel';
import { Column, COLORS, UiButton, UiCheckbox, createLabel, toast } from '../UiKit';
import { Config, DEFAULT_CONFIG, orderedNamingKeys } from '../../core/Config';
import { App, confirm } from '../../Api';
import { ScanController } from '../../services/ScanController';
import { refreshFontCache } from '../../services/FontService';
import { LAYOUT } from '../Layout';

export class SettingsPage implements Page {
    id = "settings";
    title = "设置";
    footerHeight = LAYOUT.FOOTER_H;

    build(ctx: PageContext): void {
        const content = ctx.content;
        const width = ctx.width;
        const col = new Column(width, 6);
        const cfg = Config.config;
        const self = this;

        col.add(createLabel("项目规范设置", { size: 14, bold: true, color: COLORS.text }), 20);
        const dir = Config.configDir || "(项目未打开)";
        col.add(createLabel(`配置文件：${dir}/config.json\n（可直接编辑该文件后点击「重新加载」）`, { size: 10, color: COLORS.textDim, width: width, wrap: true }), 30);

        col.add(createLabel("按钮标准缩放", { size: 13, bold: true, color: COLORS.text }), 18);
        col.row([
            { obj: createLabel(`当前：${cfg.buttonScale}`, { size: 12, color: COLORS.textDim, width: Math.max(40, width - 96), wrap: false }), w: width - 96 },
            {
                obj: new UiButton("修改", {
                    w: 90, h: 22, size: 11,
                    onClick: () => {
                        App.Input("按钮按下缩放标准值", "" + cfg.buttonScale, (ret) => {
                            const v = parseFloat(ret);
                            if (isNaN(v) || v <= 0 || v > 1) { toast("无效数值"); return; }
                            Config.update(c => { c.buttonScale = v; });
                            ScanController.notify();
                        });
                    }
                }).view, w: 90
            }
        ], 24);

        self.buildStringList(col, width, "常用字体", cfg.fonts, "输入字体名称（需与系统/项目字体一致）",
            (arr) => Config.update(c => { c.fonts = arr; }));

        self.buildStringList(col, width, "受保护的公共 Package", cfg.protectedPackages, "输入 Package 名称（如 Common）",
            (arr) => Config.update(c => { c.protectedPackages = arr; }));

        col.add(createLabel("命名规则", { size: 13, bold: true, color: COLORS.text }), 18);
        const rules = cfg.namingRules || {};
        const ruleKeys = orderedNamingKeys(rules);
        for (const k of ruleKeys) {
            col.row([
                { obj: createLabel(`${k}  →  ${rules[k]}`, { size: 12, color: COLORS.textDim, width: Math.max(40, width - 150), wrap: false }), w: width - 150 },
                {
                    obj: new UiButton("修改", {
                        w: 66, h: 20, size: 11,
                        onClick: () => {
                            App.Input(`${k} 的前缀（留空表示不检查）`, rules[k], (ret) => {
                                Config.update(c => { c.namingRules[k] = ret || ""; });
                                ScanController.notify();
                            });
                        }
                    }).view, w: 66
                },
                {
                    obj: new UiButton("删除", {
                        w: 66, h: 20, size: 11,
                        onClick: () => {
                            confirm(`删除 ${k} 的命名规则？`, (r) => {
                                if (r != "yes") return;
                                Config.update(c => { delete c.namingRules[k]; });
                                ScanController.notify();
                            });
                        }
                    }).view, w: 66
                }
            ], 22, 6);
        }
        const btnAddRule = new UiButton("添加命名规则", {
            w: width, h: 22, size: 11,
            onClick: () => {
                App.Input("类型名称（如 Text / Image / Button / List / ProgressBar / ComboBox / Loader / Component / Controller）", "", (typeName) => {
                    if (!typeName) return;
                    App.Input(`${typeName} 的前缀`, "", (prefix) => {
                        Config.update(c => { c.namingRules[typeName] = prefix || ""; });
                        ScanController.notify();
                    });
                });
            }
        });
        col.add(btnAddRule.view, 22);

        col.add(createLabel("红点", { size: 13, bold: true, color: COLORS.text }), 18);
        col.row([
            { obj: createLabel(`控制器名匹配：${cfg.redDot.controllerNamePattern}`, { size: 12, color: COLORS.textDim, width: Math.max(40, width - 96), wrap: false }), w: width - 96 },
            {
                obj: new UiButton("修改", {
                    w: 90, h: 20, size: 11,
                    onClick: () => {
                        App.Input("红点控制器名称包含的文字", cfg.redDot.controllerNamePattern, (ret) => {
                            if (!ret) return;
                            Config.update(c => { c.redDot.controllerNamePattern = ret; });
                            ScanController.notify();
                        });
                    }
                }).view, w: 90
            }
        ], 22);

        const svnPath = (cfg.svn && cfg.svn.tortoiseProcPath) || DEFAULT_CONFIG.svn.tortoiseProcPath;
        col.add(createLabel("SVN 工具", { size: 13, bold: true, color: COLORS.text }), 18);
        col.add(createLabel(`TortoiseProc：${svnPath}`, { size: 11, color: COLORS.textDim, width: width, wrap: true }), 26);
        col.add(new UiButton("修改 TortoiseProc 路径", {
            w: width, h: 20, size: 11,
            onClick: () => {
                App.Input("TortoiseProc.exe 完整路径", svnPath, (ret) => {
                    if (!ret) return;
                    Config.update(c => {
                        if (!c.svn) c.svn = { tortoiseProcPath: ret };
                        else c.svn.tortoiseProcPath = ret;
                    });
                    ScanController.notify();
                });
            }
        }).view, 20);

        const rc = cfg.resourceCheck || DEFAULT_CONFIG.resourceCheck;
        col.add(createLabel("资源体检", { size: 13, bold: true, color: COLORS.text }), 18);
        col.row([
            { obj: createLabel(`大图阈值：${rc.maxImageKB} KB`, { size: 12, color: COLORS.textDim, width: Math.max(40, width - 96), wrap: false }), w: width - 96 },
            {
                obj: new UiButton("修改", {
                    w: 90, h: 20, size: 11,
                    onClick: () => {
                        App.Input("超大图片阈值（KB，正整数）", "" + rc.maxImageKB, (ret) => {
                            const v = parseInt(ret, 10);
                            if (isNaN(v) || v <= 0) { toast("请输入正整数"); return; }
                            Config.update(c => {
                                if (!c.resourceCheck) c.resourceCheck = { maxImageKB: v, checkDuplicate: true };
                                else c.resourceCheck.maxImageKB = v;
                            });
                            ScanController.notify();
                        });
                    }
                }).view, w: 90
            }
        ], 22);
        const cbDup = new UiCheckbox("检测重复图片（MD5）", !!rc.checkDuplicate, (v) => {
            Config.update(c => {
                if (!c.resourceCheck) c.resourceCheck = { maxImageKB: rc.maxImageKB, checkDuplicate: v };
                else c.resourceCheck.checkDuplicate = v;
            });
        }, { w: width });
        col.add(cbDup.view, 20);

        col.finish();
        content.AddChild(col.com);
    }

    buildFooter(ctx: PageContext): void {
        const width = ctx.width;
        const content = ctx.content;
        const bw = (width - 12) / 3;
        const b1 = new UiButton("重新加载配置", {
            w: bw, h: 24, size: 11,
            onClick: () => {
                Config.load();
                refreshFontCache();
                ScanController.notify();
                toast("已重新加载");
            }
        });
        const b2 = new UiButton("恢复默认", {
            w: bw, h: 24, size: 11,
            onClick: () => {
                confirm("恢复默认配置？（当前配置将被覆盖）", (r) => {
                    if (r != "yes") return;
                    Config.update(c => {
                        const d = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
                        for (const k of Object.keys(d)) (c as any)[k] = d[k];
                    });
                    ScanController.notify();
                    toast("已恢复默认");
                });
            }
        });
        const b3 = new UiButton("保存配置", {
            w: bw, h: 24, size: 11, bg: COLORS.accent, hover: COLORS.accentHover, color: "#fff",
            onClick: () => {
                toast(Config.save() ? "已保存" : "保存失败");
            }
        });
        b1.view.SetXY(0, 0);
        b2.view.SetXY(bw + 6, 0);
        b3.view.SetXY((bw + 6) * 2, 0);
        content.AddChild(b1.view);
        content.AddChild(b2.view);
        content.AddChild(b3.view);
    }

    private buildStringList(col: Column, width: number, title: string, items: string[], inputHint: string, apply: (arr: string[]) => void): void {
        col.add(createLabel(title, { size: 13, bold: true, color: COLORS.text }), 18);
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            col.row([
                { obj: createLabel(item, { size: 12, color: COLORS.textDim, width: Math.max(40, width - 78), wrap: false }), w: width - 78 },
                {
                    obj: new UiButton("删除", {
                        w: 66, h: 20, size: 11,
                        onClick: () => {
                            confirm(`删除「${item}」？`, (r) => {
                                if (r != "yes") return;
                                const arr = items.filter(x => x != item);
                                apply(arr);
                                ScanController.notify();
                            });
                        }
                    }).view, w: 66
                }
            ], 22);
        }
        const btnAdd = new UiButton("添加", {
            w: width, h: 20, size: 11,
            onClick: () => {
                App.Input(inputHint, "", (ret) => {
                    if (!ret) return;
                    if (items.indexOf(ret) >= 0) { toast("已存在"); return; }
                    const arr = items.slice();
                    arr.push(ret);
                    apply(arr);
                    ScanController.notify();
                });
            }
        });
        col.add(btnAdd.view, 20);
    }
}
