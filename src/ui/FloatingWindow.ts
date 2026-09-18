import { FairyGUI } from 'csharp';
import { App } from '../Api';
import { COLORS, createGraph, createLabel } from './UiKit';
import { MainPanel } from './MainPanel';

const WIN_W = 460;
const WIN_H = 560;
const TITLE_H = 28;

export class FloatingWindow {
    private win: FairyGUI.GComponent = null;
    private panel: MainPanel = null;

    get isShowing(): boolean {
        return this.win != null && !this.win.isDisposed && this.win.onStage;
    }

    toggle(): void {
        if (this.isShowing) this.close();
        else this.open();
    }

    open(): void {
        if (this.isShowing) {
            try { this.win.visible = true; } catch (e) { }
            return;
        }
        try {
            const root = App.groot;
            this.win = new FairyGUI.GComponent();
            this.win.SetSize(WIN_W, WIN_H);
            try { this.win.opaque = true; } catch (e) { }

            const bg = createGraph(WIN_W, WIN_H, COLORS.bg, COLORS.border);
            this.win.AddChild(bg);

            const titleBar = new FairyGUI.GComponent();
            titleBar.SetSize(WIN_W, TITLE_H);
            try { titleBar.opaque = true; } catch (e) { }
            const tbBg = createGraph(WIN_W, TITLE_H, COLORS.bgPanel);
            titleBar.AddChild(tbBg);
            const title = createLabel("FGUI Assistant", { size: 13, bold: true, color: COLORS.text });
            title.SetXY(10, 6);
            titleBar.AddChild(title);
            const self = this;
            titleBar.onTouchBegin.Add(() => {
                try { self.win.StartDrag(); } catch (e) { }
            });
            this.win.AddChild(titleBar);

            const btnClose = new FairyGUI.GComponent();
            btnClose.SetSize(26, 22);
            try { btnClose.opaque = true; } catch (e) { }
            const cbBg = createGraph(26, 22, "#7a3a3a");
            btnClose.AddChild(cbBg);
            const cbLb = createLabel("✕", { size: 12, color: "#ffffff", bold: true });
            try {
                cbLb.autoSize = FairyGUI.AutoSizeType.None;
                cbLb.SetSize(26, 16);
                cbLb.align = FairyGUI.AlignType.Center;
            } catch (e) { }
            cbLb.SetXY(0, 3);
            btnClose.AddChild(cbLb);
            btnClose.SetXY(WIN_W - 30, 3);
            btnClose.onClick.Add(() => { self.close(); });
            this.win.AddChild(btnClose);

            this.panel = new MainPanel(WIN_W - 4, WIN_H - TITLE_H - 6);
            this.panel.view.SetXY(2, TITLE_H + 2);
            this.win.AddChild(this.panel.view);

            this.win.SetXY(Math.max(0, (root.width - WIN_W) / 2), Math.max(0, (root.height - WIN_H) / 3));
            root.AddChild(this.win);
        } catch (e) {
            console.warn("[FGUI助手] 打开窗口失败: " + e);
        }
    }

    close(): void {
        try {
            if (this.win) {
                this.win.RemoveFromParent();
                this.win.Dispose();
            }
        } catch (e) { }
        this.win = null;
        this.panel = null;
    }

    refresh(): void {
        if (this.panel) this.panel.refresh();
    }
}
