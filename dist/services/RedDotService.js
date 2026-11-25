"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeXmlAttr = escapeXmlAttr;
exports.defaultRedDotControllerName = defaultRedDotControllerName;
exports.buildRedDotControllerXml = buildRedDotControllerXml;
exports.createRedDot = createRedDot;
const csharp_1 = require("csharp");
const Api_1 = require("../Api");
const Config_1 = require("../core/Config");
const EditorService_1 = require("./EditorService");
const ScanController_1 = require("./ScanController");
function escapeXmlAttr(s) {
    return (s || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
function defaultRedDotControllerName(cfg) {
    const pattern = (cfg && cfg.redDot && cfg.redDot.controllerNamePattern) || "HongDian";
    const ctrlPrefix = (cfg && cfg.namingRules && cfg.namingRules.Controller) || "";
    if (ctrlPrefix && pattern.indexOf(ctrlPrefix) !== 0) {
        return ctrlPrefix + pattern;
    }
    return pattern;
}
function buildRedDotControllerXml(name, pageOff, pageOn) {
    const off = pageOff === undefined || pageOff === null ? "0" : "" + pageOff;
    const on = pageOn === undefined || pageOn === null ? "1" : "" + pageOn;
    const offLabel = off === "0" ? "" : escapeXmlAttr(off);
    const onLabel = on === "1" ? "" : escapeXmlAttr(on);
    const pagesAttr = `0,${offLabel},1,${onLabel}`;
    return `<controller name="${escapeXmlAttr(name)}" pages="${pagesAttr}" selected="0"/>`;
}
function toCsStringArray(items) {
    try {
        const strType = csharp_1.System.Type.GetType("System.String");
        if (strType && csharp_1.System.Array && typeof csharp_1.System.Array.CreateInstance === "function") {
            const arr = csharp_1.System.Array.CreateInstance(strType, items.length);
            for (let i = 0; i < items.length; i++) {
                arr.SetValue(items[i], i);
            }
            return arr;
        }
    }
    catch (e) { }
    return null;
}
function bindGearDisplay(obj, fctrl, ctrlName, onPageId) {
    const elem = obj.docElement;
    if (!elem || typeof elem.SetGearProperty !== "function")
        return false;
    const trySetController = (val) => {
        try {
            elem.SetGearProperty(0, "controller", val);
            return true;
        }
        catch (e) {
            return false;
        }
    };
    if (fctrl)
        trySetController(fctrl);
    let attached = false;
    try {
        const g = obj.GetGear(0, false);
        attached = !!(g && g.controller);
    }
    catch (e) { }
    if (!attached) {
        trySetController(ctrlName);
        try {
            const g = obj.GetGear(0, false);
            attached = !!(g && g.controller);
        }
        catch (e) { }
    }
    let pagesSet = false;
    const csArr = toCsStringArray([onPageId]);
    if (csArr) {
        try {
            elem.SetGearProperty(0, "pages", csArr);
            pagesSet = true;
        }
        catch (e) { }
    }
    if (!pagesSet) {
        try {
            elem.SetGearProperty(0, "pages", onPageId);
            pagesSet = true;
        }
        catch (e) { }
    }
    try {
        const g = obj.GetGear(0, false);
        return !!(g && g.controller);
    }
    catch (e) {
        return attached && pagesSet;
    }
}
function createRedDot() {
    const doc = (0, Api_1.activeDoc)();
    if (!doc || !doc.content) {
        return {
            ok: false,
            createdController: false,
            boundObject: false,
            controllerName: "",
            message: "请先打开一个组件"
        };
    }
    const cfg = Config_1.Config.config;
    const rdCfg = cfg.redDot || { controllerNamePattern: "HongDian", objectNamePattern: "HongDian", pageOff: "0", pageOn: "1" };
    const pattern = rdCfg.controllerNamePattern || "HongDian";
    const pageOff = rdCfg.pageOff || "0";
    const pageOn = rdCfg.pageOn || "1";
    let controllers = (0, EditorService_1.readControllers)(doc.content);
    const existing = controllers.find(c => (c.name || "").toLowerCase().indexOf(pattern.toLowerCase()) >= 0);
    let ctrlName = "";
    let createdController = false;
    if (existing) {
        ctrlName = existing.name;
    }
    else {
        ctrlName = defaultRedDotControllerName(cfg);
        const xmlStr = buildRedDotControllerXml(ctrlName, pageOff, pageOn);
        try {
            const xml = new csharp_1.FairyGUI.Utils.XML(xmlStr);
            doc.AddController(xml);
            createdController = true;
        }
        catch (e) {
            (0, Api_1.logWarn)("创建红点控制器失败: " + e);
            return {
                ok: false,
                createdController: false,
                boundObject: false,
                controllerName: ctrlName,
                message: "创建控制器失败: " + e
            };
        }
    }
    controllers = (0, EditorService_1.readControllers)(doc.content);
    const targetCtrlInfo = controllers.find(c => c.name == ctrlName) || existing;
    let onPageId = "1";
    if (targetCtrlInfo) {
        const onPage = targetCtrlInfo.pages.find(p => p.name == pageOn || p.id == pageOn);
        if (onPage && onPage.id)
            onPageId = onPage.id;
    }
    let fctrl = null;
    try {
        fctrl = doc.content.GetController(ctrlName);
    }
    catch (e) { }
    const sel = (0, EditorService_1.getSelection)();
    const targetObj = sel.find(o => o && o !== doc.content) || null;
    let boundObject = false;
    let message = "";
    if (targetObj) {
        try {
            boundObject = bindGearDisplay(targetObj, fctrl, ctrlName, onPageId);
        }
        catch (e) {
            (0, Api_1.logWarn)("绑定显示控制失败: " + e);
            boundObject = false;
        }
        if (boundObject) {
            message = createdController
                ? `已创建控制器「${ctrlName}」并绑定「${targetObj.name}」到页 ${pageOn}`
                : `已复用控制器「${ctrlName}」并绑定「${targetObj.name}」到页 ${pageOn}`;
        }
        else {
            (0, Api_1.logWarn)(`未能自动绑定「${targetObj.name}」的显示控制，请手动勾选页 ${pageOn}`);
            message = `控制器「${ctrlName}」已就绪，请在该对象的『显示控制』里手动勾选页 ${pageOn}`;
        }
    }
    else {
        message = createdController
            ? `已创建控制器「${ctrlName}」（未选中对象，未绑定显示控制）`
            : `已存在红点控制器「${ctrlName}」（未选中对象）`;
    }
    try {
        ScanController_1.ScanController.scanCurrentComponent();
    }
    catch (e) { }
    return {
        ok: true,
        createdController: createdController,
        boundObject: boundObject,
        controllerName: ctrlName,
        message: message
    };
}
