import { FairyGUI } from 'csharp';
import { Page, PageContext } from '../MainPanel';
import { Column, COLORS, UiButton, UiCheckbox, createLabel, toast } from '../UiKit';
import { Config } from '../../core/Config';
import { Store } from '../../core/Store';
import { getActiveDoc, getCurrentComponentName } from '../../services/EditorService';
import { ScanController } from '../../services/ScanController';

export class ChecklistPage implements Page {
    id = "checklist";
    title = "PS 清单";

    build(ctx: PageContext): void {
        const content = ctx.content;
        const width = ctx.width;
        const col = new Column(width, 6);
        const cfg = Config.config;
        const items = cfg.psChecklist || [];
        const doc = getActiveDoc();

        col.add(createLabel("设计稿核对清单", { size: 14, bold: true, color: COLORS.text }), 20);

        if (!doc) {
            col.add(createLabel("请先打开一个组件，清单状态将与组件绑定", { size: 12, color: COLORS.textDim, width: width, wrap: true }), 20);
            col.finish();
            content.AddChild(col.com);
            return;
        }

        let docUrl = "";
        try { docUrl = "" + doc.docURL; } catch (e) { }
        col.add(createLabel(`当前组件：${getCurrentComponentName()}`, { size: 12, color: COLORS.textDim, width: width, wrap: true }), 18);

        const state = Store.getPsChecklist(docUrl);
        for (let i = 0; i < items.length; i++) {
            const checked = state.length > i ? !!state[i] : false;
            const cb = new UiCheckbox(items[i], checked, (v) => {
                Store.setPsItem(docUrl, i, v);
            }, { w: width });
            col.add(cb.view, 22);
        }

        const doneCount = state.filter(v => v).length;
        col.space(4);
        col.add(createLabel(`已完成 ${doneCount}/${items.length}`, { size: 12, color: doneCount == items.length ? COLORS.ok : COLORS.textDim }), 18);

        const btnReset = new UiButton("重置本组件清单", {
            w: width, h: 24, size: 11,
            onClick: () => {
                Store.resetPsChecklist(docUrl);
                ScanController.notify();
                toast("已重置");
            }
        });
        col.add(btnReset.view, 24);

        col.add(createLabel("说明：清单状态保存在插件本地配置中，不会写入业务 Package。", { size: 10, color: COLORS.textDim, width: width, wrap: true }), 28);

        col.finish();
        content.AddChild(col.com);
    }
}
