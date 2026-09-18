import { FairyEditor, FairyGUI } from 'csharp';
import { App, activeDoc, toArray, callLater, logWarn } from '../Api';
import { ObjInfo, ControllerInfo } from '../core/Types';

export function getActiveDoc(): FairyEditor.View.Document {
    return activeDoc();
}

export function getSelection(): FairyEditor.FObject[] {
    const doc = activeDoc();
    if (!doc) return [];
    try {
        const sel = doc.GetSelection();
        const arr = toArray<FairyEditor.FObject>(sel);
        if (arr.length > 0) return arr;
    } catch (e) { }
    try {
        if (doc.inspectingTarget) return [doc.inspectingTarget];
    } catch (e) { }
    return [];
}

export function getExtType(obj: FairyEditor.FObject): string {
    try {
        const fcomp: any = obj;
        const ext = fcomp.extention;
        if (ext) {
            const t = ext._type;
            if (t) return "" + t;
        }
    } catch (e) { }
    return "";
}

export function getExtProp(obj: FairyEditor.FObject, prop: string): any {
    try {
        const fcomp: any = obj;
        const ext = fcomp.extention;
        if (ext) return ext[prop];
    } catch (e) { }
    return undefined;
}

export function isComponent(obj: FairyEditor.FObject): boolean {
    try {
        return obj.objectType == "component" || obj.objectType == "list" || !!getExtType(obj);
    } catch (e) { return false; }
}

export function objToInfo(obj: FairyEditor.FObject, path: string, depth: number): ObjInfo {
    const info: ObjInfo = {
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
        const fcomp: any = obj;
        if (fcomp.children) info.childCount = fcomp.children.Count;
    } catch (e) { }
    if (info.extType == "Button") {
        const de = getExtProp(obj, "downEffect");
        if (de !== undefined) info.downEffect = "" + de;
        const dev = getExtProp(obj, "downEffectValue");
        if (dev !== undefined) info.downEffectValue = Number(dev);
        const mode = getExtProp(obj, "mode");
        if (mode !== undefined) info.buttonMode = "" + mode;
    }
    if (info.objectType == "text" || info.objectType == "richtext" || info.objectType == "inputtext") {
        try { info.font = "" + (obj as any).font; } catch (e) { }
        try { info.fontSize = Number((obj as any).fontSize); } catch (e) { }
    }
    return info;
}

function safeStr(fn: () => any): string {
    try { const v = fn(); return v === null || v === undefined ? "" : "" + v; } catch (e) { return ""; }
}
function safeNum(fn: () => any): number {
    try { const v = Number(fn()); return isNaN(v) ? 0 : v; } catch (e) { return 0; }
}
function safeBool(fn: () => any): boolean {
    try { return !!fn(); } catch (e) { return false; }
}

export function walkLive(fcomp: FairyEditor.FComponent, parentPath: string, depth: number, out: ObjInfo[]): void {
    let children: FairyEditor.FObject[] = [];
    try { children = toArray<FairyEditor.FObject>(fcomp.children); } catch (e) { return; }
    for (const child of children) {
        const name = safeStr(() => child.name);
        const path = parentPath ? parentPath + "/" + name : name;
        const info = objToInfo(child, path, depth);
        out.push(info);
        try {
            const asComp: any = child;
            if (asComp.children && asComp.children.Count > 0) {
                walkLive(asComp as FairyEditor.FComponent, path, depth + 1, out);
            }
        } catch (e) { }
    }
}

export function readControllers(fcomp: FairyEditor.FComponent): ControllerInfo[] {
    const ret: ControllerInfo[] = [];
    try {
        const ctrls = toArray<FairyEditor.FController>(fcomp.controllers);
        for (const c of ctrls) {
            const pages: { id: string; name: string }[] = [];
            try {
                const pl = toArray<FairyEditor.FControllerPage>(c.GetPages());
                for (const p of pl) pages.push({ id: "" + p.id, name: "" + p.name });
            } catch (e) { }
            ret.push({
                name: "" + c.name,
                pages: pages,
                homePage: safeStr(() => c.homePage),
                selectedIndex: safeNum(() => c.selectedIndex)
            });
        }
    } catch (e) { }
    return ret;
}

