import { FairyGUI } from 'csharp';
import { App } from '../Api';
import { COLORS, createGraph, createLabel, fillGraph } from './UiKit';
import { MainPanel } from './MainPanel';
import { LAYOUT, computeMinWindow, computeDefaultWindow, clamp } from './Layout';
import { applyClip } from './Scroll';

const TAB_COUNT = 9;

export class FloatingWindow {
    private win: FairyGUI.GComponent = null;
    private panel: MainPanel = null;
    private bg: FairyGUI.GGraph = null;
    private titleBar: FairyGUI.GComponent = null;
    private titleBg: FairyGUI.GGraph = null;
    private btnClose: FairyGUI.GComponent = null;
    private grip: FairyGUI.GComponent = null;
    private _w: number = 0;
    private _h: number = 0;
    private _resizing: boolean = false;
    private _startW: number = 0;
    private _startH: number = 0;
    private _startX: number = 0;
    private _startY: number = 0;

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
            const def = computeDefaultWindow(TAB_COUNT);
            const min = computeMinWindow(TAB_COUNT);
            this._w = def.width;
            this._h = def.height;

            this.win = new FairyGUI.GComponent();
            this.win.SetSize(this._w, this._h);
            try { this.win.opaque = true; } catch (e) { }
            try { this.win.minWidth = min.width; this.win.minHeight = min.height; } catch (e) { }
            applyClip(this.win, this._w, this._h);

            this.bg = createGraph(this._w, this._h, COLORS.bg, COLORS.border);
            this.win.AddChild(this.bg);

            this.titleBar = new FairyGUI.GComponent();
            this.titleBar.SetSize(this._w, LAYOUT.HEADER_H);
            try { this.titleBar.opaque = true; } catch (e) { }
            this.titleBg = createGraph(this._w, LAYOUT.HEADER_H, COLORS.bgPanel);
            this.titleBar.AddChild(this.titleBg);
            const title = createLabel("FGUI Assistant", { size: 13, bold: true, color: COLORS.text });
            title.SetXY(10, 6);
            this.titleBar.AddChild(title);
            const self = this;
            this.titleBar.onTouchBegin.Add(() => {
                if (self._resizing) return;
                try { self.win.StartDrag(); } catch (e) { }
            });
            this.win.AddChild(this.titleBar);

            this.btnClose = new FairyGUI.GComponent();
            this.btnClose.SetSize(LAYOUT.CLOSE_W, 22);
            try { this.btnClose.opaque = true; } catch (e) { }
            const cbBg = createGraph(LAYOUT.CLOSE_W, 22, "#7a3a3a");
            this.btnClose.AddChild(cbBg);
            const cbLb = createLabel("✕", { size: 12, color: "#ffffff", bold: true });
            try {
                cbLb.autoSize = FairyGUI.AutoSizeType.None;
                cbLb.SetSize(LAYOUT.CLOSE_W, 16);
                cbLb.align = FairyGUI.AlignType.Center;
            } catch (e) { }
            cbLb.SetXY(0, 3);
            this.btnClose.AddChild(cbLb);
            this.btnClose.SetXY(this._w - 30, 3);
            this.btnClose.onClick.Add(() => { self.close(); });
            this.win.AddChild(this.btnClose);

            const panelW = this._w;
            const panelH = this._h - LAYOUT.HEADER_H;
            this.panel = new MainPanel(panelW, panelH);
            this.panel.view.SetXY(0, LAYOUT.HEADER_H);
            this.win.AddChild(this.panel.view);

            this.grip = new FairyGUI.GComponent();
            this.grip.SetSize(LAYOUT.GRIP, LAYOUT.GRIP);
            try { this.grip.opaque = true; } catch (e) { }
            const gripBg = createGraph(LAYOUT.GRIP, LAYOUT.GRIP, COLORS.border);
            this.grip.AddChild(gripBg);
            this.grip.SetXY(this._w - LAYOUT.GRIP, this._h - LAYOUT.GRIP);
            this.grip.onTouchBegin.Add((ctx: FairyGUI.EventContext) => {
                try { ctx.CaptureTouch(); } catch (e) { }
                self._resizing = true;
                self._startW = self._w;
                self._startH = self._h;
                try {
                    self._startX = ctx.inputEvent.x;
                    self._startY = ctx.inputEvent.y;
                } catch (e) { }
            });
            this.grip.onTouchMove.Add((ctx: FairyGUI.EventContext) => {
                if (!self._resizing) return;
                let x = self._startX, y = self._startY;
                try { x = ctx.inputEvent.x; y = ctx.inputEvent.y; } catch (e) { }
                let maxW = 1600, maxH = 1200;
                try { maxW = root.width; maxH = root.height; } catch (e) { }
                const nw = clamp(self._startW + (x - self._startX), min.width, maxW);
                const nh = clamp(self._startH + (y - self._startY), min.height, maxH);
                self.applySize(nw, nh);
            });
            this.grip.onTouchEnd.Add(() => { self._resizing = false; });
            this.win.AddChild(this.grip);

            this.win.SetXY(Math.max(0, (root.width - this._w) / 2), Math.max(0, (root.height - this._h) / 3));
            root.AddChild(this.win);
        } catch (e) {
            console.warn("[FGUI助手] 打开窗口失败: " + e);
        }
    }

    private applySize(w: number, h: number): void {
        this._w = w;
        this._h = h;
        if (!this.win) return;
        this.win.SetSize(w, h);
        applyClip(this.win, w, h);
        if (this.bg) fillGraph(this.bg, w, h, COLORS.bg, COLORS.border);
        if (this.titleBar) {
            this.titleBar.SetSize(w, LAYOUT.HEADER_H);
            if (this.titleBg) fillGraph(this.titleBg, w, LAYOUT.HEADER_H, COLORS.bgPanel);
        }
        if (this.btnClose) this.btnClose.SetXY(w - 30, 3);
        if (this.grip) this.grip.SetXY(w - LAYOUT.GRIP, h - LAYOUT.GRIP);
        if (this.panel) {
            this.panel.view.SetXY(0, LAYOUT.HEADER_H);
            this.panel.resize(w, h - LAYOUT.HEADER_H);
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
        this.bg = null;
        this.titleBar = null;
        this.titleBg = null;
        this.btnClose = null;
        this.grip = null;
    }

    refresh(): void {
        if (this.panel) this.panel.refresh();
    }
}
