import { FairyEditor, FairyGUI, System } from 'csharp';
import { activeDoc, logWarn } from '../Api';
import { AssistantConfig, Config } from '../core/Config';
import { getSelection, readControllers } from './EditorService';
import { ScanController } from './ScanController';

export interface RedDotCreateResult {
    ok: boolean;
    createdController: boolean;
    boundObject: boolean;
    controllerName: string;
    message: string;
}

export function escapeXmlAttr(s: string): string {
    return (s || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

export function defaultRedDotControllerName(cfg: AssistantConfig): string {
    const pattern = (cfg && cfg.redDot && cfg.redDot.controllerNamePattern) || "HongDian";
    const ctrlPrefix = (cfg && cfg.namingRules && cfg.namingRules.Controller) || "";
    if (ctrlPrefix && pattern.indexOf(ctrlPrefix) !== 0) {
        return ctrlPrefix + pattern;
    }
    return pattern;
}

export function buildRedDotControllerXml(name: string, pageOff?: string, pageOn?: string): string {
    const off = pageOff === undefined || pageOff === null ? "0" : "" + pageOff;
    const on = pageOn === undefined || pageOn === null ? "1" : "" + pageOn;
    const offLabel = off === "0" ? "" : escapeXmlAttr(off);
    const onLabel = on === "1" ? "" : escapeXmlAttr(on);
    const pagesAttr = `0,${offLabel},1,${onLabel}`;
    return `<controller name="${escapeXmlAttr(name)}" pages="${pagesAttr}" selected="0"/>`;
}

function toCsStringArray(items: string[]): any {
    try {
        const strType = System.Type.GetType("System.String");
        if (strType && System.Array && typeof System.Array.CreateInstance === "function") {
            const arr = System.Array.CreateInstance(strType, items.length);
            for (let i = 0; i < items.length; i++) {
                arr.SetValue(items[i], i);
            }
            return arr;
        }
    } catch (e) { }
    return null;
}

function bindGearDisplay(
    obj: FairyEditor.FObject,
    fctrl: FairyEditor.FController,
    ctrlName: string,
    onPageId: string
): boolean {
    const elem = (obj as any).docElement as FairyEditor.View.DocElement;
    if (!elem || typeof elem.SetGearProperty !== "function") return false;

    const trySetController = (val: any): boolean => {
        try {
            elem.SetGearProperty(0, "controller", val);
            return true;
        } catch (e) {
            return false;
        }
    };

    if (fctrl) trySetController(fctrl);
    let attached = false;
    try {
        const g: any = obj.GetGear(0, false);
        attached = !!(g && g.controller);
    } catch (e) { }
    if (!attached) {
        trySetController(ctrlName);
        try {
            const g: any = obj.GetGear(0, false);
            attached = !!(g && g.controller);
        } catch (e) { }
    }

    let pagesSet = false;
    const csArr = toCsStringArray([onPageId]);
    if (csArr) {
        try {
            elem.SetGearProperty(0, "pages", csArr);
            pagesSet = true;
        } catch (e) { }
    }
    if (!pagesSet) {
        try {
            elem.SetGearProperty(0, "pages", onPageId);
            pagesSet = true;
        } catch (e) { }
    }

    try {
        const g: any = obj.GetGear(0, false);
        return !!(g && g.controller);
    } catch (e) {
        return attached && pagesSet;
    }
}

export function createRedDot(): RedDotCreateResult {
    const doc = activeDoc();
    if (!doc || !doc.content) {
        return {
            ok: false,
            createdController: false,
            boundObject: false,
            controllerName: "",
            message: "请先打开一个组件"
        };
    }

    const cfg = Config.config;
    const rdCfg = cfg.redDot || { controllerNamePattern: "HongDian", objectNamePattern: "HongDian", pageOff: "0", pageOn: "1" };
    const pattern = rdCfg.controllerNamePattern || "HongDian";
    const pageOff = rdCfg.pageOff || "0";
    const pageOn = rdCfg.pageOn || "1";

    let controllers = readControllers(doc.content);
    const existing = controllers.find(c => (c.name || "").toLowerCase().indexOf(pattern.toLowerCase()) >= 0);

    let ctrlName = "";
    let createdController = false;

    if (existing) {
        ctrlName = existing.name;
    } else {
        ctrlName = defaultRedDotControllerName(cfg);
        const xmlStr = buildRedDotControllerXml(ctrlName, pageOff, pageOn);
        try {
            const xml = new FairyGUI.Utils.XML(xmlStr);
            doc.AddController(xml);
            createdController = true;
        } catch (e) {
            logWarn("创建红点控制器失败: " + e);
            return {
                ok: false,
                createdController: false,
                boundObject: false,
                controllerName: ctrlName,
                message: "创建控制器失败: " + e
            };
        }
    }

    controllers = readControllers(doc.content);
    const targetCtrlInfo = controllers.find(c => c.name == ctrlName) || existing;
    let onPageId = "1";
    if (targetCtrlInfo) {
        const onPage = targetCtrlInfo.pages.find(p => p.name == pageOn || p.id == pageOn);
        if (onPage && onPage.id) onPageId = onPage.id;
    }

    let fctrl: FairyEditor.FController = null;
    try { fctrl = doc.content.GetController(ctrlName); } catch (e) { }

    const sel = getSelection();
    const targetObj = sel.find(o => o && o !== (doc.content as any)) || null;

    let boundObject = false;
    let message = "";

    if (targetObj) {
        try {
            boundObject = bindGearDisplay(targetObj, fctrl, ctrlName, onPageId);
        } catch (e) {
            logWarn("绑定显示控制失败: " + e);
            boundObject = false;
        }
        if (boundObject) {
            message = createdController
                ? `已创建控制器「${ctrlName}」并绑定「${targetObj.name}」到页 ${pageOn}`
                : `已复用控制器「${ctrlName}」并绑定「${targetObj.name}」到页 ${pageOn}`;
        } else {
            logWarn(`未能自动绑定「${targetObj.name}」的显示控制，请手动勾选页 ${pageOn}`);
            message = `控制器「${ctrlName}」已就绪，请在该对象的『显示控制』里手动勾选页 ${pageOn}`;
        }
    } else {
        message = createdController
            ? `已创建控制器「${ctrlName}」（未选中对象，未绑定显示控制）`
            : `已存在红点控制器「${ctrlName}」（未选中对象）`;
    }

    try { ScanController.scanCurrentComponent(); } catch (e) { }

    return {
        ok: true,
        createdController: createdController,
        boundObject: boundObject,
        controllerName: ctrlName,
        message: message
    };
}
