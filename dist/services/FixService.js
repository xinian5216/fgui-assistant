"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyFix = applyFix;
exports.applySafeFixes = applySafeFixes;
const Api_1 = require("../Api");
const EditorService_1 = require("./EditorService");
const Store_1 = require("../core/Store");
function applyFix(issue) {
    if (!issue.fixType)
        return false;
    if (issue.fixType == "ackProtected") {
        Store_1.Store.ackProtected(issue.fixData.pkg);
        return true;
    }
    const doc = (0, Api_1.activeDoc)();
    if (!doc)
        return false;
    if (issue.docUrl && doc.docURL != issue.docUrl) {
        (0, Api_1.logWarn)("请先打开对应组件再修复");
        return false;
    }
    const obj = issue.targetId ? (0, EditorService_1.findObjectById)(doc.content, issue.targetId) : null;
    if (!obj) {
        (0, Api_1.logWarn)("未找到目标对象: " + (issue.objectName || issue.targetId));
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
            return fixLayoutPreset(obj, issue.fixData);
        case "font":
            return (0, EditorService_1.setObjProperty)(obj, "font", issue.fixData.font);
    }
    return false;
}
function fixNaming(obj, issue) {
    const prefix = issue.fixData.prefix;
    let name = issue.objectName || "";
    try {
        name = "" + obj.name;
    }
    catch (e) { }
    if (!name || name.indexOf(prefix) == 0)
        return true;
    return (0, EditorService_1.setObjProperty)(obj, "name", prefix + name);
}
function fixButtonScale(obj, issue) {
    const scale = issue.fixData.scale;
    let ok = (0, EditorService_1.setObjExtProperty)(obj, "downEffect", "scale");
    ok = (0, EditorService_1.setObjExtProperty)(obj, "downEffectValue", scale) && ok;
    return ok;
}
function fixTextPivot(obj) {
    let ok = (0, EditorService_1.setObjProperty)(obj, "pivotX", 0.5);
    ok = (0, EditorService_1.setObjProperty)(obj, "pivotY", 0.5) && ok;
    ok = (0, EditorService_1.setObjProperty)(obj, "anchor", true) && ok;
    return ok;
}
function fixLayoutPreset(obj, preset) {
    let ok = (0, EditorService_1.setObjProperty)(obj, "x", preset.x);
    ok = (0, EditorService_1.setObjProperty)(obj, "y", preset.y) && ok;
    return ok;
}
function applySafeFixes(issues) {
    const result = { total: 0, success: 0, failed: 0 };
    for (const issue of issues) {
        if (!issue.fixable || !issue.fixType)
            continue;
        if (issue.fixType == "ackProtected")
            continue;
        result.total++;
        try {
            if (applyFix(issue))
                result.success++;
            else
                result.failed++;
        }
        catch (e) {
            result.failed++;
        }
    }
    return result;
}
