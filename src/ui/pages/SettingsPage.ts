import { FairyGUI } from 'csharp';
import { Page } from '../MainPanel';
import { Column, COLORS, UiButton, createLabel, createHLine, toast } from '../UiKit';
import { Config, DEFAULT_CONFIG } from '../../core/Config';
import { App, confirm } from '../../Api';
import { ScanController } from '../../services/ScanController';
import { refreshFontCache } from '../../services/FontService';

export class SettingsPage implements Page {
    id = "settings";
    title = "设置";

    build(content: FairyGUI.GComponent, width: number): void {
        const col = new Column(width, 6);
        const cfg = Config.config;
        const self = this;

        col.add(createLabel("项目规范设置", { size: 14, bold: true, color: COLORS.text }), 20);
        const dir = Config.configDir || "(项目未打开)";
        col.add(createLabel(`配置文件：${dir}/config.json\n（可直接编辑该文件后点击「重新加载」）`, { size: 10, color: COLORS.textDim, width: width, wrap: true }), 30);

        col.add(createLabel("按钮标准缩放", { size: 13, bold: true, color: COLORS.text }), 18);
        col.row([
            { obj: createLabel(`当前：${cfg.buttonScale}`, { size: 12, color: COLORS.textDim }), w: width - 96 },
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
        for (const k of Object.keys(rules)) {
            col.row([
                { obj: createLabel(`${k}  →  ${rules[k]}`, { size: 12, color: COLORS.textDim }), w: width - 150 },
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
                App.Input("类型名称（如 Button / List / Text / Image / Loader / Component / Controller / MovieClip / Graph）", "", (typeName) => {
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
            { obj: createLabel(`控制器名匹配：${cfg.redDot.controllerNamePattern}`, { size: 12, color: COLORS.textDim }), w: width - 96 },
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

        col.add(createHLine(width - 4), 1);
        col.row([
            {
                obj: new UiButton("重新加载配置", {
                    w: (width - 12) / 3, h: 24, size: 11,
                    onClick: () => {
                        Config.load();
                        refreshFontCache();
                        ScanController.notify();
                        toast("已重新加载");
                    }
                }).view, w: (width - 12) / 3
            },
            {
                obj: new UiButton("恢复默认", {
                    w: (width - 12) / 3, h: 24, size: 11,
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
                }).view, w: (width - 12) / 3
            },
            {
                obj: new UiButton("保存配置", {
                    w: (width - 12) / 3, h: 24, size: 11, bg: COLORS.accent, hover: COLORS.accentHover, color: "#fff",
                    onClick: () => {
                        toast(Config.save() ? "已保存" : "保存失败");
                    }
                }).view, w: (width - 12) / 3
            }
        ], 24, 6);

        col.finish();
        content.AddChild(col.com);
    }

    private buildStringList(col: Column, width: number, title: string, items: string[], inputHint: string, apply: (arr: string[]) => void): void {
        col.add(createLabel(title, { size: 13, bold: true, color: COLORS.text }), 18);
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            col.row([
                { obj: createLabel(item, { size: 12, color: COLORS.textDim }), w: width - 78 },
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
