import { FairyGUI, UnityEngine } from 'csharp';
import { COLORS, createGraph, fillGraph, clearChildren } from './UiKit';
import { LAYOUT, clampScroll, thumbMetrics, visibleIndexRange, scrollMax, wheelToScrollDelta } from './Layout';

export function applyClip(com: FairyGUI.GComponent, w: number, h: number): void {
    const cw = Math.max(1, w);
    const ch = Math.max(1, h);
    try { com.opaque = true; } catch (e) { }
    try { if (com.rootContainer) com.rootContainer.opaque = true; } catch (e) { }
    try {
        const anyCom: any = com;
        const OT = (FairyGUI as any).OverflowType;
        if (OT && OT.Hidden != null) anyCom.overflow = OT.Hidden;
        else anyCom.overflow = 1;
    } catch (e) { }
    try {
        const rect = new UnityEngine.Rect(0, 0, cw, ch);
        if (com.rootContainer) com.rootContainer.clipRect = rect;
    } catch (e) { }
    try {
        if (com.container) {
            const rect2 = new UnityEngine.Rect(0, 0, cw, ch);
            com.container.clipRect = rect2;
        }
    } catch (e) { }
}

export function measureContentHeight(com: FairyGUI.GComponent): number {
    let maxH = 0;
    try {
        for (let i = 0; i < com.numChildren; i++) {
            const c = com.GetChildAt(i);
            const b = c.y + c.height;
            if (b > maxH) maxH = b;
        }
    } catch (e) { }
    return maxH;
}

function isUnder(target: any, ancestor: FairyGUI.GComponent): boolean {
    try {
        const root = ancestor.displayObject;
        let p: any = target;
        while (p) {
            if (p == root || p == ancestor) return true;
            try { if (p.gOwner == ancestor) return true; } catch (e) { }
            p = p.parent;
        }
    } catch (e) { }
    return false;
}

export class VScroll {
    view: FairyGUI.GComponent;
    content: FairyGUI.GComponent;
    onScroll: (pos: number) => void = null;
    private _w: number;
    private _h: number;
    private _contentH: number = 0;
    private _pos: number = 0;
    private _bar: FairyGUI.GComponent;
    private _track: FairyGUI.GGraph;
    private _thumb: FairyGUI.GGraph;
    private _dragging: boolean = false;
    private _dragStartY: number = 0;
    private _dragStartPos: number = 0;
    private _hover: boolean = false;
    private _wheelHandler: (ctx: FairyGUI.EventContext) => void;
    private _disposed: boolean = false;
    private _wheelLogLeft: number = 8;