export function findObjectById(root: FairyEditor.FComponent, id: string): FairyEditor.FObject {
    if (!root || !id) return null;
    try {
        const direct = root.GetChildById(id);
        if (direct) return direct;
    } catch (e) { }
    try {
        const children = toArray<FairyEditor.FObject>(root.children);
        for (const c of children) {
            const asComp: any = c;
            if (asComp.children && asComp.children.Count > 0) {
                const found = findObjectById(asComp as FairyEditor.FComponent, id);
                if (found) return found;
            }
        }
    } catch (e) { }
    return null;
}

export function findObjectByName(root: FairyEditor.FComponent, pattern: string): FairyEditor.FObject {
    if (!root || !pattern) return null;
    const lower = pattern.toLowerCase();
    const stack: FairyEditor.FComponent[] = [root];
    while (stack.length > 0) {
        const cur = stack.pop();
        let children: FairyEditor.FObject[] = [];
        try { children = toArray<FairyEditor.FObject>(cur.children); } catch (e) { }
        for (const c of children) {
            try {
                if (("" + c.name).toLowerCase().indexOf(lower) >= 0) return c;
                const asComp: any = c;
                if (asComp.children && asComp.children.Count > 0) stack.push(asComp as FairyEditor.FComponent);
            } catch (e) { }
        }
    }
    return null;
}

export function locateObject(docUrl: string, targetId: string, componentName: string): void {
    try {
        const doc = activeDoc();
        if (doc && doc.docURL == docUrl) {
            selectInDoc(doc, targetId);
            return;
        }
        App.docView.OpenDocument(docUrl, true);
        callLater(() => {
            const d = activeDoc();
            if (d && d.docURL == docUrl) selectInDoc(d, targetId);
        });
        try {
            FairyGUI.Timers.inst.Add(0.5, 1, new FairyGUI.TimerCallback(() => {
                try {
                    const d = activeDoc();
                    if (d && d.docURL == docUrl) selectInDoc(d, targetId);
                } catch (e) { }
            }));
        } catch (e) { }
    } catch (e) {
        logWarn("定位失败: " + e);
    }
}

function selectInDoc(doc: FairyEditor.View.Document, targetId: string): void {
    try {
        if (!targetId) return;
        const obj = findObjectById(doc.content, targetId);
        if (obj) doc.SelectObject(obj, true);
    } catch (e) { }
}

export function setObjProperty(obj: FairyEditor.FObject, prop: string, value: any): boolean {
    try {
        obj.docElement.SetProperty(prop, value);
        return true;
    } catch (e) { }
    try {
        (obj as any)[prop] = value;
        return true;
    } catch (e2) {
        logWarn(`设置属性失败 ${prop}: ${e2}`);
        return false;
    }
}

export function setObjExtProperty(obj: FairyEditor.FObject, prop: string, value: any): boolean {
    try {
        obj.docElement.SetExtensionProperty(prop, value);
        return true;
    } catch (e) { }
    try {
        obj.docElement.SetProperty(prop, value);
        return true;
    } catch (e2) { }
    try {
        const fcomp: any = obj;
        if (fcomp.extention) {
            fcomp.extention[prop] = value;
            return true;
        }
    } catch (e3) { }
    logWarn(`设置扩展属性失败 ${prop}`);
    return false;
}

export function getDocUrlForCurrentDoc(): string {
    const doc = activeDoc();
    if (!doc) return "";
    try { return "" + doc.docURL; } catch (e) { return ""; }
}

export function getCurrentPackageName(): string {
    const doc = activeDoc();
    if (!doc) return "";
    try { return "" + doc.packageItem.owner.name; } catch (e) { return ""; }
}

export function getCurrentComponentName(): string {
    const doc = activeDoc();
    if (!doc) return "";
    try { return "" + doc.packageItem.name; } catch (e) { return ""; }
}

export function switchControllerPage(controllerName: string, index: number): boolean {
    const doc = activeDoc();
    if (!doc) return false;
    try {
        doc.SwitchPage(controllerName, index);
        return true;
    } catch (e) {
        logWarn("切换控制器页面失败: " + e);
        return false;
    }
}

export { FairyGUI };
