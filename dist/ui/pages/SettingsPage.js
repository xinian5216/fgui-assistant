"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsPage = void 0;
const UiKit_1 = require("../UiKit");
const Config_1 = require("../../core/Config");
const Api_1 = require("../../Api");
const ScanController_1 = require("../../services/ScanController");
const FontService_1 = require("../../services/FontService");
const Layout_1 = require("../Layout");
class SettingsPage {
    constructor() {
        this.id = "settings";
        this.title = "设置";
        this.footerHeight = Layout_1.LAYOUT.FOOTER_H;
    }
    build(ctx) {
        const content = ctx.content;
        const width = ctx.width;
        const col = new UiKit_1.Column(width, 6);
        const cfg = Config_1.Config.config;
        const self = this;
        col.add((0, UiKit_1.createLabel)("项目规范设置", { size: 14, bold: true, color: UiKit_1.COLORS.text }), 20);
        const dir = Config_1.Config.configDir || "(项目未打开)";
        col.add((0, UiKit_1.createLabel)(`配置文件：${dir}/config.json\n（可直接编辑该文件后点击「重新加载」）`, { size: 10, color: UiKit_1.COLORS.textDim, width: width, wrap: true }), 30);
        col.add((0, UiKit_1.createLabel)("按钮标准缩放", { size: 13, bold: true, color: UiKit_1.COLORS.text }), 18);
        col.row([
            { obj: (0, UiKit_1.createLabel)(`当前：${cfg.buttonScale}`, { size: 12, color: UiKit_1.COLORS.textDim, width: Math.max(40, width - 96), wrap: false }), w: width - 96 },
            {
                obj: new UiKit_1.UiButton("修改", {
                    w: 90, h: 22, size: 11,
                    onClick: () => {
                        Api_1.App.Input("按钮按下缩放标准值", "" + cfg.buttonScale, (ret) => {
                            const v = parseFloat(ret);
                            if (isNaN(v) || v <= 0 || v > 1) {
                                (0, UiKit_1.toast)("无效数值");
                                return;
                            }
                            Config_1.Config.update(c => { c.buttonScale = v; });
                            ScanController_1.ScanController.notify();
                        });
                    }
                }).view, w: 90
            }
        ], 24);
        self.buildStringList(col, width, "常用字体", cfg.fonts, "输入字体名称（需与系统/项目字体一致）", (arr) => Config_1.Config.update(c => { c.fonts = arr; }));
        self.buildStringList(col, width, "受保护的公共 Package", cfg.protectedPackages, "输入 Package 名称（如 Common）", (arr) => Config_1.Config.update(c => { c.protectedPackages = arr; }));
        col.add((0, UiKit_1.createLabel)("命名规则", { size: 13, bold: true, color: UiKit_1.COLORS.text }), 18);
        const rules = cfg.namingRules || {};
        for (const k of Object.keys(rules)) {
            col.row([
                { obj: (0, UiKit_1.createLabel)(`${k}  →  ${rules[k]}`, { size: 12, color: UiKit_1.COLORS.textDim, width: Math.max(40, width - 150), wrap: false }), w: width - 150 },
                {
                    obj: new UiKit_1.UiButton("修改", {
                        w: 66, h: 20, size: 11,
                        onClick: () => {
                            Api_1.App.Input(`${k} 的前缀（留空表示不检查）`, rules[k], (ret) => {
                                Config_1.Config.update(c => { c.namingRules[k] = ret || ""; });
                                ScanController_1.ScanController.notify();
                            });
                        }
                    }).view, w: 66
                },
                {
                    obj: new UiKit_1.UiButton("删除", {
                        w: 66, h: 20, size: 11,
                        onClick: () => {
                            (0, Api_1.confirm)(`删除 ${k} 的命名规则？`, (r) => {
                                if (r != "yes")
                                    return;
                                Config_1.Config.update(c => { delete c.namingRules[k]; });
                                ScanController_1.ScanController.notify();
                            });
                        }
                    }).view, w: 66
                }
            ], 22, 6);
        }
        const btnAddRule = new UiKit_1.UiButton("添加命名规则", {
            w: width, h: 22, size: 11,
            onClick: () => {
                Api_1.App.Input("类型名称（如 Button / List / Text / Image / Loader / Component / Controller / MovieClip / Graph）", "", (typeName) => {
                    if (!typeName)
                        return;
                    Api_1.App.Input(`${typeName} 的前缀`, "", (prefix) => {
                        Config_1.Config.update(c => { c.namingRules[typeName] = prefix || ""; });
                        ScanController_1.ScanController.notify();
                    });
                });
            }
        });
        col.add(btnAddRule.view, 22);
        col.add((0, UiKit_1.createLabel)("红点", { size: 13, bold: true, color: UiKit_1.COLORS.text }), 18);
        col.row([
            { obj: (0, UiKit_1.createLabel)(`控制器名匹配：${cfg.redDot.controllerNamePattern}`, { size: 12, color: UiKit_1.COLORS.textDim, width: Math.max(40, width - 96), wrap: false }), w: width - 96 },
            {
                obj: new UiKit_1.UiButton("修改", {
                    w: 90, h: 20, size: 11,
                    onClick: () => {
                        Api_1.App.Input("红点控制器名称包含的文字", cfg.redDot.controllerNamePattern, (ret) => {
                            if (!ret)
                                return;
                            Config_1.Config.update(c => { c.redDot.controllerNamePattern = ret; });
                            ScanController_1.ScanController.notify();
                        });
                    }
                }).view, w: 90
            }
        ], 22);
        col.finish();
        content.AddChild(col.com);
    }
    buildFooter(ctx) {
        const width = ctx.width;
        const content = ctx.content;
        const bw = (width - 12) / 3;
        const b1 = new UiKit_1.UiButton("重新加载配置", {
            w: bw, h: 24, size: 11,
            onClick: () => {
                Config_1.Config.load();
                (0, FontService_1.refreshFontCache)();
                ScanController_1.ScanController.notify();
                (0, UiKit_1.toast)("已重新加载");
            }
        });
        const b2 = new UiKit_1.UiButton("恢复默认", {
            w: bw, h: 24, size: 11,
            onClick: () => {
                (0, Api_1.confirm)("恢复默认配置？（当前配置将被覆盖）", (r) => {
                    if (r != "yes")
                        return;
                    Config_1.Config.update(c => {
                        const d = JSON.parse(JSON.stringify(Config_1.DEFAULT_CONFIG));
                        for (const k of Object.keys(d))
                            c[k] = d[k];
                    });
                    ScanController_1.ScanController.notify();
                    (0, UiKit_1.toast)("已恢复默认");
                });
            }
        });
        const b3 = new UiKit_1.UiButton("保存配置", {
            w: bw, h: 24, size: 11, bg: UiKit_1.COLORS.accent, hover: UiKit_1.COLORS.accentHover, color: "#fff",
            onClick: () => {
                (0, UiKit_1.toast)(Config_1.Config.save() ? "已保存" : "保存失败");
            }
        });
        b1.view.SetXY(0, 0);
        b2.view.SetXY(bw + 6, 0);
        b3.view.SetXY((bw + 6) * 2, 0);
        content.AddChild(b1.view);
        content.AddChild(b2.view);
        content.AddChild(b3.view);
    }
    buildStringList(col, width, title, items, inputHint, apply) {
        col.add((0, UiKit_1.createLabel)(title, { size: 13, bold: true, color: UiKit_1.COLORS.text }), 18);
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            col.row([
                { obj: (0, UiKit_1.createLabel)(item, { size: 12, color: UiKit_1.COLORS.textDim, width: Math.max(40, width - 78), wrap: false }), w: width - 78 },
                {
                    obj: new UiKit_1.UiButton("删除", {
                        w: 66, h: 20, size: 11,
                        onClick: () => {
                            (0, Api_1.confirm)(`删除「${item}」？`, (r) => {
                                if (r != "yes")
                                    return;
                                const arr = items.filter(x => x != item);
                                apply(arr);
                                ScanController_1.ScanController.notify();
                            });
                        }
                    }).view, w: 66
                }
            ], 22);
        }
        const btnAdd = new UiKit_1.UiButton("添加", {
            w: width, h: 20, size: 11,
            onClick: () => {
                Api_1.App.Input(inputHint, "", (ret) => {
                    if (!ret)
                        return;
                    if (items.indexOf(ret) >= 0) {
                        (0, UiKit_1.toast)("已存在");
                        return;
                    }
                    const arr = items.slice();
                    arr.push(ret);
                    apply(arr);
                    ScanController_1.ScanController.notify();
                });
            }
        });
        col.add(btnAdd.view, 20);
    }
}
exports.SettingsPage = SettingsPage;
