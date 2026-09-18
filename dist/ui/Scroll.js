"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VirtualList = exports.VScroll = void 0;
exports.applyClip = applyClip;
exports.measureContentHeight = measureContentHeight;
const csharp_1 = require("csharp");
const UiKit_1 = require("./UiKit");
const Layout_1 = require("./Layout");
function applyClip(com, w, h) {
    const cw = Math.max(1, w);
    const ch = Math.max(1, h);
    try {
        com.opaque = true;
    }
    catch (e) { }
    try {
        if (com.rootContainer)
            com.rootContainer.opaque = true;
    }
    catch (e) { }
    try {
        const anyCom = com;
        const OT = csharp_1.FairyGUI.OverflowType;
        if (OT && OT.Hidden != null)
            anyCom.overflow = OT.Hidden;
        else
            anyCom.overflow = 1;
    }
    catch (e) { }
    try {
        const rect = new csharp_1.UnityEngine.Rect(0, 0, cw, ch);
        if (com.rootContainer)
            com.rootContainer.clipRect = rect;
    }
    catch (e) { }
    try {
        if (com.container) {
            const rect2 = new csharp_1.UnityEngine.Rect(0, 0, cw, ch);
            com.container.clipRect = rect2;
        }
    }
    catch (e) { }
}
function measureContentHeight(com) {
    let maxH = 0;
    try {
        for (let i = 0; i < com.numChildren; i++) {
            const c = com.GetChildAt(i);
            const b = c.y + c.height;
            if (b > maxH)
                maxH = b;
        }
    }
    catch (e) { }
    return maxH;
}
function isUnder(target, ancestor) {
    try {
        const root = ancestor.displayObject;
        let p = target;
        while (p) {
            if (p == root || p == ancestor)
                return true;
            try {
                if (p.gOwner == ancestor)
                    return true;
            }
            catch (e) { }
            p = p.parent;
        }
    }
    catch (e) { }
    return false;
}
class VScroll {
    constructor(w, h) {
        this.onScroll = null;
        this._contentH = 0;
        this._pos = 0;
        this._dragging = false;
        this._dragStartY = 0;
        this._dragStartPos = 0;
        this._hover = false;
        this._disposed = false;
        this._w = Math.max(1, w);
        this._h = Math.max(1, h);
        this.view = new csharp_1.FairyGUI.GComponent();
        this.view.SetSize(this._w, this._h);
        try {
            this.view.opaque = true;
        }
        catch (e) { }
        try {
            this.view.touchable = true;
        }
        catch (e) { }
        try {
            this.view.focusable = true;
        }
        catch (e) { }
        applyClip(this.view, this._w, this._h);
        this.content = new csharp_1.FairyGUI.GComponent();
        this.content.SetSize(this._w, this._h);
        this.view.AddChild(this.content);
        this._bar = new csharp_1.FairyGUI.GComponent();
        this._bar.SetSize(Layout_1.LAYOUT.SCROLLBAR_W, this._h);
        this._bar.SetXY(this._w - Layout_1.LAYOUT.SCROLLBAR_W, 0);
        try {
            this._bar.opaque = true;
        }
        catch (e) { }
        this._track = (0, UiKit_1.createGraph)(Layout_1.LAYOUT.SCROLLBAR_W, this._h, UiKit_1.COLORS.bgPanel);
        this._bar.AddChild(this._track);
        this._thumb = (0, UiKit_1.createGraph)(Layout_1.LAYOUT.SCROLLBAR_W - 2, Layout_1.LAYOUT.MIN_THUMB, UiKit_1.COLORS.border);
        this._thumb.SetXY(1, 0);
        this._bar.AddChild(this._thumb);
        this._bar.visible = false;
        this.view.AddChild(this._bar);
        const self = this;
        this._bar.onRollOver.Add(() => { self._hover = true; self.syncBar(); });
        this._bar.onRollOut.Add(() => { if (!self._dragging)
            self._hover = false; self.syncBar(); });
        this._thumb.onTouchBegin.Add((ctx) => {
            try {
                ctx.CaptureTouch();
            }
            catch (e) { }
            self._dragging = true;
            self._hover = true;
            try {
                self._dragStartY = ctx.inputEvent.y;
            }
            catch (e) {
                self._dragStartY = 0;
            }
            self._dragStartPos = self._pos;
        });
        this._thumb.onTouchMove.Add((ctx) => {
            if (!self._dragging)
                return;
            let y = self._dragStartY;
            try {
                y = ctx.inputEvent.y;
            }
            catch (e) { }
            const m = (0, Layout_1.thumbMetrics)(self._h, self._contentH, 0);
            const range = Math.max(1, self._h - m.thumbH);
            const dPos = ((y - self._dragStartY) / range) * (0, Layout_1.scrollMax)(self._contentH, self._h);
            self.scrollTo(self._dragStartPos + dPos);
        });
        this._thumb.onTouchEnd.Add(() => {
            self._dragging = false;
            self.syncBar();
        });
        this._bar.onClick.Add((ctx) => {
            if (self._dragging)
                return;
            let ly = 0;
            try {
                const gp = new csharp_1.UnityEngine.Vector2(ctx.inputEvent.x, ctx.inputEvent.y);
                const lp = self._bar.GlobalToLocal(gp);
                ly = lp.y;
            }
            catch (e) {
                return;
            }
            const m = (0, Layout_1.thumbMetrics)(self._h, self._contentH, self._pos);
            if (ly < m.thumbY)
                self.scrollTo(self._pos - self._h * Layout_1.LAYOUT.PAGE_STEP_RATIO);
            else if (ly > m.thumbY + m.thumbH)
                self.scrollTo(self._pos + self._h * Layout_1.LAYOUT.PAGE_STEP_RATIO);
        });
        this.view.onClick.Add(() => { try {
            self.view.RequestFocus();
        }
        catch (e) { } });
        this.view.onKeyDown.Add((ctx) => { self.handleKey(ctx); });
        this._wheelHandler = (ctx) => { self.handleStageWheel(ctx); };
        let stageOk = false;
        try {
            csharp_1.FairyGUI.Stage.inst.onMouseWheel.Add(this._wheelHandler);
            stageOk = true;
        }
        catch (e) { }
        if (!stageOk) {
            try {
                this.view.displayObject.onMouseWheel.Add(this._wheelHandler);
            }
            catch (e) { }
            try {
                this.content.displayObject.onMouseWheel.Add(this._wheelHandler);
            }
            catch (e) { }
        }
        try {
            this.view.onRemovedFromStage.Add(() => { self.dispose(); });
        }
        catch (e) { }
        try {
            this.view.__onDispose = () => { self.dispose(); };
        }
        catch (e) { }
    }
    get pos() { return this._pos; }
    get viewHeight() { return this._h; }
    get viewWidth() { return this._w; }
    setViewSize(w, h) {
        this._w = Math.max(1, w);
        this._h = Math.max(1, h);
        this.view.SetSize(this._w, this._h);
        applyClip(this.view, this._w, this._h);
        this.content.SetSize(Math.max(1, this._w), Math.max(this._contentH, this._h));
        this._bar.SetSize(Layout_1.LAYOUT.SCROLLBAR_W, this._h);
        this._bar.SetXY(this._w - Layout_1.LAYOUT.SCROLLBAR_W, 0);
        (0, UiKit_1.fillGraph)(this._track, Layout_1.LAYOUT.SCROLLBAR_W, this._h, UiKit_1.COLORS.bgPanel);
        this.scrollTo(this._pos);
    }
    setContentHeight(h) {
        this._contentH = Math.max(0, h);
        this.content.SetSize(Math.max(1, this._w), Math.max(this._contentH, this._h));
        this.scrollTo(this._pos);
    }
    refresh() {
        this.setContentHeight(Math.max(this._contentH, measureContentHeight(this.content)));
    }
    scrollTo(y) {
        const next = (0, Layout_1.clampScroll)(y, this._contentH, this._h);
        this._pos = next;
        try {
            this.content.SetXY(0, -this._pos);
        }
        catch (e) { }
        this.syncBar();
        if (this.onScroll) {
            try {
                this.onScroll(this._pos);
            }
            catch (e) { }
        }
    }
    syncBar() {
        const m = (0, Layout_1.thumbMetrics)(this._h, this._contentH, this._pos);
        this._bar.visible = m.show;
        if (!m.show)
            return;
        (0, UiKit_1.fillGraph)(this._thumb, Layout_1.LAYOUT.SCROLLBAR_W - 2, m.thumbH, this._hover || this._dragging ? UiKit_1.COLORS.accent : UiKit_1.COLORS.border);
        this._thumb.SetXY(1, m.thumbY);
        try {
            this._bar.alpha = this._hover || this._dragging ? 1 : 0.55;
        }
        catch (e) { }
    }
    handleWheel(ctx) {
        let d = 0;
        try {
            d = ctx.inputEvent.mouseWheelDelta;
        }
        catch (e) { }
        if (!d)
            return;
        this.scrollTo(this._pos - d * Layout_1.LAYOUT.SCROLL_STEP);
        try {
            ctx.StopPropagation();
        }
        catch (e) { }
        try {
            ctx.PreventDefault();
        }
        catch (e) { }
    }
    handleStageWheel(ctx) {
        if (this._disposed)
            return;
        try {
            const t = csharp_1.FairyGUI.Stage.inst.touchTarget;
            if (!isUnder(t, this.view))
                return;
        }
        catch (e) {
            return;
        }
        this.handleWheel(ctx);
    }
    handleKey(ctx) {
        let code = 0;
        try {
            code = ctx.inputEvent.keyCode;
        }
        catch (e) { }
        const page = this._h * Layout_1.LAYOUT.PAGE_STEP_RATIO;
        if (code == 281)
            this.scrollTo(this._pos + page);
        else if (code == 280)
            this.scrollTo(this._pos - page);
        else if (code == 278)
            this.scrollTo(0);
        else if (code == 279)
            this.scrollTo((0, Layout_1.scrollMax)(this._contentH, this._h));
        else if (code == 274)
            this.scrollTo(this._pos + Layout_1.LAYOUT.SCROLL_STEP);
        else if (code == 273)
            this.scrollTo(this._pos - Layout_1.LAYOUT.SCROLL_STEP);
    }
    dispose() {
        if (this._disposed)
            return;
        this._disposed = true;
        try {
            csharp_1.FairyGUI.Stage.inst.onMouseWheel.Remove(this._wheelHandler);
        }
        catch (e) { }
    }
}
exports.VScroll = VScroll;
class VirtualList {
    constructor(w, h, itemH, renderFn) {
        this.data = [];
        this.pool = [];
        this.assigned = [];
        this._start = -1;
        this._end = -1;
        this._w = Math.max(1, w);
        this._h = Math.max(1, h);
        this.itemH = Math.max(1, itemH);
        this.renderFn = renderFn;
        this.scroll = new VScroll(this._w, this._h);
        this.view = this.scroll.view;
        const self = this;
        this.scroll.onScroll = () => { self.paint(); };
    }
    setSize(w, h) {
        this._w = Math.max(1, w);
        this._h = Math.max(1, h);
        this.scroll.setViewSize(this._w, this._h);
        this._start = -1;
        this.paint(true);
    }
    setData(arr) {
        this.data = arr || [];
        this.scroll.setContentHeight(this.data.length * this.itemH);
        this._start = -1;
        this.paint(true);
    }
    ensurePool(count) {
        while (this.pool.length < count) {
            const item = new csharp_1.FairyGUI.GComponent();
            try {
                item.opaque = true;
            }
            catch (e) { }
            this.scroll.content.AddChild(item);
            this.pool.push(item);
            this.assigned.push(-1);
        }
    }
    paint(force) {
        const range = (0, Layout_1.visibleIndexRange)(this.scroll.pos, this._h, this.itemH, this.data.length, 2);
        if (!force && range.start == this._start && range.end == this._end)
            return;
        this._start = range.start;
        this._end = range.end;
        const need = Math.max(1, range.end - range.start);
        this.ensurePool(need);
        const itemW = Math.max(10, this._w - ((0, Layout_1.scrollMax)(this.data.length * this.itemH, this._h) > 0 ? Layout_1.LAYOUT.SCROLLBAR_W : 0));
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
                try {
                    this.renderFn(dataIndex, item, this.data[dataIndex], itemW);
                }
                catch (e) { }
            }
        }
    }
}
exports.VirtualList = VirtualList;
