"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FloatingWindow = void 0;
const csharp_1 = require("csharp");
const Api_1 = require("../Api");
const UiKit_1 = require("./UiKit");
const MainPanel_1 = require("./MainPanel");
const WIN_W = 460;
const WIN_H = 560;
const TITLE_H = 28;
class FloatingWindow {
    constructor() {
        this.win = null;
        this.panel = null;
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
            this.win = new csharp_1.FairyGUI.GComponent();
            this.win.SetSize(WIN_W, WIN_H);
            try {
                this.win.opaque = true;
            }
            catch (e) { }
            const bg = (0, UiKit_1.createGraph)(WIN_W, WIN_H, UiKit_1.COLORS.bg, UiKit_1.COLORS.border);
            this.win.AddChild(bg);
            const titleBar = new csharp_1.FairyGUI.GComponent();
            titleBar.SetSize(WIN_W, TITLE_H);
            try {
                titleBar.opaque = true;
            }
            catch (e) { }
            const tbBg = (0, UiKit_1.createGraph)(WIN_W, TITLE_H, UiKit_1.COLORS.bgPanel);
            titleBar.AddChild(tbBg);
            const title = (0, UiKit_1.createLabel)("FGUI Assistant", { size: 13, bold: true, color: UiKit_1.COLORS.text });
            title.SetXY(10, 6);
            titleBar.AddChild(title);
            const self = this;
            titleBar.onTouchBegin.Add(() => {
                try {
                    self.win.StartDrag();
                }
                catch (e) { }
            });
            this.win.AddChild(titleBar);
            const btnClose = new csharp_1.FairyGUI.GComponent();
            btnClose.SetSize(26, 22);
            try {
                btnClose.opaque = true;
            }
            catch (e) { }
            const cbBg = (0, UiKit_1.createGraph)(26, 22, "#7a3a3a");
            btnClose.AddChild(cbBg);
            const cbLb = (0, UiKit_1.createLabel)("✕", { size: 12, color: "#ffffff", bold: true });
            try {
                cbLb.autoSize = csharp_1.FairyGUI.AutoSizeType.None;
                cbLb.SetSize(26, 16);
                cbLb.align = csharp_1.FairyGUI.AlignType.Center;
            }
            catch (e) { }
            cbLb.SetXY(0, 3);
            btnClose.AddChild(cbLb);
            btnClose.SetXY(WIN_W - 30, 3);
            btnClose.onClick.Add(() => { self.close(); });
            this.win.AddChild(btnClose);
            this.panel = new MainPanel_1.MainPanel(WIN_W - 4, WIN_H - TITLE_H - 6);
            this.panel.view.SetXY(2, TITLE_H + 2);
            this.win.AddChild(this.panel.view);
            this.win.SetXY(Math.max(0, (root.width - WIN_W) / 2), Math.max(0, (root.height - WIN_H) / 3));
            root.AddChild(this.win);
        }
        catch (e) {
            console.warn("[FGUI助手] 打开窗口失败: " + e);
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
    }
    refresh() {
        if (this.panel)
            this.panel.refresh();
    }
}
exports.FloatingWindow = FloatingWindow;
