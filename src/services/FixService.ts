import { FairyEditor } from 'csharp';
import { logWarn, activeDoc } from '../Api';
import { Issue } from '../core/Types';
import { findObjectById, setObjProperty, setObjExtProperty } from './EditorService';
import { Store } from '../core/Store';
import { LayoutPreset } from '../core/Config';

export function applyFix(issue: Issue): boolean {
    if (!issue.fixType) return false;
    if (issue.fixType == "ackProtected") {
        Store.ackProtected(issue.fixData.pkg);
        return true;
    }
    const doc = activeDoc();
    if (!doc) return false;
    if (issue.docUrl && doc.docURL != issue.docUrl) {
        logWarn("请先打开对应组件再修复");
        return false;
    }
    const obj = issue.targetId ? findObjectById(doc.content, issue.targetId) : null;
    if (!obj) {
        logWarn("未找到目标对象: " + (issue.objectName || issue.targetId));
        return false;
    }
    switch (issue.fixType) {
        case "naming":
            return fixNaming(obj, issue);
        case "buttonScale":
            return fixButtonScale(obj, issue);
        case "textPivot":
            return fixTextPivot(obj);
        case "layoutPreset":
            return fixLayoutPreset(obj, issue.fixData as LayoutPreset);
        case "font":
            return setObjProperty(obj, "font", issue.fixData.font);
    }
    return false;
}

function fixNaming(obj: FairyEditor.FObject, issue: Issue): boolean {
    const prefix: string = issue.fixData.prefix;
    let name = issue.objectName || "";
    try { name = "" + obj.name; } catch (e) { }
    if (!name || name.indexOf(prefix) == 0) return true;
    return setObjProperty(obj, "name", prefix + name);
}

function fixButtonScale(obj: FairyEditor.FObject, issue: Issue): boolean {
    const scale = issue.fixData.scale;
    let ok = setObjExtProperty(obj, "downEffect", "scale");
    ok = setObjExtProperty(obj, "downEffectValue", scale) && ok;
    return ok;
}

function fixTextPivot(obj: FairyEditor.FObject): boolean {
    let ok = setObjProperty(obj, "pivotX", 0.5);
    ok = setObjProperty(obj, "pivotY", 0.5) && ok;
    ok = setObjProperty(obj, "anchor", true) && ok;
    return ok;
}

function fixLayoutPreset(obj: FairyEditor.FObject, preset: LayoutPreset): boolean {
    let ok = setObjProperty(obj, "x", preset.x);
    ok = setObjProperty(obj, "y", preset.y) && ok;
    return ok;
}

export interface BatchFixResult {
    total: number;
    success: number;
    failed: number;
}

export function applySafeFixes(issues: Issue[]): BatchFixResult {
    const result: BatchFixResult = { total: 0, success: 0, failed: 0 };
    for (const issue of issues) {
        if (!issue.fixable || !issue.fixType) continue;
        if (issue.fixType == "ackProtected") continue;
        result.total++;
        try {
            if (applyFix(issue)) result.success++;
            else result.failed++;
        } catch (e) {
            result.failed++;
        }
    }
    return result;
}