    constructor(w: number, h: number) {
        this._w = Math.max(1, w);
        this._h = Math.max(1, h);
        this.view = new FairyGUI.GComponent();
        this.view.SetSize(this._w, this._h);
        try { this.view.opaque = true; } catch (e) { }
        try { this.view.touchable = true; } catch (e) { }
        try { this.view.focusable = true; } catch (e) { }
        applyClip(this.view, this._w, this._h);

        this.content = new FairyGUI.GComponent();
        this.content.SetSize(this._w, this._h);
        this.view.AddChild(this.content);

        this._bar = new FairyGUI.GComponent();
        this._bar.SetSize(LAYOUT.SCROLLBAR_W, this._h);
        this._bar.SetXY(this._w - LAYOUT.SCROLLBAR_W, 0);
        try { this._bar.opaque = true; } catch (e) { }
        this._track = createGraph(LAYOUT.SCROLLBAR_W, this._h, COLORS.bgPanel);
        this._bar.AddChild(this._track);
        this._thumb = createGraph(LAYOUT.SCROLLBAR_W - 2, LAYOUT.MIN_THUMB, COLORS.border);
        this._thumb.SetXY(1, 0);
        this._bar.AddChild(this._thumb);
        this._bar.visible = false;
        this.view.AddChild(this._bar);

        const self = this;
        this._bar.onRollOver.Add(() => { self._hover = true; self.syncBar(); });
        this._bar.onRollOut.Add(() => { if (!self._dragging) self._hover = false; self.syncBar(); });
        this._thumb.onTouchBegin.Add((ctx: FairyGUI.EventContext) => {
            try { ctx.CaptureTouch(); } catch (e) { }
            self._dragging = true;
            self._hover = true;
            try { self._dragStartY = ctx.inputEvent.y; } catch (e) { self._dragStartY = 0; }
            self._dragStartPos = self._pos;
        });
        this._thumb.onTouchMove.Add((ctx: FairyGUI.EventContext) => {
            if (!self._dragging) return;
            let y = self._dragStartY;
            try { y = ctx.inputEvent.y; } catch (e) { }
            const m = thumbMetrics(self._h, self._contentH, 0);
            const range = Math.max(1, self._h - m.thumbH);
            const dPos = ((y - self._dragStartY) / range) * scrollMax(self._contentH, self._h);
            self.scrollTo(self._dragStartPos + dPos);
        });
        this._thumb.onTouchEnd.Add(() => {
            self._dragging = false;
            self.syncBar();
        });
        this._bar.onClick.Add((ctx: FairyGUI.EventContext) => {
            if (self._dragging) return;
            let ly = 0;
            try {
                const gp = new UnityEngine.Vector2(ctx.inputEvent.x, ctx.inputEvent.y);
                const lp = self._bar.GlobalToLocal(gp);
                ly = lp.y;
            } catch (e) { return; }
            const m = thumbMetrics(self._h, self._contentH, self._pos);
            if (ly < m.thumbY) self.scrollTo(self._pos - self._h * LAYOUT.PAGE_STEP_RATIO);
            else if (ly > m.thumbY + m.thumbH) self.scrollTo(self._pos + self._h * LAYOUT.PAGE_STEP_RATIO);
        });

        this.view.onClick.Add(() => { try { self.view.RequestFocus(); } catch (e) { } });
        this.view.onKeyDown.Add((ctx: FairyGUI.EventContext) => { self.handleKey(ctx); });

        this._wheelHandler = (ctx: FairyGUI.EventContext) => { self.handleStageWheel(ctx); };
        let stageOk = false;
        try {
            FairyGUI.Stage.inst.onMouseWheel.Add(this._wheelHandler);
            stageOk = true;
        } catch (e) { }
        if (!stageOk) {
            try { this.view.displayObject.onMouseWheel.Add(this._wheelHandler); } catch (e) { }
            try { this.content.displayObject.onMouseWheel.Add(this._wheelHandler); } catch (e) { }
        }
        try { this.view.onRemovedFromStage.Add(() => { self.dispose(); }); } catch (e) { }
        try { this.view.__onDispose = () => { self.dispose(); }; } catch (e) { }
    }

    get pos(): number { return this._pos; }
    get viewHeight(): number { return this._h; }
    get viewWidth(): number { return this._w; }

    setViewSize(w: number, h: number): void {
        this._w = Math.max(1, w);
        this._h = Math.max(1, h);
        this.view.SetSize(this._w, this._h);
        applyClip(this.view, this._w, this._h);
        this.content.SetSize(Math.max(1, this._w), Math.max(this._contentH, this._h));
        this._bar.SetSize(LAYOUT.SCROLLBAR_W, this._h);
        this._bar.SetXY(this._w - LAYOUT.SCROLLBAR_W, 0);
        fillGraph(this._track, LAYOUT.SCROLLBAR_W, this._h, COLORS.bgPanel);
        this.scrollTo(this._pos);
    }

    setContentHeight(h: number): void {
        this._contentH = Math.max(0, h);
        this.content.SetSize(Math.max(1, this._w), Math.max(this._contentH, this._h));
        this.scrollTo(this._pos);
    }

    refresh(): void {
        this.setContentHeight(Math.max(this._contentH, measureContentHeight(this.content)));
    }

    scrollTo(y: number): void {
        const next = clampScroll(y, this._contentH, this._h);
        this._pos = next;
        try { this.content.SetXY(0, -this._pos); } catch (e) { }
        this.syncBar();
        if (this.onScroll) {
            try { this.onScroll(this._pos); } catch (e) { }
        }
    }

    private syncBar(): void {
        const m = thumbMetrics(this._h, this._contentH, this._pos);
        this._bar.visible = m.show;
        if (!m.show) return;
        fillGraph(this._thumb, LAYOUT.SCROLLBAR_W - 2, m.thumbH, this._hover || this._dragging ? COLORS.accent : COLORS.border);
        this._thumb.SetXY(1, m.thumbY);
        try { this._bar.alpha = this._hover || this._dragging ? 1 : 0.55; } catch (e) { }
    }

