import { FairyEditor, FairyGUI } from 'csharp';
import { App, activeDoc, toArray, readTextFile } from '../Api';
import { DocModel, ObjInfo, ControllerInfo } from '../core/Types';
import { walkLive, readControllers, objToInfo } from './EditorService';

const XML = FairyGUI.Utils.XML;

export function scanCurrentDoc(): DocModel {
    const doc = activeDoc();
    if (!doc) return null;
    let content: FairyEditor.FComponent = null;
    try { content = doc.content; } catch (e) { }
    if (!content) return null;
    const model: DocModel = {
        docUrl: safeStr(() => doc.docURL),
        componentName: safeStr(() => doc.packageItem.name),
        packageName: safeStr(() => doc.packageItem.owner.name),
        packageId: safeStr(() => doc.packageItem.owner.id),
        isLive: true,
        objects: [],
        controllers: [],
        doc: doc
    };
    walkLive(content, "", 1, model.objects);
    model.controllers = readControllers(content);
    return model;
}

function safeStr(fn: () => any): string {
    try { const v = fn(); return v === null || v === undefined ? "" : "" + v; } catch (e) { return ""; }
}

export function scanPackageItemXml(pi: FairyEditor.FPackageItem): DocModel {
    let text = readTextFile(safeStr(() => pi.file));
    if (!text) {
        try {
            const alt = `${pi.owner.basePath}/assets/${pi.path || ""}${pi.fileName || (pi.name + ".xml")}`;
            text = readTextFile(alt);
        } catch (e) { }
    }
    if (!text) {
        try {
            const asset: any = pi.GetAsset();
            if (asset && asset.xml) text = asset.xml.ToString();
        } catch (e) { }
    }
    if (!text) return null;
    return parseComponentXml(text, pi);
}

export function parseComponentXml(text: string, pi: FairyEditor.FPackageItem): DocModel {
    let xml: FairyGUI.Utils.XML = null;
    try { xml = new XML(text); } catch (e) { return null; }
    if (!xml) return null;
    const model: DocModel = {
        docUrl: safeStr(() => pi.GetURL()),
        componentName: safeStr(() => pi.name),
        packageName: safeStr(() => pi.owner.name),
        packageId: safeStr(() => pi.owner.id),
        isLive: false,
        objects: [],
        controllers: [],
        xmlText: text
    };
    try {
        const ctrlList = xml.elements.Filter("controller");
        const n = ctrlList.Count;
        for (let i = 0; i < n; i++) {
            const c = ctrlList.get_Item(i);
            model.controllers.push(parseControllerXml(c));
        }
    } catch (e) { }
    try {
        const displayList = xml.elements.Find("displayList");
        if (displayList) {
            const children = displayList.elements;
            const n = children.Count;
            for (let i = 0; i < n; i++) {
                const node = children.get_Item(i);
                const info = xmlNodeToInfo(node, "", 1);
                if (info) model.objects.push(info);
            }
        }
    } catch (e) { }
    return model;
}

function parseControllerXml(c: FairyGUI.Utils.XML): ControllerInfo {
    const info: ControllerInfo = { name: "", pages: [], homePage: "", selectedIndex: -1 };
    try { info.name = c.GetAttribute("name", ""); } catch (e) { }
    try { info.homePage = c.GetAttribute("homePage", ""); } catch (e) { }
    try {
        const pagesStr = c.GetAttribute("pages", "");
        if (pagesStr) {
            const parts = pagesStr.split(",");
            for (let i = 0; i + 1 < parts.length; i += 2) {
                info.pages.push({ id: parts[i], name: parts[i + 1] });
            }
        }
    } catch (e) { }
    return info;
}

function xmlNodeToInfo(node: FairyGUI.Utils.XML, parentPath: string, depth: number): ObjInfo {
    let tag = "";
    try { tag = node.name; } catch (e) { return null; }
    if (tag == "displayList") return null;
    const get = (attr: string, def: string): string => {
        try { return node.GetAttribute(attr, def); } catch (e) { return def; }
    };
    const name = get("name", "");
    const path = parentPath ? parentPath + "/" + name : name;
    const info: ObjInfo = {
        id: get("id", ""),
        name: name,
        objectType: tag,
        extType: get("extention", ""),
        path: path,
        depth: depth,
        x: parsePair(get("xy", "0,0"), 0),
        y: parsePair(get("xy", "0,0"), 1),
        width: parsePair(get("size", "0,0"), 0),
        height: parsePair(get("size", "0,0"), 1),
        pivotX: parsePair(get("pivot", "0,0"), 0),
        pivotY: parsePair(get("pivot", "0,0"), 1),
        anchor: get("anchor", "false") == "true",
        childCount: 0,
        resourceURL: ""
    };
    if (info.extType == "Button") {
        try {
            const btn = node.elements.Find("Button");
            if (btn) {
                info.downEffect = btn.GetAttribute("downEffect", "");
                info.downEffectValue = parseFloatSafe(btn.GetAttribute("downEffectValue", "0"));
                info.buttonMode = btn.GetAttribute("mode", "");
            }
        } catch (e) { }
    }
    if (tag == "text" || tag == "richtext" || tag == "inputtext") {
        info.font = get("font", "");
        info.fontSize = parseFloatSafe(get("fontSize", "0"));
    }
    return info;
}

function parsePair(s: string, index: number): number {
    if (!s) return 0;
    const parts = s.split(",");
    if (index >= parts.length) return 0;
    const v = parseFloat(parts[index]);
    return isNaN(v) ? 0 : v;
}

function parseFloatSafe(s: string): number {
    const v = parseFloat(s);
    return isNaN(v) ? 0 : v;
}

export function getPackageComponents(pkg: FairyEditor.FPackage): FairyEditor.FPackageItem[] {
    const ret: FairyEditor.FPackageItem[] = [];
    try {
        const items = toArray<FairyEditor.FPackageItem>(pkg.items);
        for (const pi of items) {
            try {
                if (pi.type == "component" && !pi.isDisposed) {
                    const branch = safeStr(() => pi.branch);
                    if (!branch) ret.push(pi);
                }
            } catch (e) { }
        }
    } catch (e) { }
    return ret;
}

export function getAllPackages(): FairyEditor.FPackage[] {
    try { return toArray<FairyEditor.FPackage>(App.project.allPackages); } catch (e) { return []; }
}

export function getPackageByName(name: string): FairyEditor.FPackage {
    try { return App.project.GetPackageByName(name); } catch (e) { return null; }
}

export interface ScanProgress {
    current: number;
    total: number;
    currentName: string;
}

export function scanPackage(pkg: FairyEditor.FPackage, onProgress?: (p: ScanProgress) => void): DocModel[] {
    const items = getPackageComponents(pkg);
    const models: DocModel[] = [];
    const total = items.length;
    for (let i = 0; i < total; i++) {
        const pi = items[i];
        if (onProgress) onProgress({ current: i + 1, total: total, currentName: pi.name });
        try {
            const model = scanPackageItemXml(pi);
            if (model) models.push(model);
        } catch (e) { }
    }
    return models;
}
