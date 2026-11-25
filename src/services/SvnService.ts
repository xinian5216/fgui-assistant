import { FairyEditor, System } from 'csharp';
import { App, alert, dirExists, fileExists, log, logWarn } from '../Api';
import { Config, DEFAULT_CONFIG } from '../core/Config';
import { Store } from '../core/Store';
import { getCurrentPackageName } from './EditorService';
import { ScanController } from './ScanController';
import { toast } from '../ui/UiKit';

export function buildSvnArgs(cmd: "update" | "commit", targetPath: string): string[] {
    return ["/command:" + cmd, "/path:" + targetPath, "/closeonend:0"];
}

export function getPackageFolderPath(basePath: string, pkgName: string): string {
    const clean = (basePath || "").replace(/[\\/]+$/, "");
    if (!clean) return pkgName ? `assets/${pkgName}` : "assets";
    return pkgName ? `${clean}/assets/${pkgName}` : `${clean}/assets`;
}

function toCsStringArray(items: string[]): any {
    const strType = System.Type.GetType("System.String");
    if (!strType || !System.Array || typeof System.Array.CreateInstance !== "function") {
        return null;
    }
    const arr = System.Array.CreateInstance(strType, items.length);
    for (let i = 0; i < items.length; i++) {
        arr.SetValue(items[i], i);
    }
    return arr;
}

export function runTortoiseSvn(cmd: "update" | "commit", targetPath: string): { ok: boolean; message: string } {
    const exe = (Config.config.svn && Config.config.svn.tortoiseProcPath) || DEFAULT_CONFIG.svn.tortoiseProcPath;
    if (!exe || !fileExists(exe)) {
        return {
            ok: false,
            message: `未找到 TortoiseProc.exe：${exe || "(空)"}\n请在「设置」页修改 SVN 工具路径。`
        };
    }
    if (!targetPath || !dirExists(targetPath)) {
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
        FairyEditor.ProcessUtil.Start(exe, csArgs, targetPath, false);
        log(`已启动 TortoiseSVN (${cmd}): ${targetPath}`);
        return { ok: true, message: "ok" };
    } catch (e) {
        logWarn(`启动 TortoiseSVN 失败: ${e}`);
        return { ok: false, message: "启动 TortoiseSVN 失败: " + e };
    }
}

export function svnUpdateProject(): void {
    let basePath = "";
    try { basePath = App.project && App.project.basePath ? "" + App.project.basePath : ""; } catch (e) { }
    if (!basePath) {
        alert("未打开 FairyGUI 项目，无法执行 SVN Update");
        return;
    }
    const res = runTortoiseSvn("update", basePath);
    if (!res.ok) {
        alert(res.message);
        return;
    }
    Store.markSvnUpdate();
    Store.setPublishStep(0, true, (Config.config.publishChecklist || []).length);
    ScanController.notify();
    toast("已启动 SVN Update");
}

export function svnCommitCurrentPackage(): void {
    let basePath = "";
    try { basePath = App.project && App.project.basePath ? "" + App.project.basePath : ""; } catch (e) { }
    if (!basePath) {
        alert("未打开 FairyGUI 项目，无法执行 SVN Commit");
        return;
    }
    const pkgName = getCurrentPackageName();
    if (!pkgName) {
        alert("请先打开要提交的 Package 中的任意组件，以确定单个包目录");
        return;
    }
    const pkgDir = getPackageFolderPath(basePath, pkgName);
    const res = runTortoiseSvn("commit", pkgDir);
    if (!res.ok) {
        alert(res.message);
        return;
    }
    toast(`已启动 SVN Commit（仅包：${pkgName}）`);
}