    private handleWheel(ctx: FairyGUI.EventContext): void {
        let d = 0;
        try { d = ctx.inputEvent.mouseWheelDelta; } catch (e) { }
        if (!d) return;
        const old = this._pos;
        this.scrollTo(this._pos + wheelToScrollDelta(d));
        if (this._wheelLogLeft > 0) {
            this._wheelLogLeft--;
            try { console.log("[FGUI助手] wheel delta=" + d + " pos " + old + " -> " + this._pos); } catch (e) { }
        }
        try { ctx.StopPropagation(); } catch (e) { }
        try { ctx.PreventDefault(); } catch (e) { }
    }

    private handleStageWheel(ctx: FairyGUI.EventContext): void {
        if (this._disposed) return;
        try {
            const t = FairyGUI.Stage.inst.touchTarget;
            if (!isUnder(t, this.view)) return;
        } catch (e) { return; }
        this.handleWheel(ctx);
    }

    private handleKey(ctx: FairyGUI.EventContext): void {
        let code = 0;
        try { code = ctx.inputEvent.keyCode as any; } catch (e) { }
        const page = this._h * LAYOUT.PAGE_STEP_RATIO;
        if (code == 281) this.scrollTo(this._pos + page);
        else if (code == 280) this.scrollTo(this._pos - page);
        else if (code == 278) this.scrollTo(0);
        else if (code == 279) this.scrollTo(scrollMax(this._contentH, this._h));
        else if (code == 274) this.scrollTo(this._pos + LAYOUT.SCROLL_STEP);
        else if (code == 273) this.scrollTo(this._pos - LAYOUT.SCROLL_STEP);
    }

    dispose(): void {
        if (this._disposed) return;
        this._disposed = true;
        try { FairyGUI.Stage.inst.onMouseWheel.Remove(this._wheelHandler); } catch (e) { }
    }
}

export type VirtualRenderer = (index: number, item: FairyGUI.GComponent, data: any, width: number) => void;

export class VirtualList {
    view: FairyGUI.GComponent;
    private scroll: VScroll;
    private data: any[] = [];
    private pool: FairyGUI.GComponent[] = [];
    private assigned: number[] = [];
    private itemH: number;
    private renderFn: VirtualRenderer;
    private _w: number;
    private _h: number;
    private _start: number = -1;
    private _end: number = -1;

    constructor(w: number, h: number, itemH: number, renderFn: VirtualRenderer) {
        this._w = Math.max(1, w);
        this._h = Math.max(1, h);
        this.itemH = Math.max(1, itemH);
        this.renderFn = renderFn;
        this.scroll = new VScroll(this._w, this._h);
        this.view = this.scroll.view;
        const self = this;
        this.scroll.onScroll = () => { self.paint(); };
    }

    setSize(w: number, h: number): void {
        this._w = Math.max(1, w);
        this._h = Math.max(1, h);
        this.scroll.setViewSize(this._w, this._h);
        this._start = -1;
        this.paint(true);
    }

    setData(arr: any[]): void {
        this.data = arr || [];
        this.scroll.setContentHeight(this.data.length * this.itemH);
        this._start = -1;
        this.paint(true);
    }

    private ensurePool(count: number): void {
        while (this.pool.length < count) {
            const item = new FairyGUI.GComponent();
            try { item.opaque = true; } catch (e) { }
            this.scroll.content.AddChild(item);
            this.pool.push(item);
            this.assigned.push(-1);
        }
    }

    private paint(force?: boolean): void {
        const range = visibleIndexRange(this.scroll.pos, this._h, this.itemH, this.data.length, 2);
        if (!force && range.start == this._start && range.end == this._end) return;
        this._start = range.start;
        this._end = range.end;
        const need = Math.max(1, range.end - range.start);
        this.ensurePool(need);
        const itemW = Math.max(10, this._w - (scrollMax(this.data.length * this.itemH, this._h) > 0 ? LAYOUT.SCROLLBAR_W : 0));
        for (let i = 0; i < this.pool.length; i++) {
            const dataIndex = range.start + i;
            const item = this.pool[i];
            if (dataIndex >= range.end || dataIndex >= this.data.length) {
                item.visible = false;
                this.assigned[i] = -1;
                continue;
            }
            item.visible = true;
            item.SetXY(0, dataIndex * this.itemH);
            item.SetSize(itemW, this.itemH);
            applyClip(item, itemW, this.itemH);
            if (force || this.assigned[i] != dataIndex) {
                this.assigned[i] = dataIndex;
                try { this.renderFn(dataIndex, item, this.data[dataIndex], itemW); } catch (e) { }
            }
        }
    }
}

