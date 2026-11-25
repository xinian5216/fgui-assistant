"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runEnvCheck = runEnvCheck;
exports.formatEnvCheckReport = formatEnvCheckReport;
exports.showEnvCheckDialog = showEnvCheckDialog;
const csharp_1 = require("csharp");
const Api_1 = require("../Api");
const Config_1 = require("../core/Config");
const EditorService_1 = require("./EditorService");
function safeProbe(fn) {
    try {
        return fn();
    }
    catch (e) {
        return { name: "未知检查项", ok: false, detail: "" + e };
    }
}
function runEnvCheck() {
    const items = [];
    items.push(safeProbe(() => {
        const ver = (0, Api_1.getEditorVersion)();
        return {
            name: "编辑器版本",
            ok: true,
            detail: ver ? ver : "未能读取版本号（不影响功能）"
        };
    }));
    items.push(safeProbe(() => {
        let bp = "";
        try {
            bp = Api_1.App.project && Api_1.App.project.basePath ? "" + Api_1.App.project.basePath : "";
        }
        catch (e) { }
        return {
            name: "App.project.basePath",
            ok: !!bp,
            detail: bp ? bp : "未打开项目或无法读取 basePath"
        };
    }));
    const doc = (0, EditorService_1.getActiveDoc)();
    items.push(safeProbe(() => {
        if (doc) {
            let url = "";
            try {
                url = "" + doc.docURL;
            }
            catch (e) { }
            return { name: "App.activeDoc", ok: true, detail: url || "已打开组件" };
        }
        return {
            name: "App.activeDoc",
            ok: true,
            detail: "当前未打开组件（打开组件后再检可测文档接口）"
        };
    }));
    items.push(safeProbe(() => {
        var _a, _b, _c;
        if (doc) {
            const ok = typeof doc.AddController === "function";
            return {
                name: "Document.AddController",
                ok: ok,
                detail: ok ? "可用（当前文档实例）" : "当前文档缺少 AddController 方法"
            };
        }
        const protoOk = typeof ((_c = (_b = (_a = csharp_1.FairyEditor === null || csharp_1.FairyEditor === void 0 ? void 0 : csharp_1.FairyEditor.View) === null || _a === void 0 ? void 0 : _a.Document) === null || _b === void 0 ? void 0 : _b.prototype) === null || _c === void 0 ? void 0 : _c.AddController) === "function";
        return {
            name: "Document.AddController",
            ok: protoOk,
            detail: protoOk ? "可用（原型探测）" : "未打开组件，无法探测或原型缺失"
        };
    }));
    items.push(safeProbe(() => {
        var _a, _b, _c;
        const sel = (0, EditorService_1.getSelection)();
        const first = sel && sel.length > 0 ? sel[0] : null;
        if (first && first.docElement) {
            const ok = typeof first.docElement.SetGearProperty === "function";
            return {
                name: "DocElement.SetGearProperty",
                ok: ok,
                detail: ok ? "可用（当前选中对象）" : "选中对象的 docElement 缺少 SetGearProperty"
            };
        }
        const protoOk = typeof ((_c = (_b = (_a = csharp_1.FairyEditor === null || csharp_1.FairyEditor === void 0 ? void 0 : csharp_1.FairyEditor.View) === null || _a === void 0 ? void 0 : _a.DocElement) === null || _b === void 0 ? void 0 : _b.prototype) === null || _c === void 0 ? void 0 : _c.SetGearProperty) === "function";
        return {
            name: "DocElement.SetGearProperty",
            ok: protoOk,
            detail: protoOk ? "可用（原型探测）" : "未选中对象，无法探测或原型缺失"
        };
    }));
    items.push(safeProbe(() => {
        var _a;
        const ok = typeof ((_a = csharp_1.FairyEditor === null || csharp_1.FairyEditor === void 0 ? void 0 : csharp_1.FairyEditor.ProcessUtil) === null || _a === void 0 ? void 0 : _a.Start) === "function";
        return { name: "ProcessUtil.Start", ok: ok, detail: ok ? "可用" : "缺失" };
    }));
    items.push(safeProbe(() => {
        var _a;
        const ok = typeof ((_a = csharp_1.FairyEditor === null || csharp_1.FairyEditor === void 0 ? void 0 : csharp_1.FairyEditor.BuilderUtil) === null || _a === void 0 ? void 0 : _a.RevealInExplorer) === "function";
        return { name: "BuilderUtil.RevealInExplorer", ok: ok, detail: ok ? "可用" : "缺失" };
    }));
    items.push(safeProbe(() => {
        var _a;
        const ok = typeof ((_a = csharp_1.FairyEditor === null || csharp_1.FairyEditor === void 0 ? void 0 : csharp_1.FairyEditor.BuilderUtil) === null || _a === void 0 ? void 0 : _a.GetMD5HashFromFile) === "function";
        return { name: "BuilderUtil.GetMD5HashFromFile", ok: ok, detail: ok ? "可用" : "缺失" };
    }));
    items.push(safeProbe(() => {
        var _a;
        const ok = typeof ((_a = csharp_1.FairyEditor === null || csharp_1.FairyEditor === void 0 ? void 0 : csharp_1.FairyEditor.Clipboard) === null || _a === void 0 ? void 0 : _a.SetText) === "function";
        return { name: "Clipboard.SetText", ok: ok, detail: ok ? "可用" : "缺失" };
    }));
    items.push(safeProbe(() => {
        var _a;
        const ok = typeof ((_a = Api_1.App === null || Api_1.App === void 0 ? void 0 : Api_1.App.libView) === null || _a === void 0 ? void 0 : _a.Highlight) === "function";
        return { name: "App.libView.Highlight", ok: ok, detail: ok ? "可用" : "缺失" };
    }));
    items.push(safeProbe(() => {
        var _a;
        const ok = typeof ((_a = Api_1.App === null || Api_1.App === void 0 ? void 0 : Api_1.App.inspectorView) === null || _a === void 0 ? void 0 : _a.AddInspector) === "function";
        return { name: "App.inspectorView.AddInspector", ok: ok, detail: ok ? "可用" : "缺失" };
    }));
    items.push(safeProbe(() => {
        const exe = (Config_1.Config.config.svn && Config_1.Config.config.svn.tortoiseProcPath) || Config_1.DEFAULT_CONFIG.svn.tortoiseProcPath;
        const ok = (0, Api_1.fileExists)(exe);
        return {
            name: "TortoiseSVN",
            ok: ok,
            detail: ok ? exe : `未找到 (${exe})，可在设置页修改路径`
        };
    }));
    return items;
}
function formatEnvCheckReport(items) {
    const list = items || [];
    let okCount = 0;
    for (const item of list) {
        if (item.ok)
            okCount++;
    }
    const lines = [`FGUI Assistant 环境自检（${okCount}/${list.length} 通过）`];
    for (const item of list) {
        lines.push(`${item.ok ? "✓" : "✕"} ${item.name}: ${item.detail}`);
    }
    return lines.join("\n");
}
function showEnvCheckDialog() {
    const items = runEnvCheck();
    const report = formatEnvCheckReport(items);
    (0, Api_1.log)("\n" + report);
    (0, Api_1.alert)(report);
}
