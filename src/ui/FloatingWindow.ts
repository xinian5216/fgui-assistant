import { FairyGUI } from 'csharp';
import { App } from '../Api';
import { COLORS, createGraph, createLabel, fillGraph } from './UiKit';
import { MainPanel, MAIN_PANEL_PAGE_COUNT } from './MainPanel';
import { LAYOUT, computeMinWindow, computeDefaultWindow, clamp } from './Layout';
import { applyClip } from './Scroll';

const TAB_COUNT = MAIN_PANEL_PAGE_COUNT;

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

            this.btnClose = createCloseButton(LAYOUT.CLOSE_W, 22, () => { self.close(); });
            this.btnClose.SetXY(this._w - 30, 3);
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

const CLOSE_BG = "#7A3437";
const CLOSE_BG_HOVER = "#9B4A4E";
const CLOSE_BG_DOWN = "#5C282B";
const CLOSE_MARK = "#E8E8E8";

function addCloseMark(parent: FairyGUI.GComponent, w: number, h: number, hex: string): FairyGUI.GGraph[] {
    const len = Math.max(8, Math.min(w, h) * 0.42);
    const thick = 2;
    const cx = w / 2;
    const cy = h / 2;
    const make = (rot: number): FairyGUI.GGraph => {
        const g = createGraph(len, thick, hex);
        try { g.SetPivot(0.5, 0.5, true); } catch (e) {
            try { g.SetPivot(0.5, 0.5); } catch (e2) { }
        }
        g.SetXY(cx, cy);
        try { g.rotation = rot; } catch (e) { }
        parent.AddChild(g);
        return g;
    };
    return [make(45), make(-45)];
}

function createCloseButton(w: number, h: number, onClose: () => void): FairyGUI.GComponent {
    const btn = new FairyGUI.GComponent();
    btn.SetSize(w, h);
    try { btn.opaque = true; } catch (e) { }
    const bg = createGraph(w, h, CLOSE_BG);
    btn.AddChild(bg);
    addCloseMark(btn, w, h, CLOSE_MARK);
    let pressed = false;
    const paint = (mode: string): void => {
        const hex = mode == "down" ? CLOSE_BG_DOWN : mode == "hover" ? CLOSE_BG_HOVER : CLOSE_BG;
        fillGraph(bg, w, h, hex);
    };
    btn.onRollOver.Add(() => { if (!pressed) paint("hover"); });
    btn.onRollOut.Add(() => { pressed = false; paint("up"); });
    btn.onTouchBegin.Add((ctx: FairyGUI.EventContext) => {
        try { ctx.StopPropagation(); } catch (e) { }
        pressed = true;
        paint("down");
    });
    btn.onTouchEnd.Add(() => { pressed = false; paint("hover"); });
    btn.onClick.Add(() => { onClose(); });
    return btn;
}
