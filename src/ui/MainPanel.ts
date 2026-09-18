import { FairyGUI } from 'csharp';
import { COLORS, createGraph, createLabel, clearChildren, createScrollView, ScrollView } from './UiKit';
import { ScanController } from '../services/ScanController';
import { HomePage } from './pages/HomePage';
import { CheckPage } from './pages/CheckPage';
import { QuickPage } from './pages/QuickPage';
import { NamingPage } from './pages/NamingPage';
import { LayoutPage } from './pages/LayoutPage';
import { RedDotPage } from './pages/RedDotPage';
import { PublishPage } from './pages/PublishPage';
import { ChecklistPage } from './pages/ChecklistPage';
import { SettingsPage } from './pages/SettingsPage';

export interface Page {
    id: string;
    title: string;
    shortTitle?: string;
    build(content: FairyGUI.GComponent, width: number): void;
}

const TAB_ROW_HEIGHT = 24;
const MIN_TAB_W = 46;

export class MainPanel {
    view: FairyGUI.GComponent;
    private pages: Page[] = [];
    private activePageId: string = "";
    private tabBar: FairyGUI.GComponent;
    private body: FairyGUI.GComponent;
    private scroll: ScrollView;
    private _width: number;
    private _height: number;
    private _tabAreaH: number = TAB_ROW_HEIGHT;
    private _rebuilding: boolean = false;

    constructor(width: number, height: number) {
        this._width = width;
        this._height = height;
        this.pages = [
            new HomePage(),
            new CheckPage(),
            new QuickPage(),
            new NamingPage(),
            new LayoutPage(),
            new RedDotPage(),
            new PublishPage(),
            new ChecklistPage(),
            new SettingsPage()
        ];
        for (const p of this.pages) {
            if (!p.shortTitle) p.shortTitle = p.title.length > 2 ? p.title.substring(0, 2) : p.title;
        }
        this.view = new FairyGUI.GComponent();
        this.view.SetSize(width, height);
        const bg = createGraph(width, height, COLORS.bg);
        this.view.AddChild(bg);
        this.tabBar = new FairyGUI.GComponent();
        this.view.AddChild(this.tabBar);
        this.body = new FairyGUI.GComponent();
        this.view.AddChild(this.body);
        const self = this;
        ScanController.onChanged(() => { self.rebuildBody(); });
        this.activePageId = this.pages[0].id;
        this.rebuildTabs();
        this.rebuildBody();
    }

    showPage(id: string): void {
        if (this.activePageId == id) return;
        this.activePageId = id;
        this.rebuildTabs();
        this.rebuildBody();
    }

    private rebuildTabs(): void {
        clearChildren(this.tabBar);
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
            const holder = new FairyGUI.GComponent();
            holder.SetSize(tabW, TAB_ROW_HEIGHT);
            try { holder.opaque = true; } catch (e) { }
            const bg = createGraph(tabW, TAB_ROW_HEIGHT, active ? COLORS.bgPanel : COLORS.bg);
            holder.AddChild(bg);
            const lb = createLabel(page.shortTitle, { size: 11, color: active ? "#ffffff" : COLORS.textDim, bold: active });
            try {
                lb.autoSize = FairyGUI.AutoSizeType.None;
                lb.SetSize(tabW, 14);
                lb.align = FairyGUI.AlignType.Center;
            } catch (e) { }
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

    rebuildBody(): void {
        if (this._rebuilding) return;
        this._rebuilding = true;
        try {
            clearChildren(this.body);
            const bodyH = Math.max(10, this._height - this._tabAreaH);
            this.scroll = createScrollView(this._width, bodyH);
            this.body.AddChild(this.scroll.view);
            const page = this.pages.find(p => p.id == this.activePageId) || this.pages[0];
            const contentWidth = this._width - 14;
            const inner = new FairyGUI.GComponent();
            inner.SetXY(7, 6);
            inner.SetSize(contentWidth, 10);
            this.scroll.content.AddChild(inner);
            try {
                page.build(inner, contentWidth);
            } catch (e) {
                console.warn("[FGUI助手] 页面构建异常: " + e);
                const err = createLabel("页面构建失败: " + e, { size: 11, color: COLORS.error, width: contentWidth, wrap: true });
                inner.AddChild(err);
            }
            let maxH = 60;
            try {
                for (let i = 0; i < inner.numChildren; i++) {
                    const c = inner.GetChildAt(i);
                    const b = c.y + c.height;
                    if (b > maxH) maxH = b;
                }
            } catch (e) { }
            inner.SetSize(contentWidth, maxH + 10);
            this.scroll.content.SetSize(this._width, maxH + 16);
            this.scroll.refresh();
        } finally {
            this._rebuilding = false;
        }
    }

    refresh(): void {
        this.rebuildBody();
    }

    dispose(): void {
        try { this.view.Dispose(); } catch (e) { }
    }
}
