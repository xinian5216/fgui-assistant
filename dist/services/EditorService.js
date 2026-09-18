"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FairyGUI = void 0;
exports.getActiveDoc = getActiveDoc;
exports.getSelection = getSelection;
exports.getExtType = getExtType;
exports.getExtProp = getExtProp;
exports.isComponent = isComponent;
exports.objToInfo = objToInfo;
exports.walkLive = walkLive;
exports.readControllers = readControllers;
exports.findObjectById = findObjectById;
exports.findObjectByName = findObjectByName;
exports.locateObject = locateObject;
exports.setObjProperty = setObjProperty;
exports.setObjExtProperty = setObjExtProperty;
exports.getDocUrlForCurrentDoc = getDocUrlForCurrentDoc;
exports.getCurrentPackageName = getCurrentPackageName;
exports.getCurrentComponentName = getCurrentComponentName;
exports.switchControllerPage = switchControllerPage;
const csharp_1 = require("csharp");
Object.defineProperty(exports, "FairyGUI", { enumerable: true, get: function () { return csharp_1.FairyGUI; } });
const Api_1 = require("../Api");
function getActiveDoc() {
    return (0, Api_1.activeDoc)();
}
function getSelection() {
    const doc = (0, Api_1.activeDoc)();
    if (!doc)
        return [];
    try {
        const sel = doc.GetSelection();
        const arr = (0, Api_1.toArray)(sel);
        if (arr.length > 0)
            return arr;
    }
    catch (e) { }
    try {
        if (doc.inspectingTarget)
            return [doc.inspectingTarget];
    }
    catch (e) { }
    return [];
}
function getExtType(obj) {
    try {
        const fcomp = obj;
        const ext = fcomp.extention;
        if (ext) {
            const t = ext._type;
            if (t)
                return "" + t;
        }
    }
    catch (e) { }
    return "";
}
function getExtProp(obj, prop) {
    try {
        const fcomp = obj;
        const ext = fcomp.extention;
        if (ext)
            return ext[prop];
    }
    catch (e) { }
    return undefined;
}
function isComponent(obj) {
    try {
        return obj.objectType == "component" || obj.objectType == "list" || !!getExtType(obj);
    }
    catch (e) {
        return false;
    }
}
function objToInfo(obj, path, depth) {
    const info = {
        id: safeStr(() => obj.id),
        name: safeStr(() => obj.name),
        objectType: safeStr(() => obj.objectType),
        extType: getExtType(obj),
        path: path,
        depth: depth,
        x: safeNum(() => obj.x),
        y: safeNum(() => obj.y),
        width: safeNum(() => obj.width),
        height: safeNum(() => obj.height),
        pivotX: safeNum(() => obj.pivotX),
        pivotY: safeNum(() => obj.pivotY),
        anchor: safeBool(() => obj.anchor),
        childCount: 0,
        resourceURL: safeStr(() => obj.resourceURL),
        live: obj
    };
    try {
        const fcomp = obj;
        if (fcomp.children)
            info.childCount = fcomp.children.Count;
    }
    catch (e) { }
    if (info.extType == "Button") {
        const de = getExtProp(obj, "downEffect");
        if (de !== undefined)
            info.downEffect = "" + de;
        const dev = getExtProp(obj, "downEffectValue");
        if (dev !== undefined)
            info.downEffectValue = Number(dev);
        const mode = getExtProp(obj, "mode");
        if (mode !== undefined)
            info.buttonMode = "" + mode;
    }
    if (info.objectType == "text" || info.objectType == "richtext" || info.objectType == "inputtext") {
        try {
            info.font = "" + obj.font;
        }
        catch (e) { }
        try {
            info.fontSize = Number(obj.fontSize);
        }
        catch (e) { }
    }
    return info;
}
function safeStr(fn) {
    try {
        const v = fn();
        return v === null || v === undefined ? "" : "" + v;
    }
    catch (e) {
        return "";
    }
}
function safeNum(fn) {
    try {
        const v = Number(fn());
        return isNaN(v) ? 0 : v;
    }
    catch (e) {
        return 0;
    }
}
function safeBool(fn) {
    try {
        return !!fn();
    }
    catch (e) {
        return false;
    }
}
function walkLive(fcomp, parentPath, depth, out) {
    let children = [];
    try {
        children = (0, Api_1.toArray)(fcomp.children);
    }
    catch (e) {
        return;
    }
    for (const child of children) {
        const name = safeStr(() => child.name);
        const path = parentPath ? parentPath + "/" + name : name;
        const info = objToInfo(child, path, depth);
        out.push(info);
        try {
            const asComp = child;
            if (asComp.children && asComp.children.Count > 0) {
                walkLive(asComp, path, depth + 1, out);
            }
        }
        catch (e) { }
    }
}
function readControllers(fcomp) {
    const ret = [];
    try {
        const ctrls = (0, Api_1.toArray)(fcomp.controllers);
        for (const c of ctrls) {
            const pages = [];
            try {
                const pl = (0, Api_1.toArray)(c.GetPages());
                for (const p of pl)
                    pages.push({ id: "" + p.id, name: "" + p.name });
            }
            catch (e) { }
            ret.push({
                name: "" + c.name,
                pages: pages,
                homePage: safeStr(() => c.homePage),
                selectedIndex: safeNum(() => c.selectedIndex)
            });
        }
    }
    catch (e) { }
    return ret;
}
function findObjectById(root, id) {
    if (!root || !id)
        return null;
    try {
        const direct = root.GetChildById(id);
        if (direct)
            return direct;
    }
    catch (e) { }
    try {
        const children = (0, Api_1.toArray)(root.children);
        for (const c of children) {
            const asComp = c;
            if (asComp.children && asComp.children.Count > 0) {
                const found = findObjectById(asComp, id);
                if (found)
                    return found;
            }
        }
    }
    catch (e) { }
    return null;
}
function findObjectByName(root, pattern) {
    if (!root || !pattern)
        return null;
    const lower = pattern.toLowerCase();
    const stack = [root];
    while (stack.length > 0) {
        const cur = stack.pop();
        let children = [];
        try {
            children = (0, Api_1.toArray)(cur.children);
        }
        catch (e) { }
        for (const c of children) {
            try {
                if (("" + c.name).toLowerCase().indexOf(lower) >= 0)
                    return c;
                const asComp = c;
                if (asComp.children && asComp.children.Count > 0)
                    stack.push(asComp);
            }
            catch (e) { }
        }
    }
    return null;
}
function locateObject(docUrl, targetId, componentName) {
    try {
        const doc = (0, Api_1.activeDoc)();
        if (doc && doc.docURL == docUrl) {
            selectInDoc(doc, targetId);
            return;
        }
        Api_1.App.docView.OpenDocument(docUrl, true);
        (0, Api_1.callLater)(() => {
            const d = (0, Api_1.activeDoc)();
            if (d && d.docURL == docUrl)
                selectInDoc(d, targetId);
        });
        try {
            csharp_1.FairyGUI.Timers.inst.Add(0.5, 1, new csharp_1.FairyGUI.TimerCallback(() => {
                try {
                    const d = (0, Api_1.activeDoc)();
                    if (d && d.docURL == docUrl)
                        selectInDoc(d, targetId);
                }
                catch (e) { }
            }));
        }
        catch (e) { }
    }
    catch (e) {
        (0, Api_1.logWarn)("定位失败: " + e);
    }
}
function selectInDoc(doc, targetId) {
    try {
        if (!targetId)
            return;
        const obj = findObjectById(doc.content, targetId);
        if (obj)
            doc.SelectObject(obj, true);
    }
    catch (e) { }
}
function setObjProperty(obj, prop, value) {
    try {
        obj.docElement.SetProperty(prop, value);
        return true;
    }
    catch (e) { }
    try {
        obj[prop] = value;
        return true;
    }
    catch (e2) {
        (0, Api_1.logWarn)(`设置属性失败 ${prop}: ${e2}`);
        return false;
    }
}
function setObjExtProperty(obj, prop, value) {
    try {
        obj.docElement.SetExtensionProperty(prop, value);
        return true;
    }
    catch (e) { }
    try {
        obj.docElement.SetProperty(prop, value);
        return true;
    }
    catch (e2) { }
    try {
        const fcomp = obj;
        if (fcomp.extention) {
            fcomp.extention[prop] = value;
            return true;
        }
    }
    catch (e3) { }
    (0, Api_1.logWarn)(`设置扩展属性失败 ${prop}`);
    return false;
}
function getDocUrlForCurrentDoc() {
    const doc = (0, Api_1.activeDoc)();
    if (!doc)
        return "";
    try {
        return "" + doc.docURL;
    }
    catch (e) {
        return "";
    }
}
function getCurrentPackageName() {
    const doc = (0, Api_1.activeDoc)();
    if (!doc)
        return "";
    try {
        return "" + doc.packageItem.owner.name;
    }
    catch (e) {
        return "";
    }
}
function getCurrentComponentName() {
    const doc = (0, Api_1.activeDoc)();
    if (!doc)
        return "";
    try {
        return "" + doc.packageItem.name;
    }
    catch (e) {
        return "";
    }
}
function switchControllerPage(controllerName, index) {
    const doc = (0, Api_1.activeDoc)();
    if (!doc)
        return false;
    try {
        doc.SwitchPage(controllerName, index);
        return true;
    }
    catch (e) {
        (0, Api_1.logWarn)("切换控制器页面失败: " + e);
        return false;
    }
}
