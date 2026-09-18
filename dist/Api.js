"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = exports.Sys = exports.FEditor = exports.FGUI = void 0;
exports.log = log;
exports.logWarn = logWarn;
exports.logError = logError;
exports.alert = alert;
exports.confirm = confirm;
exports.callLater = callLater;
exports.toArray = toArray;
exports.joinPath = joinPath;
exports.fileExists = fileExists;
exports.readTextFile = readTextFile;
exports.writeTextFile = writeTextFile;
exports.activeDoc = activeDoc;
exports.nowStr = nowStr;
exports.nowFullStr = nowFullStr;
const csharp_1 = require("csharp");
exports.FGUI = csharp_1.FairyGUI;
exports.FEditor = csharp_1.FairyEditor;
exports.Sys = csharp_1.System;
exports.App = csharp_1.FairyEditor.App;
function log(msg) {
    try {
        exports.App.consoleView.Log("[FGUI助手] " + msg);
    }
    catch (e) { }
    try {
        console.log("[FGUI助手] " + msg);
    }
    catch (e) { }
}
function logWarn(msg) {
    try {
        exports.App.consoleView.LogWarning("[FGUI助手] " + msg);
    }
    catch (e) { }
}
function logError(msg) {
    try {
        exports.App.consoleView.LogError("[FGUI助手] " + msg);
    }
    catch (e) { }
}
function alert(msg) {
    try {
        exports.App.Alert(msg);
    }
    catch (e) {
        log(msg);
    }
}
function confirm(msg, cb) {
    try {
        exports.App.Confirm(msg, (ret) => {
            const v = ("" + ret).toLowerCase();
            if (v == "yes" || v == "ok" || v == "true" || v == "确定" || v == "是")
                cb("yes");
            else
                cb("no");
        });
    }
    catch (e) {
        cb("no");
    }
}
function callLater(cb) {
    try {
        csharp_1.FairyGUI.Timers.CallLater(new csharp_1.FairyGUI.TimerCallback(cb));
    }
    catch (e) {
        try {
            csharp_1.FairyGUI.Timers.inst.Add(0.05, 1, new csharp_1.FairyGUI.TimerCallback(cb));
        }
        catch (e2) { }
    }
}
function toArray(list) {
    const ret = [];
    if (!list)
        return ret;
    try {
        const count = list.Count;
        for (let i = 0; i < count; i++)
            ret.push(list.get_Item(i));
    }
    catch (e) { }
    return ret;
}
function joinPath(a, b) {
    if (!a)
        return b;
    if (a.charAt(a.length - 1) == "/" || a.charAt(a.length - 1) == "\\")
        return a + b;
    return a + "/" + b;
}
function fileExists(path) {
    try {
        return exports.Sys.IO.File.Exists(path);
    }
    catch (e) {
        return false;
    }
}
function readTextFile(path) {
    try {
        return exports.Sys.IO.File.ReadAllText(path);
    }
    catch (e) {
        return null;
    }
}
function writeTextFile(path, content) {
    try {
        const dir = path.replace(/[\\/][^\\/]*$/, "");
        if (dir && !exports.Sys.IO.Directory.Exists(dir))
            exports.Sys.IO.Directory.CreateDirectory(dir);
        exports.Sys.IO.File.WriteAllText(path, content);
        return true;
    }
    catch (e) {
        return false;
    }
}
function activeDoc() {
    try {
        return exports.App.activeDoc;
    }
    catch (e) {
        return null;
    }
}
function nowStr() {
    const d = new Date();
    const p = (n) => (n < 10 ? "0" + n : "" + n);
    return `${p(d.getHours())}:${p(d.getMinutes())}`;
}
function nowFullStr() {
    const d = new Date();
    const p = (n) => (n < 10 ? "0" + n : "" + n);
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
