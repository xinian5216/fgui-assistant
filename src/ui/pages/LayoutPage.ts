import { FairyGUI, FairyEditor } from 'csharp';
import { Page, PageContext } from '../MainPanel';
import { Column, COLORS, UiButton, createLabel, createHLine, toast } from '../UiKit';
import { getSelection, setObjProperty } from '../../services/EditorService';
import { Config, LayoutPreset } from '../../core/Config';
import { App, confirm } from '../../Api';
import { ScanController } from '../../services/ScanController';

export class LayoutPage implements Page {
    id = "layout";
    title = "布局模板";

    build(ctx: PageContext): void {
        const content = ctx.content;
        const width = ctx.width;
        const col = new Column(width, 6);
        const self = this;
        const cfg = Config.config;
        const selection = getSelection();
        const first = selection.length > 0 ? selection[0] : null;

        col.add(createLabel("固定位置模板（返回 / 主页 / 关闭等按钮的标准位置）", { size: 12, color: COLORS.textDim, width: width, wrap: true }), 32);

        const btnSave = new UiButton("将选中对象保存为新模板", {
            w: width, h: 26, bg: COLORS.accent, hover: COLORS.accentHover, color: "#fff",
            onClick: () => { self.savePreset(first); }
        });
        btnSave.setEnabled(!!first);
        col.add(btnSave.view, 26);
        if (!first) {
            col.add(createLabel("请先选中一个对象（如 Btn_FanHui）", { size: 11, color: COLORS.textDim }), 15);
        }

        const presets = cfg.layoutPresets || [];
        col.add(createLabel(`已保存模板（${presets.length}）`, { size: 13, bold: true, color: COLORS.text }), 20);

        if (presets.length == 0) {
            col.add(createLabel("暂无模板。\n用法：在一个标准页面中选中按钮 → 保存为模板 → 在其他页面选中同名按钮 → 应用模板。", { size: 11, color: COLORS.textDim, width: width, wrap: true }), 48);
        }

        for (let i = 0; i < presets.length; i++) {
            const preset = presets[i];
            const box = new FairyGUI.GComponent();
            let y = 0;
            const title = createLabel(preset.name, { size: 12, bold: true, color: COLORS.text });
            title.SetXY(0, y);
            box.AddChild(title);
            y += 18;
            const detail = createLabel(`X=${preset.x}  Y=${preset.y}  宽=${preset.width}  高=${preset.height}\npivot=(${preset.pivotX}, ${preset.pivotY})  anchor=${preset.anchor}${preset.note ? "\n" + preset.note : ""}`, { size: 11, color: COLORS.textDim, width: width - 8, wrap: true });
            detail.SetXY(0, y);
            box.AddChild(detail);
            y += detail.height + 2;
            let statusText = "";
            let statusColor = COLORS.textDim;
            if (first) {
                let curName = "";
                try { curName = ("" + first.name).toLowerCase(); } catch (e) { }
                if (curName.indexOf(preset.name.toLowerCase()) >= 0) {
                    let cx = 0, cy = 0;
                    try { cx = first.x; cy = first.y; } catch (e) { }
                    const match = Math.abs(cx - preset.x) < 0.51 && Math.abs(cy - preset.y) < 0.51;
                    statusText = match ? `当前选中对象位置一致（X=${cx} Y=${cy}）` : `当前选中对象：X=${cx} Y=${cy}（与模板不一致）`;
                    statusColor = match ? COLORS.ok : COLORS.warning;
                }
            }
            if (statusText) {
                const st = createLabel(statusText, { size: 11, color: statusColor, width: width - 8, wrap: true });
                st.SetXY(0, y);
                box.AddChild(st);
                y += st.height + 2;
            }
            const btnApply = new UiButton("应用到选中对象", {
                w: (width - 12) / 3, h: 22, size: 11,
                onClick: () => { self.applyPreset(preset, first); }
            });
            btnApply.setEnabled(!!first);
            const btnDelete = new UiButton("删除", {
                w: (width - 12) / 3, h: 22, size: 11,
                onClick: () => {
                    confirm(`删除模板「${preset.name}」？`, (ret) => {
                        if (ret != "yes") return;
                        Config.update(c => { c.layoutPresets.splice(c.layoutPresets.indexOf(preset), 1); });
                        ScanController.notify();
                    });
                }
            });
            btnApply.view.SetXY(0, y);
            box.AddChild(btnApply.view);
            btnDelete.view.SetXY((width - 12) / 3 + 6, y);
            box.AddChild(btnDelete.view);
            y += 26;
            const line = createHLine(width - 4);
            line.SetXY(0, y);
            box.AddChild(line);
            y += 1;
            box.SetSize(width, y);
            col.add(box, y);
        }

        col.finish();
        content.AddChild(col.com);
    }

    private savePreset(obj: FairyEditor.FObject): void {
        if (!obj) { toast("请先选中对象"); return; }
        let name = "";
        try { name = "" + obj.name; } catch (e) { }
        if (!name) { toast("选中对象没有名称"); return; }
        const self = this;
        App.Input("模板名称（用于按名称匹配对象，如 Btn_FanHui 或 FanHui）", name, (ret) => {
            if (!ret) return;
            const preset: LayoutPreset = {
                name: ret,
                x: 0, y: 0, width: 0, height: 0, pivotX: 0, pivotY: 0, anchor: false
            };
            try { preset.x = obj.x; preset.y = obj.y; } catch (e) { }
            try { preset.width = obj.width; preset.height = obj.height; } catch (e) { }
            try { preset.pivotX = obj.pivotX; preset.pivotY = obj.pivotY; preset.anchor = obj.anchor; } catch (e) { }
            Config.update(c => {
                c.layoutPresets = c.layoutPresets.filter(p => p.name != ret);
                c.layoutPresets.push(preset);
            });
            toast("模板已保存: " + ret);
            ScanController.notify();
        });
    }

    private applyPreset(preset: LayoutPreset, obj: FairyEditor.FObject): void {
        if (!obj) { toast("请先选中目标对象"); return; }
        let ok = setObjProperty(obj, "x", preset.x);
        ok = setObjProperty(obj, "y", preset.y) && ok;
        if (preset.width > 0 && preset.height > 0) {
            ok = setObjProperty(obj, "width", preset.width) && ok;
            ok = setObjProperty(obj, "height", preset.height) && ok;
        }
        if (preset.pivotX != 0 || preset.pivotY != 0 || preset.anchor) {
            setObjProperty(obj, "pivotX", preset.pivotX);
            setObjProperty(obj, "pivotY", preset.pivotY);
            setObjProperty(obj, "anchor", preset.anchor);
        }
        toast(ok ? "已应用模板位置" : "应用失败，请手动设置");
        ScanController.scanCurrentComponent();
        ScanController.notify();
    }
}
