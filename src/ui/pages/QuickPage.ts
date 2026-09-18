import { FairyGUI, FairyEditor } from 'csharp';
import { Page, PageContext } from '../MainPanel';
import { Column, COLORS, UiButton, createLabel, toast } from '../UiKit';
import { getSelection, getExtType, setObjProperty, setObjExtProperty } from '../../services/EditorService';
import { Config } from '../../core/Config';
import { fontExists } from '../../services/FontService';
import { ScanController } from '../../services/ScanController';

function selectedOfType(pred: (obj: FairyEditor.FObject) => boolean): FairyEditor.FObject[] {
    return getSelection().filter(pred);
}

function isButton(obj: FairyEditor.FObject): boolean {
    return getExtType(obj) == "Button";
}

function isText(obj: FairyEditor.FObject): boolean {
    const t = obj.objectType;
    return t == "text" || t == "richtext" || t == "inputtext";
}

export class QuickPage implements Page {
    id = "quick";
    title = "快速设置";

    build(ctx: PageContext): void {
        const content = ctx.content;
        const width = ctx.width;
        const col = new Column(width, 6);
        const self = this;
        const selection = getSelection();
        const cfg = Config.config;

        const selDesc = selection.length == 0
            ? "当前没有选中对象\n在舞台或库中选择对象后可批量应用以下设置"
            : `当前选中 ${selection.length} 个对象：${selection.slice(0, 3).map(o => { try { return o.name; } catch (e) { return "?"; } }).join("、")}${selection.length > 3 ? " 等" : ""}`;
        col.add(createLabel(selDesc, { size: 12, color: COLORS.textDim, width: width, wrap: true }), selection.length == 0 ? 34 : 20);

        col.add(createLabel("按钮", { size: 13, bold: true, color: COLORS.text }), 18);
        const btnScale = new UiButton(`设置缩放 ${cfg.buttonScale}`, {
            w: (width - 6) / 2, h: 26,
            onClick: () => {
                const targets = selectedOfType(isButton);
                if (targets.length == 0) { toast("请选中按钮对象"); return; }
                let ok = 0;
                for (const obj of targets) {
                    let r = setObjExtProperty(obj, "downEffect", "scale");
                    r = setObjExtProperty(obj, "downEffectValue", cfg.buttonScale) && r;
                    if (r) ok++;
                }
                toast(`已设置 ${ok}/${targets.length} 个按钮缩放为 ${cfg.buttonScale}`);
                ScanController.scanCurrentComponent();
            }
        });
        const btnRadio = new UiButton("设为单选按钮", {
            w: (width - 6) / 2, h: 26,
            onClick: () => {
                const targets = selectedOfType(isButton);
                if (targets.length == 0) { toast("请选中按钮对象"); return; }
                let radioVal = "radio";
                try { radioVal = "" + FairyEditor.FButton.RADIO; } catch (e) { }
                let ok = 0;
                for (const obj of targets) {
                    if (setObjExtProperty(obj, "mode", radioVal)) ok++;
                }
                toast(`已将 ${ok}/${targets.length} 个按钮设为单选`);
                ScanController.scanCurrentComponent();
            }
        });
        col.row([{ obj: btnScale.view, w: (width - 6) / 2 }, { obj: btnRadio.view, w: (width - 6) / 2 }], 26);
        col.add(createLabel("提示：是否应为单选按钮需人工判断，插件不会自动设置", { size: 10, color: COLORS.textDim, width: width, wrap: true }), 16);

        col.add(createLabel("文字", { size: 13, bold: true, color: COLORS.text }), 18);
        const btnPivot = new UiButton("轴心居中", {
            w: (width - 6) / 2, h: 26,
            onClick: () => {
                const targets = selectedOfType(isText);
                if (targets.length == 0) { toast("请选中文字对象"); return; }
                let ok = 0;
                for (const obj of targets) {
                    let r = setObjProperty(obj, "pivotX", 0.5);
                    r = setObjProperty(obj, "pivotY", 0.5) && r;
                    r = setObjProperty(obj, "anchor", true) && r;
                    if (r) ok++;
                }
                toast(`已将 ${ok}/${targets.length} 个文字轴心设为中心`);
                ScanController.scanCurrentComponent();
            }
        });
        col.row([{ obj: btnPivot.view, w: (width - 6) / 2 }], 26);

        col.add(createLabel("字体", { size: 13, bold: true, color: COLORS.text }), 18);
        for (const font of cfg.fonts) {
            const exists = fontExists(font);
            const label = exists ? font : `${font}（未找到）`;
            const btn = new UiButton(label, {
                w: width, h: 24, size: 12,
                bg: exists ? COLORS.btnBg : "#4a3a3a",
                hover: exists ? COLORS.btnHover : "#5a4444",
                onClick: () => {
                    const targets = selectedOfType(isText);
                    if (targets.length == 0) { toast("请选中文字对象"); return; }
                    if (!fontExists(font)) {
                        toast(`字体「${font}」未安装或未在项目中找到，请确认`);
                    }
                    let ok = 0;
                    for (const obj of targets) {
                        if (setObjProperty(obj, "font", font)) ok++;
                    }
                    toast(`已将 ${ok}/${targets.length} 个文字字体设为「${font}」`);
                    ScanController.scanCurrentComponent();
                }
            });
            col.add(btn.view, 24);
        }

        col.add(createLabel("适配", { size: 13, bold: true, color: COLORS.text }), 18);
        col.add(createLabel("标准全屏适配需在 项目设置 → 屏幕适配 中配置，插件仅提供检查提醒（见规范检查页）", { size: 11, color: COLORS.textDim, width: width, wrap: true }), 30);

        col.add(createLabel("红点", { size: 13, bold: true, color: COLORS.text }), 18);
        col.add(createLabel("红点控制器的检查与测试请使用「红点」页签", { size: 11, color: COLORS.textDim, width: width, wrap: true }), 16);

        col.finish();
        content.AddChild(col.com);
    }
}
