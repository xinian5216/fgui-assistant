import { FairyGUI } from 'csharp';
import { COLORS, createGraph, createLabel, clearChildren, fillGraph } from './UiKit';
import { ScanController } from '../services/ScanController';
import { ResourceAuditController } from '../services/ResourceAudit';
import { HomePage } from './pages/HomePage';
import { CheckPage } from './pages/CheckPage';
import { ResourcePage } from './pages/ResourcePage';
import { QuickPage } from './pages/QuickPage';
import { NamingPage } from './pages/NamingPage';
import { LayoutPage } from './pages/LayoutPage';
import { RedDotPage } from './pages/RedDotPage';
import { PublishPage } from './pages/PublishPage';
import { ChecklistPage } from './pages/ChecklistPage';
import { SettingsPage } from './pages/SettingsPage';
import { LAYOUT, tabLayout, contentViewportHeight, contentWidth } from './Layout';
import { VScroll, applyClip, measureContentHeight } from './Scroll';

export interface PageContext {
    content: FairyGUI.GComponent;
    width: number;
    height: number;
    navigate: (pageId: string) => void;
}

export interface Page {
    id: string;
    title: string;
    shortTitle?: string;
    manageLayout?: boolean;
    footerHeight?: number;
    build(ctx: PageContext): void;
    buildFooter?(ctx: PageContext): void;
}

export const MAIN_PANEL_PAGE_COUNT = 10;

export class MainPanel {
    view: FairyGUI.GComponent;
    private pages: Page[] = [];
    private activePageId: string = "";
    private tabBar: FairyGUI.GComponent;
    private viewport: FairyGUI.GComponent;
    private bg: FairyGUI.GGraph;
    private viewportBg: FairyGUI.GGraph;
    private _width: number;
    private _height: number;
    private _tabAreaH: number = LAYOUT.TAB_ROW_H;
    private _rebuilding: boolean = false;
    private _applyingSize: boolean = false;

