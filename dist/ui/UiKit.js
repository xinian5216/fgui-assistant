"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Column = exports.UiCheckbox = exports.UiButton = exports.COLORS = void 0;
exports.createGraph = createGraph;
exports.createLabel = createLabel;
exports.setLabelStyle = setLabelStyle;
exports.createInput = createInput;
exports.createTag = createTag;
exports.createHLine = createHLine;
exports.createScrollView = createScrollView;
exports.clearChildren = clearChildren;
exports.toast = toast;
exports.severityColor = severityColor;
exports.severityText = severityText;
const csharp_1 = require("csharp");
const Api_1 = require("../Api");
exports.COLORS = {
    bg: "#26282c",
    bgPanel: "#2f3136",
    bgInput: "#1e1f24",
    border: "#3f4148",
    text: "#d8d8d8",
    textDim: "#9a9a9a",
    accent: "#3c8dbc",
    accentHover: "#4aa3d8",
    error: "#e05252",
    warning: "#d8a232",
    ok: "#52b788",
    info: "#5aa2e0",
    btnBg: "#3a3d44",
    btnHover: "#484c56"
};
function color(hex) {
    try {
        return csharp_1.FairyEditor.ColorUtil.FromHexString(hex);
    }
    catch (e) {
        return null;
    }
}
function createGraph(w, h, fillHex, lineHex) {
    const g = new csharp_1.FairyGUI.GGraph();
    try {
        if (lineHex)
            g.DrawRect(w, h, 1, color(lineHex), color(fillHex));
        else
            g.DrawRect(w, h, 0, color(fillHex), color(fillHex));
    }
    catch (e) { }
    g.SetSize(w, h);
    return g;
}
function createLabel(text, opts) {
    const t = new csharp_1.FairyGUI.GTextField();
    opts = opts || {};
    try {
        const tf = t.textFormat;
        tf.size = opts.size || 12;
        if (opts.bold)
            tf.bold = true;
        t.textFormat = tf;
        if (opts.color)
            t.color = color(opts.color);
        if (opts.wrap && opts.width) {
            t.autoSize = csharp_1.FairyGUI.AutoSizeType.Height;
            t.SetSize(opts.width, 10);
        }
        t.text = text || "";
    }
    catch (e) { }
    return t;
}
function setLabelStyle(t, opts) {
    try {
        const tf = t.textFormat;
        if (opts.size)
            tf.size = opts.size;
        tf.bold = !!opts.bold;
        t.textFormat = tf;
        if (opts.color)
            t.color = color(opts.color);
    }
    catch (e) { }
}
class UiButton {
    constructor(text, opts) {
        this._enabled = true;
        opts = opts || {};
        this._w = opts.w || 90;
        this._h = opts.h || 24;
        this._bgHex = opts.bg || exports.COLORS.btnBg;
        this._hoverHex = opts.hover || exports.COLORS.btnHover;
        this._onClick = opts.onClick;
        this.view = new csharp_1.FairyGUI.GComponent();
        this.view.SetSize(this._w, this._h);
        try {
            this.view.opaque = true;
        }
        catch (e) { }
        this.bg = createGraph(this._w, this._h, this._bgHex);
        this.view.AddChild(this.bg);
        this.label = createLabel(text, { size: opts.size || 12, color: opts.color || exports.COLORS.text, bold: false });
        this.label.SetXY(0, (this._h - 16) / 2 - 1);
        try {
            this.label.autoSize = csharp_1.FairyGUI.AutoSizeType.None;
            this.label.SetSize(this._w, 16);
            this.label.align = csharp_1.FairyGUI.AlignType.Center;
        }
        catch (e) { }
        this.view.AddChild(this.label);
        const self = this;
        this.view.onRollOver.Add(() => { self.redraw(true); });
        this.view.onRollOut.Add(() => { self.redraw(false); });
        this.view.onClick.Add(() => {
            if (!self._enabled)
                return;
            if (self._onClick) {
                try {
                    self._onClick();
                }
                catch (e) {
                    console.warn("[FGUI助手] 按钮回调异常: " + e);
                }
            }
        });
    }
    redraw(hover) {
        if (!this._enabled)
            return;
        const hex = hover ? this._hoverHex : this._bgHex;
        try {
            this.bg.DrawRect(this._w, this._h, 0, color(hex), color(hex));
        }
        catch (e) { }
    }
    setText(text) {
        try {
            this.label.text = text;
        }
        catch (e) { }
    }
    setEnabled(v) {
        this._enabled = v;
        try {
            this.view.alpha = v ? 1 : 0.45;
        }
        catch (e) { }
    }
}
exports.UiButton = UiButton;
class UiCheckbox {
    constructor(text, checked, onChange, opts) {
        opts = opts || {};
        const w = opts.w || 200;
        this._checked = checked;
        this._onChange = onChange;
        this.view = new csharp_1.FairyGUI.GComponent();
        this.view.SetSize(w, 20);
        try {
            this.view.opaque = true;
        }
        catch (e) { }
        this.box = createGraph(13, 13, exports.COLORS.bgInput, exports.COLORS.border);
        this.box.SetXY(0, 3);
        this.view.AddChild(this.box);
        this.mark = createGraph(7, 7, exports.COLORS.accent);
        this.mark.SetXY(3, 6);
        this.mark.visible = checked;
        this.view.AddChild(this.mark);
        this.label = createLabel(text, { size: opts.size || 12, color: opts.color || exports.COLORS.text });
        this.label.SetXY(18, 1);
        this.view.AddChild(this.label);
        const self = this;
        this.view.onClick.Add(() => {
            self._checked = !self._checked;
            try {
                self.mark.visible = self._checked;
            }
            catch (e) { }
            if (self._onChange) {
                try {
                    self._onChange(self._checked);
                }
                catch (e) { }
            }
        });
    }
    get checked() { return this._checked; }
    setChecked(v) {
        this._checked = v;
        try {
            this.mark.visible = v;
        }
        catch (e) { }
    }
}
exports.UiCheckbox = UiCheckbox;
function createInput(w, text, prompt) {
    const input = new csharp_1.FairyGUI.GTextInput();
    try {
        input.SetSize(w, 24);
        input.backgroundColor = color(exports.COLORS.bgInput);
        input.borderColor = color(exports.COLORS.border);
        input.border = 1;
        input.corner = 2;
        const tf = input.textFormat;
        tf.size = 12;
        input.textFormat = tf;
        input.color = color(exports.COLORS.text);
        if (prompt)
            input.promptText = prompt;
        input.text = text || "";
    }
    catch (e) { }
    return input;
}
function createTag(text, colorHex) {
    const w = Math.max(34, text.length * 12 + 10);
    const com = new csharp_1.FairyGUI.GComponent();
    com.SetSize(w, 16);
    const bg = createGraph(w, 16, colorHex);
    com.AddChild(bg);
    const label = createLabel(text, { size: 11, color: "#ffffff", bold: true });
    try {
        label.autoSize = csharp_1.FairyGUI.AutoSizeType.None;
        label.SetSize(w, 14);
        label.align = csharp_1.FairyGUI.AlignType.Center;
    }
    catch (e) { }
    label.SetXY(0, 1);
    com.AddChild(label);
    return com;
}
function createHLine(w) {
    return createGraph(w, 1, exports.COLORS.border);
}
class Column {
    constructor(width, gap) {
        this._y = 0;
        this.width = width;
        this._gap = gap === undefined ? 6 : gap;
        this.com = new csharp_1.FairyGUI.GComponent();
        this.com.SetSize(width, 10);
    }
    add(obj, height) {
        obj.SetXY(0, this._y);
        this.com.AddChild(obj);
        const h = height !== undefined ? height : Math.max(1, obj.height);
        this._y += h + this._gap;
    }
    addAt(obj, x, height) {
        obj.SetXY(x, this._y);
        this.com.AddChild(obj);
        const h = height !== undefined ? height : Math.max(1, obj.height);
        this._y += h + this._gap;
    }
    row(children, height, gap) {
        let x = 0;
        const g = gap === undefined ? 6 : gap;
        for (const c of children) {
            c.obj.SetXY(x, this._y);
            this.com.AddChild(c.obj);
            x += c.w + g;
        }
        this._y += height + this._gap;
    }
    space(h) {
        this._y += h;
    }
    get cursorY() { return this._y; }
    finish() {
        this.com.SetSize(this.width, Math.max(1, this._y));
    }
}
exports.Column = Column;
function createScrollView(w, h) {
    const view = new csharp_1.FairyGUI.GComponent();
    view.SetSize(w, h);
    const content = new csharp_1.FairyGUI.GComponent();
    content.SetSize(w, h);
    view.AddChild(content);
    let scrollOk = false;
    try {
        const anyView = view;
        try {
            anyView.overflow = "scroll";
        }
        catch (e) { }
        let sp = null;
        try {
            sp = view.scrollPane;
        }
        catch (e) { }
        if (!sp) {
            try {
                anyView.overflow = 2;
            }
            catch (e) { }
            try {
                sp = view.scrollPane;
            }
            catch (e) { }
        }
        if (sp) {
            try {
                sp.touchEffect = true;
            }
            catch (e) { }
            try {
                sp.mouseWheelEnabled = true;
            }
            catch (e) { }
            try {
                sp.inertiaDisabled = false;
            }
            catch (e) { }
            view.viewWidth = w;
            view.viewHeight = h;
            scrollOk = true;
        }
    }
    catch (e) { }
    const refresh = () => {
        try {
            if (scrollOk) {
                view.viewWidth = w;
                view.viewHeight = h;
            }
        }
        catch (e) { }
    };
    return { view: view, content: content, refresh: refresh };
}
function clearChildren(com) {
    try {
        const n = com.numChildren;
        if (n > 0)
            com.RemoveChildren(0, n - 1, true);
    }
    catch (e) { }
}
function toast(msg) {
    try {
        const t = createLabel(msg, { size: 13, color: "#ffffff", bold: true });
        const root = Api_1.App.groot;
        const w = Math.min(Math.max(200, msg.length * 14 + 30), 600);
        const holder = new csharp_1.FairyGUI.GComponent();
        holder.SetSize(w, 34);
        const bg = createGraph(w, 34, "#323236");
        holder.AddChild(bg);
        t.SetXY(0, 8);
        try {
            t.autoSize = csharp_1.FairyGUI.AutoSizeType.None;
            t.SetSize(w, 18);
            t.align = csharp_1.FairyGUI.AlignType.Center;
        }
        catch (e) { }
        holder.AddChild(t);
        holder.SetXY((root.width - w) / 2, 60);
        root.AddChild(holder);
        csharp_1.FairyGUI.Timers.inst.Add(2.2, 1, new csharp_1.FairyGUI.TimerCallback(() => {
            try {
                holder.RemoveFromParent();
                holder.Dispose();
            }
            catch (e) { }
        }));
    }
    catch (e) { }
}
function severityColor(sev) {
    switch (sev) {
        case "error": return exports.COLORS.error;
        case "warning": return exports.COLORS.warning;
        case "info": return exports.COLORS.info;
        case "pass": return exports.COLORS.ok;
    }
    return exports.COLORS.textDim;
}
function severityText(sev) {
    switch (sev) {
        case "error": return "错误";
        case "warning": return "警告";
        case "info": return "建议";
        case "pass": return "通过";
    }
    return sev;
}
