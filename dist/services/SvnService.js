"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSvnArgs = buildSvnArgs;
exports.getPackageFolderPath = getPackageFolderPath;
exports.runTortoiseSvn = runTortoiseSvn;
exports.svnUpdateProject = svnUpdateProject;
exports.svnCommitCurrentPackage = svnCommitCurrentPackage;
const csharp_1 = require("csharp");
const Api_1 = require("../Api");
const Config_1 = require("../core/Config");
const Store_1 = require("../core/Store");
const EditorService_1 = require("./EditorService");
const ScanController_1 = require("./ScanController");
const UiKit_1 = require("../ui/UiKit");
function buildSvnArgs(cmd, targetPath) {
    return ["/command:" + cmd, "/path:" + targetPath, "/closeonend:0"];
}
function getPackageFolderPath(basePath, pkgName) {
    const clean = (basePath || "").replace(/[\\/]+$/, "");
    if (!clean)
        return pkgName ? `assets/${pkgName}` : "assets";
    return pkgName ? `${clean}/assets/${pkgName}` : `${clean}/assets`;
}
function toCsStringArray(items) {
    const strType = csharp_1.System.Type.GetType("System.String");
    if (!strType || !csharp_1.System.Array || typeof csharp_1.System.Array.CreateInstance !== "function") {
        return null;
    }
    const arr = csharp_1.System.Array.CreateInstance(strType, items.length);
    for (let i = 0; i < items.length; i++) {
        arr.SetValue(items[i], i);
    }
    return arr;
}
function runTortoiseSvn(cmd, targetPath) {
    const exe = (Config_1.Config.config.svn && Config_1.Config.config.svn.tortoiseProcPath) || Config_1.DEFAULT_CONFIG.svn.tortoiseProcPath;
    if (!exe || !(0, Api_1.fileExists)(exe)) {
        return {
            ok: false,
            message: `未找到 TortoiseProc.exe：${exe || "(空)"}\n请在「设置」页修改 SVN 工具路径。`
        };
    }
    if (!targetPath || !(0, Api_1.dirExists)(targetPath)) {
        return {
            ok: false,
            message: `目标目录不存在：${targetPath || "(空)"}`
        };
    }
    try {
        const args = buildSvnArgs(cmd, targetPath);
        const csArgs = toCsStringArray(args);
        if (!csArgs) {
            return { ok: false, message: "无法构造 C# 字符串数组（System.String 类型不可用）" };
        }
        csharp_1.FairyEditor.ProcessUtil.Start(exe, csArgs, targetPath, false);
        (0, Api_1.log)(`已启动 TortoiseSVN (${cmd}): ${targetPath}`);
        return { ok: true, message: "ok" };
    }
    catch (e) {
        (0, Api_1.logWarn)(`启动 TortoiseSVN 失败: ${e}`);
        return { ok: false, message: "启动 TortoiseSVN 失败: " + e };
    }
}
function svnUpdateProject() {
    let basePath = "";
    try {
        basePath = Api_1.App.project && Api_1.App.project.basePath ? "" + Api_1.App.project.basePath : "";
    }
    catch (e) { }
    if (!basePath) {
        (0, Api_1.alert)("未打开 FairyGUI 项目，无法执行 SVN Update");
        return;
    }
    const res = runTortoiseSvn("update", basePath);
    if (!res.ok) {
        (0, Api_1.alert)(res.message);
        return;
    }
    Store_1.Store.markSvnUpdate();
    Store_1.Store.setPublishStep(0, true, (Config_1.Config.config.publishChecklist || []).length);
    ScanController_1.ScanController.notify();
    (0, UiKit_1.toast)("已启动 SVN Update");
}
function svnCommitCurrentPackage() {
    let basePath = "";
    try {
        basePath = Api_1.App.project && Api_1.App.project.basePath ? "" + Api_1.App.project.basePath : "";
    }
    catch (e) { }
    if (!basePath) {
        (0, Api_1.alert)("未打开 FairyGUI 项目，无法执行 SVN Commit");
        return;
    }
    const pkgName = (0, EditorService_1.getCurrentPackageName)();
    if (!pkgName) {
        (0, Api_1.alert)("请先打开要提交的 Package 中的任意组件，以确定单个包目录");
        return;
    }
    const pkgDir = getPackageFolderPath(basePath, pkgName);
    const res = runTortoiseSvn("commit", pkgDir);
    if (!res.ok) {
        (0, Api_1.alert)(res.message);
        return;
    }
    (0, UiKit_1.toast)(`已启动 SVN Commit（仅包：${pkgName}）`);
}
