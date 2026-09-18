import { FairyGUI, FairyEditor } from 'csharp';
import { App } from '../Api';

export const COLORS = {
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

function color(hex: string): any {
    try { return FairyEditor.ColorUtil.FromHexString(hex); } catch (e) { return null; }
}

export function fillGraph(g: FairyGUI.GGraph, w: number, h: number, fillHex: string, lineHex?: string): void {
    const cw = Math.max(1, w);
    const ch = Math.max(1, h);
    try {
        if (lineHex) g.DrawRect(cw, ch, 1, color(lineHex), color(fillHex));
        else g.DrawRect(cw, ch, 0, color(fillHex), color(fillHex));
    } catch (e) { }
    try { g.SetSize(cw, ch); } catch (e) { }
}

export function createGraph(w: number, h: number, fillHex: string, lineHex?: string): FairyGUI.GGraph {
    const g = new FairyGUI.GGraph();
    fillGraph(g, w, h, fillHex, lineHex);
    return g;
}

export interface LabelOpts {
    size?: number;
    color?: string;
    bold?: boolean;
    width?: number;
    wrap?: boolean;
}

export function createLabel(text: string, opts?: LabelOpts): FairyGUI.GTextField {
    const t = new FairyGUI.GTextField();
    opts = opts || {};
    try {
        const tf = t.textFormat;
        tf.size = opts.size || 12;
        if (opts.bold) tf.bold = true;
        t.textFormat = tf;
        if (opts.color) t.color = color(opts.color);
        if (opts.width) {
            if (opts.wrap) {
                t.autoSize = FairyGUI.AutoSizeType.Height;
                t.SetSize(opts.width, 10);
            } else {
                t.autoSize = FairyGUI.AutoSizeType.None;
                t.SetSize(opts.width, Math.max(14, (opts.size || 12) + 4));
            }
        }
        t.text = text || "";
    } catch (e) { }
    return t;
}

export function setLabelStyle(t: FairyGUI.GTextField, opts: LabelOpts): void {
    try {
        const tf = t.textFormat;
        if (opts.size) tf.size = opts.size;
        tf.bold = !!opts.bold;
        t.textFormat = tf;
        if (opts.color) t.color = color(opts.color);
    } catch (e) { }
}

export class UiButton {
    view: FairyGUI.GComponent;
    private bg: FairyGUI.GGraph;
    private label: FairyGUI.GTextField;
    private _enabled: boolean = true;
    private _onClick: () => void;
    private _w: number;
    private _h: number;
    private _bgHex: string;
    private _hoverHex: string;

    constructor(text: string, opts?: { w?: number; h?: number; bg?: string; hover?: string; color?: string; size?: number; onClick?: () => void }) {
        opts = opts || {};
        this._w = opts.w || 90;
        this._h = opts.h || 24;
        this._bgHex = opts.bg || COLORS.btnBg;
        this._hoverHex = opts.hover || COLORS.btnHover;
        this._onClick = opts.onClick;
        this.view = new FairyGUI.GComponent();
        this.view.SetSize(this._w, this._h);
        try { this.view.opaque = true; } catch (e) { }
        this.bg = createGraph(this._w, this._h, this._bgHex);
        this.view.AddChild(this.bg);
        this.label = createLabel(text, { size: opts.size || 12, color: opts.color || COLORS.text, bold: false });
        this.label.SetXY(0, (this._h - 16) / 2 - 1);
        try {
            this.label.autoSize = FairyGUI.AutoSizeType.None;
            this.label.SetSize(this._w, 16);
            this.label.align = FairyGUI.AlignType.Center;
        } catch (e) { }
        this.view.AddChild(this.label);
        const self = this;
        this.view.onRollOver.Add(() => { self.redraw(true); });
        this.view.onRollOut.Add(() => { self.redraw(false); });
        this.view.onClick.Add(() => {
            if (!self._enabled) return;
            if (self._onClick) {
                try { self._onClick(); } catch (e) { console.warn("[FGUI助手] 按钮回调异常: " + e); }
            }
        });
    }

    private redraw(hover: boolean): void {
        if (!this._enabled) return;
        const hex = hover ? this._hoverHex : this._bgHex;
        try { this.bg.DrawRect(this._w, this._h, 0, color(hex), color(hex)); } catch (e) { }
    }

    setText(text: string): void {
        try { this.label.text = text; } catch (e) { }
    }

    setEnabled(v: boolean): void {
        this._enabled = v;
        try { this.view.alpha = v ? 1 : 0.45; } catch (e) { }
    }
}

export class UiCheckbox {
    view: FairyGUI.GComponent;
    private box: FairyGUI.GGraph;
    private mark: FairyGUI.GGraph;
    private label: FairyGUI.GTextField;
    private _checked: boolean;
    private _onChange: (v: boolean) => void;

    constructor(text: string, checked: boolean, onChange: (v: boolean) => void, opts?: { w?: number; size?: number; color?: string }) {
        opts = opts || {};
        const w = opts.w || 200;
        this._checked = checked;
        this._onChange = onChange;
        this.view = new FairyGUI.GComponent();
        this.view.SetSize(w, 20);
        try { this.view.opaque = true; } catch (e) { }
        this.box = createGraph(13, 13, COLORS.bgInput, COLORS.border);
        this.box.SetXY(0, 3);
        this.view.AddChild(this.box);
        this.mark = createGraph(7, 7, COLORS.accent);
        this.mark.SetXY(3, 6);
        this.mark.visible = checked;
        this.view.AddChild(this.mark);
        this.label = createLabel(text, { size: opts.size || 12, color: opts.color || COLORS.text });
        this.label.SetXY(18, 1);
        this.view.AddChild(this.label);
        const self = this;
        this.view.onClick.Add(() => {
            self._checked = !self._checked;
            try { self.mark.visible = self._checked; } catch (e) { }
            if (self._onChange) {
                try { self._onChange(self._checked); } catch (e) { }
            }
        });
    }

    get checked(): boolean { return this._checked; }
    setChecked(v: boolean): void {
        this._checked = v;
        try { this.mark.visible = v; } catch (e) { }
    }
}

export function createInput(w: number, text: string, prompt?: string): FairyGUI.GTextInput {
    const input = new FairyGUI.GTextInput();
    try {
        input.SetSize(w, 24);
        input.backgroundColor = color(COLORS.bgInput);
        input.borderColor = color(COLORS.border);
        input.border = 1;
        input.corner = 2;
        const tf = input.textFormat;
        tf.size = 12;
        input.textFormat = tf;
        input.color = color(COLORS.text);
        if (prompt) input.promptText = prompt;
        input.text = text || "";
    } catch (e) { }
    return input;
}

export function createTag(text: string, colorHex: string): FairyGUI.GComponent {
    const w = Math.max(34, text.length * 12 + 10);
    const com = new FairyGUI.GComponent();
    com.SetSize(w, 16);
    const bg = createGraph(w, 16, colorHex);
    com.AddChild(bg);
    const label = createLabel(text, { size: 11, color: "#ffffff", bold: true });
    try {
        label.autoSize = FairyGUI.AutoSizeType.None;
        label.SetSize(w, 14);
        label.align = FairyGUI.AlignType.Center;
    } catch (e) { }
    label.SetXY(0, 1);
    com.AddChild(label);
    return com;
}

export function createHLine(w: number): FairyGUI.GGraph {
    return createGraph(w, 1, COLORS.border);
}

export class Column {
    com: FairyGUI.GComponent;
    private _y: number = 0;
    private _gap: number;
    width: number;

    constructor(width: number, gap?: number) {
        this.width = width;
        this._gap = gap === undefined ? 6 : gap;
        this.com = new FairyGUI.GComponent();
        this.com.SetSize(width, 10);
    }

    add(obj: FairyGUI.GObject, height?: number): void {
        obj.SetXY(0, this._y);
        this.com.AddChild(obj);
        const h = height !== undefined ? height : Math.max(1, obj.height);
        this._y += h + this._gap;
    }

    addAt(obj: FairyGUI.GObject, x: number, height?: number): void {
        obj.SetXY(x, this._y);
        this.com.AddChild(obj);
        const h = height !== undefined ? height : Math.max(1, obj.height);
        this._y += h + this._gap;
    }

    row(children: { obj: FairyGUI.GObject; w: number }[], height: number, gap?: number): void {
        let x = 0;
        const g = gap === undefined ? 6 : gap;
        for (const c of children) {
            c.obj.SetXY(x, this._y);
            this.com.AddChild(c.obj);
            x += c.w + g;
        }
        this._y += height + this._gap;
    }

    space(h: number): void {
        this._y += h;
    }

    get cursorY(): number { return this._y; }

    finish(): void {
        this.com.SetSize(this.width, Math.max(1, this._y));
    }
}

export function clearChildren(com: FairyGUI.GComponent): void {
    try {
        const n = com.numChildren;
        if (n > 0) com.RemoveChildren(0, n - 1, true);
    } catch (e) { }
}

export function toast(msg: string): void {
    try {
        const t = createLabel(msg, { size: 13, color: "#ffffff", bold: true });
        const root = App.groot;
        const w = Math.min(Math.max(200, msg.length * 14 + 30), 600);
        const holder = new FairyGUI.GComponent();
        holder.SetSize(w, 34);
        const bg = createGraph(w, 34, "#323236");
        holder.AddChild(bg);
        t.SetXY(0, 8);
        try {
            t.autoSize = FairyGUI.AutoSizeType.None;
            t.SetSize(w, 18);
            t.align = FairyGUI.AlignType.Center;
        } catch (e) { }
        holder.AddChild(t);
        holder.SetXY((root.width - w) / 2, 60);
        root.AddChild(holder);
        FairyGUI.Timers.inst.Add(2.2, 1, new FairyGUI.TimerCallback(() => {
            try { holder.RemoveFromParent(); holder.Dispose(); } catch (e) { }
        }));
    } catch (e) { }
}

export function severityColor(sev: string): string {
    switch (sev) {
        case "error": return COLORS.error;
        case "warning": return COLORS.warning;
        case "info": return COLORS.info;
        case "pass": return COLORS.ok;
    }
    return COLORS.textDim;
}

export function severityText(sev: string): string {
    switch (sev) {
        case "error": return "错误";
        case "warning": return "警告";
        case "info": return "建议";
        case "pass": return "通过";
    }
    return sev;
}
