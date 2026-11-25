"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FloatingWindow = void 0;
const csharp_1 = require("csharp");
const Api_1 = require("../Api");
const UiKit_1 = require("./UiKit");
const MainPanel_1 = require("./MainPanel");
const Layout_1 = require("./Layout");
const Scroll_1 = require("./Scroll");
const TAB_COUNT = MainPanel_1.MAIN_PANEL_PAGE_COUNT;
class FloatingWindow {
    constructor() {
        this.win = null;
        this.panel = null;
        this.bg = null;
        this.titleBar = null;
        this.titleBg = null;
        this.btnClose = null;
        this.grip = null;
        this._w = 0;
        this._h = 0;
        this._resizing = false;
        this._startW = 0;
        this._startH = 0;
        this._startX = 0;
        this._startY = 0;
    }
    get isShowing() {
        return this.win != null && !this.win.isDisposed && this.win.onStage;
    }
    toggle() {
        if (this.isShowing)
            this.close();
        else
            this.open();
    }
    open() {
        if (this.isShowing) {
            try {
                this.win.visible = true;
            }
            catch (e) { }
            return;
        }
        try {
            const root = Api_1.App.groot;
            const def = (0, Layout_1.computeDefaultWindow)(TAB_COUNT);
            const min = (0, Layout_1.computeMinWindow)(TAB_COUNT);
            this._w = def.width;
            this._h = def.height;
            this.win = new csharp_1.FairyGUI.GComponent();
            this.win.SetSize(this._w, this._h);
            try {
                this.win.opaque = true;
            }
            catch (e) { }
            try {
                this.win.minWidth = min.width;
                this.win.minHeight = min.height;
            }
            catch (e) { }
            (0, Scroll_1.applyClip)(this.win, this._w, this._h);
            this.bg = (0, UiKit_1.createGraph)(this._w, this._h, UiKit_1.COLORS.bg, UiKit_1.COLORS.border);
            this.win.AddChild(this.bg);
            this.titleBar = new csharp_1.FairyGUI.GComponent();
            this.titleBar.SetSize(this._w, Layout_1.LAYOUT.HEADER_H);
            try {
                this.titleBar.opaque = true;
            }
            catch (e) { }
            this.titleBg = (0, UiKit_1.createGraph)(this._w, Layout_1.LAYOUT.HEADER_H, UiKit_1.COLORS.bgPanel);
            this.titleBar.AddChild(this.titleBg);
            const title = (0, UiKit_1.createLabel)("FGUI Assistant", { size: 13, bold: true, color: UiKit_1.COLORS.text });
            title.SetXY(10, 6);
            this.titleBar.AddChild(title);
            const self = this;
            this.titleBar.onTouchBegin.Add(() => {
                if (self._resizing)
                    return;
                try {
                    self.win.StartDrag();
                }
                catch (e) { }
            });
            this.win.AddChild(this.titleBar);
            this.btnClose = createCloseButton(Layout_1.LAYOUT.CLOSE_W, 22, () => { self.close(); });
            this.btnClose.SetXY(this._w - 30, 3);
            this.win.AddChild(this.btnClose);
            const panelW = this._w;
            const panelH = this._h - Layout_1.LAYOUT.HEADER_H;
            this.panel = new MainPanel_1.MainPanel(panelW, panelH);
            this.panel.view.SetXY(0, Layout_1.LAYOUT.HEADER_H);
            this.win.AddChild(this.panel.view);
            this.grip = new csharp_1.FairyGUI.GComponent();
            this.grip.SetSize(Layout_1.LAYOUT.GRIP, Layout_1.LAYOUT.GRIP);
            try {
                this.grip.opaque = true;
            }
            catch (e) { }
            const gripBg = (0, UiKit_1.createGraph)(Layout_1.LAYOUT.GRIP, Layout_1.LAYOUT.GRIP, UiKit_1.COLORS.border);
            this.grip.AddChild(gripBg);
            this.grip.SetXY(this._w - Layout_1.LAYOUT.GRIP, this._h - Layout_1.LAYOUT.GRIP);
            this.grip.onTouchBegin.Add((ctx) => {
                try {
                    ctx.CaptureTouch();
                }
                catch (e) { }
                self._resizing = true;
                self._startW = self._w;
                self._startH = self._h;
                try {
                    self._startX = ctx.inputEvent.x;
                    self._startY = ctx.inputEvent.y;
                }
                catch (e) { }
            });
            this.grip.onTouchMove.Add((ctx) => {
                if (!self._resizing)
                    return;
                let x = self._startX, y = self._startY;
                try {
                    x = ctx.inputEvent.x;
                    y = ctx.inputEvent.y;
                }
                catch (e) { }
                let maxW = 1600, maxH = 1200;
                try {
                    maxW = root.width;
                    maxH = root.height;
                }
                catch (e) { }
                const nw = (0, Layout_1.clamp)(self._startW + (x - self._startX), min.width, maxW);
                const nh = (0, Layout_1.clamp)(self._startH + (y - self._startY), min.height, maxH);
                self.applySize(nw, nh);
            });
            this.grip.onTouchEnd.Add(() => { self._resizing = false; });
            this.win.AddChild(this.grip);
            this.win.SetXY(Math.max(0, (root.width - this._w) / 2), Math.max(0, (root.height - this._h) / 3));
            root.AddChild(this.win);
        }
        catch (e) {
            console.warn("[FGUI助手] 打开窗口失败: " + e);
        }
    }
    applySize(w, h) {
        this._w = w;
        this._h = h;
        if (!this.win)
            return;
        this.win.SetSize(w, h);
        (0, Scroll_1.applyClip)(this.win, w, h);
        if (this.bg)
            (0, UiKit_1.fillGraph)(this.bg, w, h, UiKit_1.COLORS.bg, UiKit_1.COLORS.border);
        if (this.titleBar) {
            this.titleBar.SetSize(w, Layout_1.LAYOUT.HEADER_H);
            if (this.titleBg)
                (0, UiKit_1.fillGraph)(this.titleBg, w, Layout_1.LAYOUT.HEADER_H, UiKit_1.COLORS.bgPanel);
        }
        if (this.btnClose)
            this.btnClose.SetXY(w - 30, 3);
        if (this.grip)
            this.grip.SetXY(w - Layout_1.LAYOUT.GRIP, h - Layout_1.LAYOUT.GRIP);
        if (this.panel) {
            this.panel.view.SetXY(0, Layout_1.LAYOUT.HEADER_H);
            this.panel.resize(w, h - Layout_1.LAYOUT.HEADER_H);
        }
    }
    close() {
        try {
            if (this.win) {
                this.win.RemoveFromParent();
                this.win.Dispose();
            }
        }
        catch (e) { }
        this.win = null;
        this.panel = null;
        this.bg = null;
        this.titleBar = null;
        this.titleBg = null;
        this.btnClose = null;
        this.grip = null;
    }
    refresh() {
        if (this.panel)
            this.panel.refresh();
    }
}
exports.FloatingWindow = FloatingWindow;
const CLOSE_BG = "#7A3437";
const CLOSE_BG_HOVER = "#9B4A4E";
const CLOSE_BG_DOWN = "#5C282B";
const CLOSE_MARK = "#E8E8E8";
function addCloseMark(parent, w, h, hex) {
    const len = Math.max(8, Math.min(w, h) * 0.42);
    const thick = 2;
    const cx = w / 2;
    const cy = h / 2;
    const make = (rot) => {
        const g = (0, UiKit_1.createGraph)(len, thick, hex);
        try {
            g.SetPivot(0.5, 0.5, true);
        }
        catch (e) {
            try {
                g.SetPivot(0.5, 0.5);
            }
            catch (e2) { }
        }
        g.SetXY(cx, cy);
        try {
            g.rotation = rot;
        }
        catch (e) { }
        parent.AddChild(g);
        return g;
    };
    return [make(45), make(-45)];
}
function createCloseButton(w, h, onClose) {
    const btn = new csharp_1.FairyGUI.GComponent();
    btn.SetSize(w, h);
    try {
        btn.opaque = true;
    }
    catch (e) { }
    const bg = (0, UiKit_1.createGraph)(w, h, CLOSE_BG);
    btn.AddChild(bg);
    addCloseMark(btn, w, h, CLOSE_MARK);
    let pressed = false;
    const paint = (mode) => {
        const hex = mode == "down" ? CLOSE_BG_DOWN : mode == "hover" ? CLOSE_BG_HOVER : CLOSE_BG;
        (0, UiKit_1.fillGraph)(bg, w, h, hex);
    };
    btn.onRollOver.Add(() => { if (!pressed)
        paint("hover"); });
    btn.onRollOut.Add(() => { pressed = false; paint("up"); });
    btn.onTouchBegin.Add((ctx) => {
        try {
            ctx.StopPropagation();
        }
        catch (e) { }
        pressed = true;
        paint("down");
    });
    btn.onTouchEnd.Add(() => { pressed = false; paint("hover"); });
    btn.onClick.Add(() => { onClose(); });
    return btn;
}
