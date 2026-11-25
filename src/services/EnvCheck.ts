import { FairyEditor } from 'csharp';
import { App, alert, fileExists, getEditorVersion, log } from '../Api';
import { Config, DEFAULT_CONFIG } from '../core/Config';
import { getActiveDoc, getSelection } from './EditorService';

export interface EnvCheckItem {
    name: string;
    ok: boolean;
    detail: string;
}

function safeProbe(fn: () => EnvCheckItem): EnvCheckItem {
    try {
        return fn();
    } catch (e) {
        return { name: "未知检查项", ok: false, detail: "" + e };
    }
}

export function runEnvCheck(): EnvCheckItem[] {
    const items: EnvCheckItem[] = [];

    items.push(safeProbe(() => {
        const ver = getEditorVersion();
        return {
            name: "编辑器版本",
            ok: true,
            detail: ver ? ver : "未能读取版本号（不影响功能）"
        };
    }));

    items.push(safeProbe(() => {
        let bp = "";
        try { bp = App.project && App.project.basePath ? "" + App.project.basePath : ""; } catch (e) { }
        return {
            name: "App.project.basePath",
            ok: !!bp,
            detail: bp ? bp : "未打开项目或无法读取 basePath"
        };
    }));

    const doc = getActiveDoc();
    items.push(safeProbe(() => {
        if (doc) {
            let url = "";
            try { url = "" + doc.docURL; } catch (e) { }
            return { name: "App.activeDoc", ok: true, detail: url || "已打开组件" };
        }
        return {
            name: "App.activeDoc",
            ok: true,
            detail: "当前未打开组件（打开组件后再检可测文档接口）"
        };
    }));

    items.push(safeProbe(() => {
        if (doc) {
            const ok = typeof (doc as any).AddController === "function";
            return {
                name: "Document.AddController",
                ok: ok,
                detail: ok ? "可用（当前文档实例）" : "当前文档缺少 AddController 方法"
            };
        }
        const protoOk = typeof ((FairyEditor as any)?.View?.Document?.prototype?.AddController) === "function";
        return {
            name: "Document.AddController",
            ok: protoOk,
            detail: protoOk ? "可用（原型探测）" : "未打开组件，无法探测或原型缺失"
        };
    }));

    items.push(safeProbe(() => {
        const sel = getSelection();
        const first = sel && sel.length > 0 ? sel[0] : null;
        if (first && (first as any).docElement) {
            const ok = typeof (first as any).docElement.SetGearProperty === "function";
            return {
                name: "DocElement.SetGearProperty",
                ok: ok,
                detail: ok ? "可用（当前选中对象）" : "选中对象的 docElement 缺少 SetGearProperty"
            };
        }
        const protoOk = typeof ((FairyEditor as any)?.View?.DocElement?.prototype?.SetGearProperty) === "function";
        return {
            name: "DocElement.SetGearProperty",
            ok: protoOk,
            detail: protoOk ? "可用（原型探测）" : "未选中对象，无法探测或原型缺失"
        };
    }));

    items.push(safeProbe(() => {
        const ok = typeof ((FairyEditor as any)?.ProcessUtil?.Start) === "function";
        return { name: "ProcessUtil.Start", ok: ok, detail: ok ? "可用" : "缺失" };
    }));

    items.push(safeProbe(() => {
        const ok = typeof ((FairyEditor as any)?.BuilderUtil?.RevealInExplorer) === "function";
        return { name: "BuilderUtil.RevealInExplorer", ok: ok, detail: ok ? "可用" : "缺失" };
    }));

    items.push(safeProbe(() => {
        const ok = typeof ((FairyEditor as any)?.BuilderUtil?.GetMD5HashFromFile) === "function";
        return { name: "BuilderUtil.GetMD5HashFromFile", ok: ok, detail: ok ? "可用" : "缺失" };
    }));

    items.push(safeProbe(() => {
        const ok = typeof ((FairyEditor as any)?.Clipboard?.SetText) === "function";
        return { name: "Clipboard.SetText", ok: ok, detail: ok ? "可用" : "缺失" };
    }));

    items.push(safeProbe(() => {
        const ok = typeof ((App as any)?.libView?.Highlight) === "function";
        return { name: "App.libView.Highlight", ok: ok, detail: ok ? "可用" : "缺失" };
    }));

    items.push(safeProbe(() => {
        const ok = typeof ((App as any)?.inspectorView?.AddInspector) === "function";
        return { name: "App.inspectorView.AddInspector", ok: ok, detail: ok ? "可用" : "缺失" };
    }));

    items.push(safeProbe(() => {
        const exe = (Config.config.svn && Config.config.svn.tortoiseProcPath) || DEFAULT_CONFIG.svn.tortoiseProcPath;
        const ok = fileExists(exe);
        return {
            name: "TortoiseSVN",
            ok: ok,
            detail: ok ? exe : `未找到 (${exe})，可在设置页修改路径`
        };
    }));

    return items;
}

export function formatEnvCheckReport(items: EnvCheckItem[]): string {
    const list = items || [];
    let okCount = 0;
    for (const item of list) {
        if (item.ok) okCount++;
    }
    const lines: string[] = [`FGUI Assistant 环境自检（${okCount}/${list.length} 通过）`];
    for (const item of list) {
        lines.push(`${item.ok ? "✓" : "✕"} ${item.name}: ${item.detail}`);
    }
    return lines.join("\n");
}

export function showEnvCheckDialog(): void {
    const items = runEnvCheck();
    const report = formatEnvCheckReport(items);
    log("\n" + report);
    alert(report);
}