    constructor(width: number, height: number) {
        this._width = Math.max(1, width);
        this._height = Math.max(1, height);
        this.pages = [
            new HomePage(),
            new CheckPage(),
            new ResourcePage(),
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
        this.view.SetSize(this._width, this._height);
        try { this.view.opaque = true; } catch (e) { }
        applyClip(this.view, this._width, this._height);

        this.bg = createGraph(this._width, this._height, COLORS.bg);
        this.view.AddChild(this.bg);

        this.tabBar = new FairyGUI.GComponent();
        this.view.AddChild(this.tabBar);

        this.viewport = new FairyGUI.GComponent();
        try { this.viewport.opaque = true; } catch (e) { }
        this.viewportBg = createGraph(this._width, 10, COLORS.bg);
        this.viewport.AddChild(this.viewportBg);
        this.view.AddChild(this.viewport);

        const self = this;
        ScanController.onChanged(() => { self.rebuildBody(); });
        ResourceAuditController.onChanged(() => { self.rebuildBody(); });
        try {
            this.view.onSizeChanged.Add(() => {
                if (self._applyingSize) return;
                const w = self.view.width;
                const h = self.view.height;
                if (Math.abs(w - self._width) > 0.5 || Math.abs(h - self._height) > 0.5) {
                    self.resize(w, h);
                }
            });
        } catch (e) { }
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

    resize(width: number, height: number): void {
        if (!(width > 0) || !(height > 0)) return;
        this._width = Math.max(1, width);
        this._height = Math.max(1, height);
        this._applyingSize = true;
        try {
            this.view.SetSize(this._width, this._height);
            applyClip(this.view, this._width, this._height);
            fillGraph(this.bg, this._width, this._height, COLORS.bg);
            this.rebuildTabs();
            this.rebuildBody();
        } finally {
            this._applyingSize = false;
        }
    }

    private navigate = (id: string): void => {
        this.showPage(id);
    };

    private rebuildTabs(): void {
        clearChildren(this.tabBar);
        const layout = tabLayout(this.pages.length, this._width);
        this._tabAreaH = layout.tabAreaH;
        this.tabBar.SetSize(this._width, this._tabAreaH);
        applyClip(this.tabBar, this._width, this._tabAreaH);
        const self = this;
        for (let i = 0; i < this.pages.length; i++) {
            const page = this.pages[i];
            const active = page.id == this.activePageId;
            const row = Math.floor(i / layout.perRow);
            const colIdx = i % layout.perRow;
            const holder = new FairyGUI.GComponent();
            holder.SetSize(layout.tabW, LAYOUT.TAB_ROW_H);
            try { holder.opaque = true; } catch (e) { }
            const bg = createGraph(layout.tabW, LAYOUT.TAB_ROW_H, active ? COLORS.bgPanel : COLORS.bg);
            holder.AddChild(bg);
            const lb = createLabel(page.shortTitle, { size: 11, color: active ? "#ffffff" : COLORS.textDim, bold: active });
            try {
                lb.autoSize = FairyGUI.AutoSizeType.None;
                lb.SetSize(layout.tabW, 14);
                lb.align = FairyGUI.AlignType.Center;
            } catch (e) { }
            lb.SetXY(0, 5);
            holder.AddChild(lb);
            holder.SetXY(colIdx * layout.tabW, row * LAYOUT.TAB_ROW_H);
            const pid = page.id;
            holder.onClick.Add(() => { self.showPage(pid); });
            this.tabBar.AddChild(holder);
        }
        const bodyH = contentViewportHeight(this._height, this._tabAreaH);
        this.viewport.SetXY(0, this._tabAreaH);
        this.viewport.SetSize(this._width, bodyH);
        applyClip(this.viewport, this._width, bodyH);
        fillGraph(this.viewportBg, this._width, bodyH, COLORS.bg);
    }

    rebuildBody(): void {
        if (this._rebuilding) return;
        this._rebuilding = true;
        try {
            try {
                while (this.viewport.numChildren > 1) {
                    this.viewport.RemoveChildAt(this.viewport.numChildren - 1, true);
                }
            } catch (e) { }
            if (this.viewport.numChildren == 0) {
                this.viewportBg = createGraph(this._width, 10, COLORS.bg);
                this.viewport.AddChild(this.viewportBg);
            }
            const bodyH = contentViewportHeight(this._height, this._tabAreaH);
            this.viewport.SetSize(this._width, bodyH);
            applyClip(this.viewport, this._width, bodyH);
            fillGraph(this.viewportBg, this._width, bodyH, COLORS.bg);

            const page = this.pages.find(p => p.id == this.activePageId) || this.pages[0];
            const innerW = contentWidth(this._width);
            const footerH = page.footerHeight || 0;
            const nav = this.navigate;

            if (page.manageLayout) {
                const inner = new FairyGUI.GComponent();
                inner.SetXY(LAYOUT.PAD_X, LAYOUT.PAD_Y);
                inner.SetSize(innerW, Math.max(10, bodyH - LAYOUT.PAD_Y * 2));
                applyClip(inner, innerW, Math.max(10, bodyH - LAYOUT.PAD_Y * 2));
                this.viewport.AddChild(inner);
                try {
                    page.build({ content: inner, width: innerW, height: Math.max(10, bodyH - LAYOUT.PAD_Y * 2), navigate: nav });
                } catch (e) {
                    console.warn("[FGUI助手] 页面构建异常: " + e);
                    inner.AddChild(createLabel("页面构建失败: " + e, { size: 11, color: COLORS.error, width: innerW, wrap: true }));
                }
                return;
            }

            const scrollH = Math.max(10, bodyH - footerH);
            const scroll = new VScroll(this._width, scrollH);
            this.viewport.AddChild(scroll.view);
            const inner = new FairyGUI.GComponent();
            inner.SetXY(LAYOUT.PAD_X, LAYOUT.PAD_Y);
            inner.SetSize(innerW, 10);
            scroll.content.AddChild(inner);
            try {
                page.build({ content: inner, width: innerW, height: scrollH, navigate: nav });
            } catch (e) {
                console.warn("[FGUI助手] 页面构建异常: " + e);
                inner.AddChild(createLabel("页面构建失败: " + e, { size: 11, color: COLORS.error, width: innerW, wrap: true }));
            }
            const maxH = Math.max(10, measureContentHeight(inner));
            inner.SetSize(innerW, maxH);
            scroll.setContentHeight(maxH + LAYOUT.PAD_Y * 2);

            if (footerH > 0 && page.buildFooter) {
                const footer = new FairyGUI.GComponent();
                footer.SetSize(this._width, footerH);
                footer.SetXY(0, scrollH);
                try { footer.opaque = true; } catch (e) { }
                applyClip(footer, this._width, footerH);
                const fbg = createGraph(this._width, footerH, COLORS.bgPanel);
                footer.AddChild(fbg);
                const fInner = new FairyGUI.GComponent();
                fInner.SetXY(LAYOUT.PAD_X, 4);
                fInner.SetSize(innerW, footerH - 6);
                footer.AddChild(fInner);
                this.viewport.AddChild(footer);
                try {
                    page.buildFooter({ content: fInner, width: innerW, height: footerH, navigate: nav });
                } catch (e) { }
            }
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
