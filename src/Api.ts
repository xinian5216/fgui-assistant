import { FairyGUI, FairyEditor, System } from 'csharp';

export const FGUI = FairyGUI;
export const FEditor = FairyEditor;
export const Sys = System;
export const App = FairyEditor.App;

export function log(msg: string): void {
    try { App.consoleView.Log("[FGUI助手] " + msg); } catch (e) { }
    try { console.log("[FGUI助手] " + msg); } catch (e) { }
}

export function logWarn(msg: string): void {
    try { App.consoleView.LogWarning("[FGUI助手] " + msg); } catch (e) { }
}

export function logError(msg: string): void {
    try { App.consoleView.LogError("[FGUI助手] " + msg); } catch (e) { }
}

export function alert(msg: string): void {
    try { App.Alert(msg); } catch (e) { log(msg); }
}

export function confirm(msg: string, cb: (result: string) => void): void {
    try {
        App.Confirm(msg, (ret: string) => {
            const v = ("" + ret).toLowerCase();
            if (v == "yes" || v == "ok" || v == "true" || v == "确定" || v == "是") cb("yes");
            else cb("no");
        });
    } catch (e) { cb("no"); }
}

export function callLater(cb: () => void): void {
    try { (FairyGUI.Timers as any).CallLater(new FairyGUI.TimerCallback(cb)); } catch (e) {
        try { FairyGUI.Timers.inst.Add(0.05, 1, new FairyGUI.TimerCallback(cb)); } catch (e2) { }
    }
}

export function toArray<T>(list: any): T[] {
    const ret: T[] = [];
    if (!list) return ret;
    try {
        const count: number = list.Count;
        for (let i = 0; i < count; i++) ret.push(list.get_Item(i));
    } catch (e) { }
    return ret;
}

export function joinPath(a: string, b: string): string {
    if (!a) return b;
    if (a.charAt(a.length - 1) == "/" || a.charAt(a.length - 1) == "\\") return a + b;
    return a + "/" + b;
}

export function fileExists(path: string): boolean {
    try { return Sys.IO.File.Exists(path); } catch (e) { return false; }
}

export function dirExists(path: string): boolean {
    try { return !!path && Sys.IO.Directory.Exists(path); } catch (e) { return false; }
}

export function getFileSize(path: string): number {
    try {
        if (!path || !Sys.IO.File.Exists(path)) return -1;
        const info = new Sys.IO.FileInfo(path);
        const len = Number(info.Length);
        return isNaN(len) ? -1 : len;
    } catch (e) { return -1; }
}

export function getFileMd5(path: string): string {
    try {
        if (!path || !Sys.IO.File.Exists(path)) return "";
        return "" + (FEditor.BuilderUtil.GetMD5HashFromFile(path) || "");
    } catch (e) { return ""; }
}

export function revealInExplorer(path: string): boolean {
    try {
        if (!path) return false;
        FEditor.BuilderUtil.RevealInExplorer(path);
        return true;
    } catch (e) { return false; }
}

export function copyToClipboard(text: string): boolean {
    try {
        FEditor.Clipboard.SetText(text || "");
        return true;
    } catch (e) { return false; }
}

export function getEditorVersion(): string {
    try { return "" + (FEditor.ProcessUtil.GetAppVersion() || ""); } catch (e) { return ""; }
}

export function readTextFile(path: string): string {
    try { return Sys.IO.File.ReadAllText(path); } catch (e) { return null; }
}

export function writeTextFile(path: string, content: string): boolean {
    try {
        const dir = path.replace(/[\\/][^\\/]*$/, "");
        if (dir && !Sys.IO.Directory.Exists(dir)) Sys.IO.Directory.CreateDirectory(dir);
        Sys.IO.File.WriteAllText(path, content);
        return true;
    } catch (e) { return false; }
}

export function activeDoc(): FairyEditor.View.Document {
    try { return App.activeDoc; } catch (e) { return null; }
}

export function nowStr(): string {
    const d = new Date();
    const p = (n: number) => (n < 10 ? "0" + n : "" + n);
    return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function nowFullStr(): string {
    const d = new Date();
    const p = (n: number) => (n < 10 ? "0" + n : "" + n);
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
