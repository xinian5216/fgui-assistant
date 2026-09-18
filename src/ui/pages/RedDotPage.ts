import { FairyGUI } from 'csharp';
import { Page, PageContext } from '../MainPanel';
import { Column, COLORS, UiButton, createLabel, createHLine, createTag, toast } from '../UiKit';
import { getActiveDoc, switchControllerPage, readControllers, getCurrentComponentName } from '../../services/EditorService';
import { Config } from '../../core/Config';
import { ControllerInfo } from '../../core/Types';

export class RedDotPage implements Page {
    id = "reddot";
    title = "红点工具";

    build(ctx: PageContext): void {
        const content = ctx.content;
        const width = ctx.width;
        const col = new Column(width, 6);
        const cfg = Config.config.redDot || { controllerNamePattern: "HongDian", pageOff: "0", pageOn: "1" };
        const doc = getActiveDoc();

        if (!doc) {
            col.add(createLabel("请先打开一个组件", { size: 12, color: COLORS.textDim }), 20);
            col.finish();
            content.AddChild(col.com);
            return;
        }

        let controllers: ControllerInfo[] = [];
        try { controllers = readControllers(doc.content); } catch (e) { }
        const matched = controllers.filter(c => (c.name || "").toLowerCase().indexOf((cfg.controllerNamePattern || "HongDian").toLowerCase()) >= 0);

        col.add(createLabel(`当前组件：${getCurrentComponentName()}`, { size: 12, color: COLORS.textDim, width: width, wrap: true }), 18);
        col.add(createLabel(`红点控制器（名称包含「${cfg.controllerNamePattern}」，共 ${matched.length} 个）`, { size: 13, bold: true, color: COLORS.text, width: width, wrap: true }), 20);

        if (matched.length == 0) {
            col.add(createLabel("未找到红点控制器。\n\n创建控制器涉及显示状态联动，为保证安全，插件不自动创建，请在 FairyGUI 中手动创建：\n1. 新建控制器，名称如 C_HongDian\n2. 添加两个页面：0（无红点）/ 1（有红点）\n3. 默认页面设为 0\n4. 红点对象显示状态绑定到该控制器", { size: 11, color: COLORS.textDim, width: width, wrap: true }), 130);
        }

        for (const ctrl of matched) {
            const box = new FairyGUI.GComponent();
            let y = 0;
            const title = createLabel(ctrl.name, { size: 13, bold: true, color: COLORS.text });
            title.SetXY(0, y);
            box.AddChild(title);
            y += 20;

            const hasOff = ctrl.pages.some(p => p.name == cfg.pageOff || p.id == cfg.pageOff);
            const hasOn = ctrl.pages.some(p => p.name == cfg.pageOn || p.id == cfg.pageOn);
            const offPage = ctrl.pages.find(p => p.name == cfg.pageOff || p.id == cfg.pageOff);
            const onPage = ctrl.pages.find(p => p.name == cfg.pageOn || p.id == cfg.pageOn);
            let defaultOk = false;
            if (offPage) {
                if (ctrl.homePage) defaultOk = ctrl.homePage == offPage.id || ctrl.homePage == offPage.name;
                else if (ctrl.pages.length > 0) defaultOk = ctrl.pages[0] == offPage || ctrl.pages[0].id == offPage.id;
            }

            const lines = [
                { text: `${cfg.pageOff}：无红点`, ok: hasOff },
                { text: `${cfg.pageOn}：有红点`, ok: hasOn },
                { text: `默认：${cfg.pageOff}`, ok: defaultOk }
            ];
            for (const line of lines) {
                const tag = createTag(line.ok ? "✓" : "✕", line.ok ? COLORS.ok : COLORS.error);
                tag.SetXY(0, y);
                box.AddChild(tag);
                const lb = createLabel(line.text, { size: 12, color: line.ok ? COLORS.text : COLORS.error });
                lb.SetXY(34, y + 1);
                box.AddChild(lb);
                y += 20;
            }

            const pagesDesc = createLabel(`页面列表：${ctrl.pages.map(p => p.name || p.id).join(", ") || "(无)"}`, { size: 11, color: COLORS.textDim, width: width - 8, wrap: true });
            pagesDesc.SetXY(0, y);
            box.AddChild(pagesDesc);
            y += pagesDesc.height + 4;

            const offIdx = offPage ? ctrl.pages.indexOf(offPage) : -1;
            const onIdx = onPage ? ctrl.pages.indexOf(onPage) : -1;
            const btn0 = new UiButton(`测试 ${cfg.pageOff}`, {
                w: (width - 12) / 3, h: 24, size: 11,
                onClick: () => {
                    if (offIdx < 0) { toast("没有该页面"); return; }
                    if (switchControllerPage(ctrl.name, offIdx)) toast(`已切换到页面 ${cfg.pageOff}`);
                }
            });
            btn0.setEnabled(offIdx >= 0);
            const btn1 = new UiButton(`测试 ${cfg.pageOn}`, {
                w: (width - 12) / 3, h: 24, size: 11,
                onClick: () => {
                    if (onIdx < 0) { toast("没有该页面"); return; }
                    if (switchControllerPage(ctrl.name, onIdx)) toast(`已切换到页面 ${cfg.pageOn}`);
                }
            });
            btn1.setEnabled(onIdx >= 0);
            btn0.view.SetXY(0, y);
            box.AddChild(btn0.view);
            btn1.view.SetXY((width - 12) / 3 + 6, y);
            box.AddChild(btn1.view);
            y += 30;

            if (!defaultOk && hasOff) {
                const warn = createLabel("⚠ 默认状态不是 " + cfg.pageOff + "，请在 FairyGUI 中检查控制器首页设置（插件不自动修改）", { size: 11, color: COLORS.warning, width: width - 8, wrap: true });
                warn.SetXY(0, y);
                box.AddChild(warn);
                y += warn.height + 2;
            }

            const line = createHLine(width - 4);
            line.SetXY(0, y);
            box.AddChild(line);
            y += 1;
            box.SetSize(width, y);
            col.add(box, y);
        }

        col.add(createLabel("说明：红点 0/1 状态下红点对象的显隐绑定（gearDisplay）请人工确认；插件不自动创建控制器，避免生成错误结构。", { size: 10, color: COLORS.textDim, width: width, wrap: true }), 30);

        col.finish();
        content.AddChild(col.com);
    }
}
