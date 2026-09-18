import { FairyGUI, FairyEditor } from 'csharp';
import { Page, PageContext } from '../MainPanel';
import { Column, COLORS, UiButton, createLabel, createInput, toast } from '../UiKit';
import { getSelection, getExtType, setObjProperty } from '../../services/EditorService';
import { getNamingType } from '../../rules/NamingRule';
import { objToInfo } from '../../services/EditorService';
import { Config, orderedNamingKeys } from '../../core/Config';
import { ScanController } from '../../services/ScanController';
import { App, alert } from '../../Api';

export class NamingPage implements Page {
    id = "naming";
    title = "命名助手";
    private input: FairyGUI.GTextInput = null;

    build(ctx: PageContext): void {
        const content = ctx.content;
        const width = ctx.width;
        const col = new Column(width, 6);
        const self = this;
        const cfg = Config.config;
        const selection = getSelection();
        const first = selection.length > 0 ? selection[0] : null;

        if (!first) {
            col.add(createLabel("请先选中一个对象", { size: 12, color: COLORS.textDim, width: width, wrap: true }), 20);
        } else {
            const info = objToInfo(first, "", 1);
            const type = getNamingType(info) || info.objectType || "未知";
            const prefix = (cfg.namingRules || {})[type] || "";
            col.add(createLabel(`当前类型：${type}`, { size: 13, bold: true, color: COLORS.text }), 20);
            col.add(createLabel(`要求前缀：${prefix || "（未配置该类型的命名规则）"}`, { size: 12, color: COLORS.textDim }), 18);
            col.add(createLabel(`当前名称：${info.name}`, { size: 12, color: COLORS.text, width: width, wrap: true }), 18);

            let suggestion = "";
            if (prefix && info.name.indexOf(prefix) != 0) suggestion = prefix + info.name;
            else suggestion = info.name;
            col.add(createLabel(prefix ? `建议：${suggestion}` : "建议：该类型无前缀要求", { size: 12, color: prefix && info.name.indexOf(prefix) != 0 ? COLORS.warning : COLORS.ok, width: width, wrap: true }), 18);

            this.input = createInput(width, suggestion, "输入新名称");
            col.add(this.input, 26);

            col.row([
                {
                    obj: new UiButton("应用", {
                        w: (width - 12) / 3, h: 26, bg: COLORS.accent, hover: COLORS.accentHover, color: "#fff",
                        onClick: () => { self.applyRename(first); }
                    }).view, w: (width - 12) / 3
                },
                {
                    obj: new UiButton("加前缀", {
                        w: (width - 12) / 3, h: 26,
                        onClick: () => {
                            if (!prefix) { toast("该类型没有配置前缀"); return; }
                            let cur = "";
                            try { cur = "" + first.name; } catch (e) { }
                            if (cur.indexOf(prefix) == 0) { toast("已有正确前缀"); return; }
                            if (setObjProperty(first, "name", prefix + cur)) {
                                toast(`已重命名为 ${prefix}${cur}`);
                                ScanController.scanCurrentComponent();
                                ScanController.notify();
                            }
                        }
                    }).view, w: (width - 12) / 3
                },
                {
                    obj: new UiButton("定位命名异常", {
                        w: (width - 12) / 3, h: 26,
                        onClick: () => {
                            ScanController.scanCurrentComponent();
                            const r = ScanController.lastResult;
                            if (!r) { toast("请先打开组件"); return; }
                            const bad = r.issues.find(i => i.ruleId == "naming");
                            if (!bad) { toast("当前组件没有命名异常"); return; }
                            ScanController.notify();
                            toast("发现命名异常，请查看规范检查页");
                        }
                    }).view, w: (width - 12) / 3
                }
            ], 26, 6);

            if (selection.length > 1) {
                col.add(createLabel(`（多选 ${selection.length} 个对象时，重命名仅应用于第一个）`, { size: 10, color: COLORS.textDim, width: width, wrap: true }), 14);
            }
        }

        col.space(4);
        col.add(createLabel("命名规则（在设置页修改）", { size: 13, bold: true, color: COLORS.text }), 18);
        const rules = cfg.namingRules || {};
        const lines: string[] = [];
        const ruleKeys = orderedNamingKeys(rules);
        for (const k of ruleKeys) lines.push(`${k}  →  ${rules[k]}`);
        col.add(createLabel(lines.join("\n") || "（无）", { size: 12, color: COLORS.textDim, width: width, wrap: true }), lines.length * 17 + 4);

        col.space(2);
        col.add(createLabel("扫描", { size: 13, bold: true, color: COLORS.text }), 18);
        col.row([
            {
                obj: new UiButton("扫描当前组件", {
                    w: (width - 6) / 2, h: 26,
                    onClick: () => {
                        if (!ScanController.scanCurrentComponent()) { toast("没有打开的组件"); return; }
                        toast("扫描完成，结果见规范检查页");
                    }
                }).view, w: (width - 6) / 2
            },
            {
                obj: new UiButton("扫描当前 Package", {
                    w: (width - 6) / 2, h: 26,
                    onClick: () => {
                        ScanController.scanCurrentPackage();
                    }
                }).view, w: (width - 6) / 2
            }
        ], 26, 6);

        col.finish();
        content.AddChild(col.com);
    }

    private applyRename(obj: FairyEditor.FObject): void {
        if (!this.input) return;
        let newName = "";
        try { newName = this.input.text; } catch (e) { }
        newName = (newName || "").replace(/^\s+|\s+$/g, "");
        if (!newName) { toast("名称不能为空"); return; }
        if (setObjProperty(obj, "name", newName)) {
            toast("已重命名为 " + newName);
            ScanController.scanCurrentComponent();
            ScanController.notify();
        } else {
            alert("重命名失败");
        }
    }
}
