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
const TAB_ROW_HEIGHT = 24;
const MIN_TAB_W = 46;
class MainPanel {
    constructor(width, height) {
        this.pages = [];
        this.activePageId = "";
        this._tabAreaH = TAB_ROW_HEIGHT;
        this._rebuilding = false;
        this._width = width;
        this._height = height;
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
        this.view.SetSize(width, height);
        const bg = (0, UiKit_1.createGraph)(width, height, UiKit_1.COLORS.bg);
        this.view.AddChild(bg);
        this.tabBar = new csharp_1.FairyGUI.GComponent();
        this.view.AddChild(this.tabBar);
        this.body = new csharp_1.FairyGUI.GComponent();
        this.view.AddChild(this.body);
        const self = this;
        ScanController_1.ScanController.onChanged(() => { self.rebuildBody(); });
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
    rebuildTabs() {
        (0, UiKit_1.clearChildren)(this.tabBar);
        const perRow = Math.max(1, Math.floor(this._width / MIN_TAB_W));
        const rows = Math.ceil(this.pages.length / perRow);
        this._tabAreaH = rows * TAB_ROW_HEIGHT;
        this.tabBar.SetSize(this._width, this._tabAreaH);
        const tabW = Math.floor(this._width / perRow);
        const self = this;
        for (let i = 0; i < this.pages.length; i++) {
            const page = this.pages[i];
            const active = page.id == this.activePageId;
            const row = Math.floor(i / perRow);
            const colIdx = i % perRow;
            const holder = new csharp_1.FairyGUI.GComponent();
            holder.SetSize(tabW, TAB_ROW_HEIGHT);
            try {
                holder.opaque = true;
            }
            catch (e) { }
            const bg = (0, UiKit_1.createGraph)(tabW, TAB_ROW_HEIGHT, active ? UiKit_1.COLORS.bgPanel : UiKit_1.COLORS.bg);
            holder.AddChild(bg);
            const lb = (0, UiKit_1.createLabel)(page.shortTitle, { size: 11, color: active ? "#ffffff" : UiKit_1.COLORS.textDim, bold: active });
            try {
                lb.autoSize = csharp_1.FairyGUI.AutoSizeType.None;
                lb.SetSize(tabW, 14);
                lb.align = csharp_1.FairyGUI.AlignType.Center;
            }
            catch (e) { }
            lb.SetXY(0, 5);
            holder.AddChild(lb);
            holder.SetXY(colIdx * tabW, row * TAB_ROW_HEIGHT);
            const pid = page.id;
            holder.onClick.Add(() => { self.showPage(pid); });
            this.tabBar.AddChild(holder);
        }
        this.body.SetXY(0, this._tabAreaH);
        this.body.SetSize(this._width, Math.max(10, this._height - this._tabAreaH));
    }
    rebuildBody() {
        if (this._rebuilding)
            return;
        this._rebuilding = true;
        try {
            (0, UiKit_1.clearChildren)(this.body);
            const bodyH = Math.max(10, this._height - this._tabAreaH);
            this.scroll = (0, UiKit_1.createScrollView)(this._width, bodyH);
            this.body.AddChild(this.scroll.view);
            const page = this.pages.find(p => p.id == this.activePageId) || this.pages[0];
            const contentWidth = this._width - 14;
            const inner = new csharp_1.FairyGUI.GComponent();
            inner.SetXY(7, 6);
            inner.SetSize(contentWidth, 10);
            this.scroll.content.AddChild(inner);
            try {
                page.build(inner, contentWidth);
            }
            catch (e) {
                console.warn("[FGUI助手] 页面构建异常: " + e);
                const err = (0, UiKit_1.createLabel)("页面构建失败: " + e, { size: 11, color: UiKit_1.COLORS.error, width: contentWidth, wrap: true });
                inner.AddChild(err);
            }
            let maxH = 60;
            try {
                for (let i = 0; i < inner.numChildren; i++) {
                    const c = inner.GetChildAt(i);
                    const b = c.y + c.height;
                    if (b > maxH)
                        maxH = b;
                }
            }
            catch (e) { }
            inner.SetSize(contentWidth, maxH + 10);
            this.scroll.content.SetSize(this._width, maxH + 16);
            this.scroll.refresh();
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
