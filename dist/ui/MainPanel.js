"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MainPanel = void 0;
const csharp_1 = require("csharp");
const UiKit_1 = require("./UiKit");
const ScanController_1 = require("../services/ScanController");
const HomePage_1 = require("./pages/HomePage");
const CheckPage_1 = require("./pages/CheckPage");
const QuickPage_1 = require("./pages/QuickPage");
const NamingPage_1 = require("./pages/NamingPage");
const LayoutPage_1 = require("./pages/LayoutPage");
const RedDotPage_1 = require("./pages/RedDotPage");
const PublishPage_1 = require("./pages/PublishPage");
const ChecklistPage_1 = require("./pages/ChecklistPage");
const SettingsPage_1 = require("./pages/SettingsPage");
const Layout_1 = require("./Layout");
const Scroll_1 = require("./Scroll");
class MainPanel {
    constructor(width, height) {
        this.pages = [];
        this.activePageId = "";
        this._tabAreaH = Layout_1.LAYOUT.TAB_ROW_H;
        this._rebuilding = false;
        this._applyingSize = false;
        this.navigate = (id) => {
            this.showPage(id);
        };
        this._width = Math.max(1, width);
        this._height = Math.max(1, height);
        this.pages = [
            new HomePage_1.HomePage(),
            new CheckPage_1.CheckPage(),
            new QuickPage_1.QuickPage(),
            new NamingPage_1.NamingPage(),
            new LayoutPage_1.LayoutPage(),
            new RedDotPage_1.RedDotPage(),
            new PublishPage_1.PublishPage(),
            new ChecklistPage_1.ChecklistPage(),
            new SettingsPage_1.SettingsPage()
        ];
        for (const p of this.pages) {
            if (!p.shortTitle)
                p.shortTitle = p.title.length > 2 ? p.title.substring(0, 2) : p.title;
        }
        this.view = new csharp_1.FairyGUI.GComponent();
        this.view.SetSize(this._width, this._height);
        try {
            this.view.opaque = true;
        }
        catch (e) { }
        (0, Scroll_1.applyClip)(this.view, this._width, this._height);
        this.bg = (0, UiKit_1.createGraph)(this._width, this._height, UiKit_1.COLORS.bg);
        this.view.AddChild(this.bg);
        this.tabBar = new csharp_1.FairyGUI.GComponent();
        this.view.AddChild(this.tabBar);
        this.viewport = new csharp_1.FairyGUI.GComponent();
        try {
            this.viewport.opaque = true;
        }
        catch (e) { }
        this.viewportBg = (0, UiKit_1.createGraph)(this._width, 10, UiKit_1.COLORS.bg);
        this.viewport.AddChild(this.viewportBg);
        this.view.AddChild(this.viewport);
        const self = this;
        ScanController_1.ScanController.onChanged(() => { self.rebuildBody(); });
        try {
            this.view.onSizeChanged.Add(() => {
                if (self._applyingSize)
                    return;
                const w = self.view.width;
                const h = self.view.height;
                if (Math.abs(w - self._width) > 0.5 || Math.abs(h - self._height) > 0.5) {
                    self.resize(w, h);
                }
            });
        }
        catch (e) { }
        this.activePageId = this.pages[0].id;
        this.rebuildTabs();
        this.rebuildBody();
    }
    showPage(id) {
        if (this.activePageId == id)
            return;
        this.activePageId = id;
        this.rebuildTabs();
        this.rebuildBody();
    }
    resize(width, height) {
        if (!(width > 0) || !(height > 0))
            return;
        this._width = Math.max(1, width);
        this._height = Math.max(1, height);
        this._applyingSize = true;
        try {
            this.view.SetSize(this._width, this._height);
            (0, Scroll_1.applyClip)(this.view, this._width, this._height);
            (0, UiKit_1.fillGraph)(this.bg, this._width, this._height, UiKit_1.COLORS.bg);
            this.rebuildTabs();
            this.rebuildBody();
        }
        finally {
            this._applyingSize = false;
        }
    }
    rebuildTabs() {
        (0, UiKit_1.clearChildren)(this.tabBar);
        const layout = (0, Layout_1.tabLayout)(this.pages.length, this._width);
        this._tabAreaH = layout.tabAreaH;
        this.tabBar.SetSize(this._width, this._tabAreaH);
        (0, Scroll_1.applyClip)(this.tabBar, this._width, this._tabAreaH);
        const self = this;
        for (let i = 0; i < this.pages.length; i++) {
            const page = this.pages[i];
            const active = page.id == this.activePageId;
            const row = Math.floor(i / layout.perRow);
            const colIdx = i % layout.perRow;
            const holder = new csharp_1.FairyGUI.GComponent();
            holder.SetSize(layout.tabW, Layout_1.LAYOUT.TAB_ROW_H);
            try {
                holder.opaque = true;
            }
            catch (e) { }
            const bg = (0, UiKit_1.createGraph)(layout.tabW, Layout_1.LAYOUT.TAB_ROW_H, active ? UiKit_1.COLORS.bgPanel : UiKit_1.COLORS.bg);
            holder.AddChild(bg);
            const lb = (0, UiKit_1.createLabel)(page.shortTitle, { size: 11, color: active ? "#ffffff" : UiKit_1.COLORS.textDim, bold: active });
            try {
                lb.autoSize = csharp_1.FairyGUI.AutoSizeType.None;
                lb.SetSize(layout.tabW, 14);
                lb.align = csharp_1.FairyGUI.AlignType.Center;
            }
            catch (e) { }
            lb.SetXY(0, 5);
            holder.AddChild(lb);
            holder.SetXY(colIdx * layout.tabW, row * Layout_1.LAYOUT.TAB_ROW_H);
            const pid = page.id;
            holder.onClick.Add(() => { self.showPage(pid); });
            this.tabBar.AddChild(holder);
        }
        const bodyH = (0, Layout_1.contentViewportHeight)(this._height, this._tabAreaH);
        this.viewport.SetXY(0, this._tabAreaH);
        this.viewport.SetSize(this._width, bodyH);
        (0, Scroll_1.applyClip)(this.viewport, this._width, bodyH);
        (0, UiKit_1.fillGraph)(this.viewportBg, this._width, bodyH, UiKit_1.COLORS.bg);
    }
    rebuildBody() {
        if (this._rebuilding)
            return;
        this._rebuilding = true;
        try {
            try {
                while (this.viewport.numChildren > 1) {
                    this.viewport.RemoveChildAt(this.viewport.numChildren - 1, true);
                }
            }
            catch (e) { }
            if (this.viewport.numChildren == 0) {
                this.viewportBg = (0, UiKit_1.createGraph)(this._width, 10, UiKit_1.COLORS.bg);
                this.viewport.AddChild(this.viewportBg);
            }
            const bodyH = (0, Layout_1.contentViewportHeight)(this._height, this._tabAreaH);
            this.viewport.SetSize(this._width, bodyH);
            (0, Scroll_1.applyClip)(this.viewport, this._width, bodyH);
            (0, UiKit_1.fillGraph)(this.viewportBg, this._width, bodyH, UiKit_1.COLORS.bg);
            const page = this.pages.find(p => p.id == this.activePageId) || this.pages[0];
            const innerW = (0, Layout_1.contentWidth)(this._width);
            const footerH = page.footerHeight || 0;
            const nav = this.navigate;
            if (page.manageLayout) {
                const inner = new csharp_1.FairyGUI.GComponent();
                inner.SetXY(Layout_1.LAYOUT.PAD_X, Layout_1.LAYOUT.PAD_Y);
                inner.SetSize(innerW, Math.max(10, bodyH - Layout_1.LAYOUT.PAD_Y * 2));
                (0, Scroll_1.applyClip)(inner, innerW, Math.max(10, bodyH - Layout_1.LAYOUT.PAD_Y * 2));
                this.viewport.AddChild(inner);
                try {
                    page.build({ content: inner, width: innerW, height: Math.max(10, bodyH - Layout_1.LAYOUT.PAD_Y * 2), navigate: nav });
                }
                catch (e) {
                    console.warn("[FGUI助手] 页面构建异常: " + e);
                    inner.AddChild((0, UiKit_1.createLabel)("页面构建失败: " + e, { size: 11, color: UiKit_1.COLORS.error, width: innerW, wrap: true }));
                }
                return;
            }
            const scrollH = Math.max(10, bodyH - footerH);
            const scroll = new Scroll_1.VScroll(this._width, scrollH);
            this.viewport.AddChild(scroll.view);
            const inner = new csharp_1.FairyGUI.GComponent();
            inner.SetXY(Layout_1.LAYOUT.PAD_X, Layout_1.LAYOUT.PAD_Y);
            inner.SetSize(innerW, 10);
            scroll.content.AddChild(inner);
            try {
                page.build({ content: inner, width: innerW, height: scrollH, navigate: nav });
            }
            catch (e) {
                console.warn("[FGUI助手] 页面构建异常: " + e);
                inner.AddChild((0, UiKit_1.createLabel)("页面构建失败: " + e, { size: 11, color: UiKit_1.COLORS.error, width: innerW, wrap: true }));
            }
            const maxH = Math.max(10, (0, Scroll_1.measureContentHeight)(inner));
            inner.SetSize(innerW, maxH);
            scroll.setContentHeight(maxH + Layout_1.LAYOUT.PAD_Y * 2);
            if (footerH > 0 && page.buildFooter) {
                const footer = new csharp_1.FairyGUI.GComponent();
                footer.SetSize(this._width, footerH);
                footer.SetXY(0, scrollH);
                try {
                    footer.opaque = true;
                }
                catch (e) { }
                (0, Scroll_1.applyClip)(footer, this._width, footerH);
                const fbg = (0, UiKit_1.createGraph)(this._width, footerH, UiKit_1.COLORS.bgPanel);
                footer.AddChild(fbg);
                const fInner = new csharp_1.FairyGUI.GComponent();
                fInner.SetXY(Layout_1.LAYOUT.PAD_X, 4);
                fInner.SetSize(innerW, footerH - 6);
                footer.AddChild(fInner);
                this.viewport.AddChild(footer);
                try {
                    page.buildFooter({ content: fInner, width: innerW, height: footerH, navigate: nav });
                }
                catch (e) { }
            }
        }
        finally {
            this._rebuilding = false;
        }
    }
    refresh() {
        this.rebuildBody();
    }
    dispose() {
        try {
            this.view.Dispose();
        }
        catch (e) { }
    }
}
exports.MainPanel = MainPanel;
