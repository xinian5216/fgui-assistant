"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuickPage = void 0;
const csharp_1 = require("csharp");
const UiKit_1 = require("../UiKit");
const EditorService_1 = require("../../services/EditorService");
const Config_1 = require("../../core/Config");
const FontService_1 = require("../../services/FontService");
const ScanController_1 = require("../../services/ScanController");
function selectedOfType(pred) {
    return (0, EditorService_1.getSelection)().filter(pred);
}
function isButton(obj) {
    return (0, EditorService_1.getExtType)(obj) == "Button";
}
function isText(obj) {
    const t = obj.objectType;
    return t == "text" || t == "richtext" || t == "inputtext";
}
class QuickPage {
    constructor() {
        this.id = "quick";
        this.title = "快速设置";
    }
    build(content, width) {
        const col = new UiKit_1.Column(width, 6);
        const self = this;
        const selection = (0, EditorService_1.getSelection)();
        const cfg = Config_1.Config.config;
        const selDesc = selection.length == 0
            ? "当前没有选中对象\n在舞台或库中选择对象后可批量应用以下设置"
            : `当前选中 ${selection.length} 个对象：${selection.slice(0, 3).map(o => { try {
                return o.name;
            }
            catch (e) {
                return "?";
            } }).join("、")}${selection.length > 3 ? " 等" : ""}`;
        col.add((0, UiKit_1.createLabel)(selDesc, { size: 12, color: UiKit_1.COLORS.textDim, width: width, wrap: true }), selection.length == 0 ? 34 : 20);
        col.add((0, UiKit_1.createLabel)("按钮", { size: 13, bold: true, color: UiKit_1.COLORS.text }), 18);
        const btnScale = new UiKit_1.UiButton(`设置缩放 ${cfg.buttonScale}`, {
            w: (width - 6) / 2, h: 26,
            onClick: () => {
                const targets = selectedOfType(isButton);
                if (targets.length == 0) {
                    (0, UiKit_1.toast)("请选中按钮对象");
                    return;
                }
                let ok = 0;
                for (const obj of targets) {
                    let r = (0, EditorService_1.setObjExtProperty)(obj, "downEffect", "scale");
                    r = (0, EditorService_1.setObjExtProperty)(obj, "downEffectValue", cfg.buttonScale) && r;
                    if (r)
                        ok++;
                }
                (0, UiKit_1.toast)(`已设置 ${ok}/${targets.length} 个按钮缩放为 ${cfg.buttonScale}`);
                ScanController_1.ScanController.scanCurrentComponent();
            }
        });
        const btnRadio = new UiKit_1.UiButton("设为单选按钮", {
            w: (width - 6) / 2, h: 26,
            onClick: () => {
                const targets = selectedOfType(isButton);
                if (targets.length == 0) {
                    (0, UiKit_1.toast)("请选中按钮对象");
                    return;
                }
                let radioVal = "radio";
                try {
                    radioVal = "" + csharp_1.FairyEditor.FButton.RADIO;
                }
                catch (e) { }
                let ok = 0;
                for (const obj of targets) {
                    if ((0, EditorService_1.setObjExtProperty)(obj, "mode", radioVal))
                        ok++;
                }
                (0, UiKit_1.toast)(`已将 ${ok}/${targets.length} 个按钮设为单选`);
                ScanController_1.ScanController.scanCurrentComponent();
            }
        });
        col.row([{ obj: btnScale.view, w: (width - 6) / 2 }, { obj: btnRadio.view, w: (width - 6) / 2 }], 26);
        col.add((0, UiKit_1.createLabel)("提示：是否应为单选按钮需人工判断，插件不会自动设置", { size: 10, color: UiKit_1.COLORS.textDim, width: width, wrap: true }), 16);
        col.add((0, UiKit_1.createLabel)("文字", { size: 13, bold: true, color: UiKit_1.COLORS.text }), 18);
        const btnPivot = new UiKit_1.UiButton("轴心居中", {
            w: (width - 6) / 2, h: 26,
            onClick: () => {
                const targets = selectedOfType(isText);
                if (targets.length == 0) {
                    (0, UiKit_1.toast)("请选中文字对象");
                    return;
                }
                let ok = 0;
                for (const obj of targets) {
                    let r = (0, EditorService_1.setObjProperty)(obj, "pivotX", 0.5);
                    r = (0, EditorService_1.setObjProperty)(obj, "pivotY", 0.5) && r;
                    r = (0, EditorService_1.setObjProperty)(obj, "anchor", true) && r;
                    if (r)
                        ok++;
                }
                (0, UiKit_1.toast)(`已将 ${ok}/${targets.length} 个文字轴心设为中心`);
                ScanController_1.ScanController.scanCurrentComponent();
            }
        });
        col.row([{ obj: btnPivot.view, w: (width - 6) / 2 }], 26);
        col.add((0, UiKit_1.createLabel)("字体", { size: 13, bold: true, color: UiKit_1.COLORS.text }), 18);
        for (const font of cfg.fonts) {
            const exists = (0, FontService_1.fontExists)(font);
            const label = exists ? font : `${font}（未找到）`;
            const btn = new UiKit_1.UiButton(label, {
                w: width, h: 24, size: 12,
                bg: exists ? UiKit_1.COLORS.btnBg : "#4a3a3a",
                hover: exists ? UiKit_1.COLORS.btnHover : "#5a4444",
                onClick: () => {
                    const targets = selectedOfType(isText);
                    if (targets.length == 0) {
                        (0, UiKit_1.toast)("请选中文字对象");
                        return;
                    }
                    if (!(0, FontService_1.fontExists)(font)) {
                        (0, UiKit_1.toast)(`字体「${font}」未安装或未在项目中找到，请确认`);
                    }
                    let ok = 0;
                    for (const obj of targets) {
                        if ((0, EditorService_1.setObjProperty)(obj, "font", font))
                            ok++;
                    }
                    (0, UiKit_1.toast)(`已将 ${ok}/${targets.length} 个文字字体设为「${font}」`);
                    ScanController_1.ScanController.scanCurrentComponent();
                }
            });
            col.add(btn.view, 24);
        }
        col.add((0, UiKit_1.createLabel)("适配", { size: 13, bold: true, color: UiKit_1.COLORS.text }), 18);
        col.add((0, UiKit_1.createLabel)("标准全屏适配需在 项目设置 → 屏幕适配 中配置，插件仅提供检查提醒（见规范检查页）", { size: 11, color: UiKit_1.COLORS.textDim, width: width, wrap: true }), 30);
        col.add((0, UiKit_1.createLabel)("红点", { size: 13, bold: true, color: UiKit_1.COLORS.text }), 18);
        col.add((0, UiKit_1.createLabel)("红点控制器的检查与测试请使用「红点」页签", { size: 11, color: UiKit_1.COLORS.textDim, width: width, wrap: true }), 16);
        col.finish();
        content.AddChild(col.com);
    }
}
exports.QuickPage = QuickPage;
