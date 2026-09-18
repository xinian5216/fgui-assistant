"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanCurrentDoc = scanCurrentDoc;
exports.scanPackageItemXml = scanPackageItemXml;
exports.parseComponentXml = parseComponentXml;
exports.getPackageComponents = getPackageComponents;
exports.getAllPackages = getAllPackages;
exports.getPackageByName = getPackageByName;
exports.scanPackage = scanPackage;
const csharp_1 = require("csharp");
const Api_1 = require("../Api");
const EditorService_1 = require("./EditorService");
const XML = csharp_1.FairyGUI.Utils.XML;
function scanCurrentDoc() {
    const doc = (0, Api_1.activeDoc)();
    if (!doc)
        return null;
    let content = null;
    try {
        content = doc.content;
    }
    catch (e) { }
    if (!content)
        return null;
    const model = {
        docUrl: safeStr(() => doc.docURL),
        componentName: safeStr(() => doc.packageItem.name),
        packageName: safeStr(() => doc.packageItem.owner.name),
        packageId: safeStr(() => doc.packageItem.owner.id),
        isLive: true,
        objects: [],
        controllers: [],
        doc: doc
    };
    (0, EditorService_1.walkLive)(content, "", 1, model.objects);
    model.controllers = (0, EditorService_1.readControllers)(content);
    return model;
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
function scanPackageItemXml(pi) {
    let text = (0, Api_1.readTextFile)(safeStr(() => pi.file));
    if (!text) {
        try {
            const alt = `${pi.owner.basePath}/assets/${pi.path || ""}${pi.fileName || (pi.name + ".xml")}`;
            text = (0, Api_1.readTextFile)(alt);
        }
        catch (e) { }
    }
    if (!text) {
        try {
            const asset = pi.GetAsset();
            if (asset && asset.xml)
                text = asset.xml.ToString();
        }
        catch (e) { }
    }
    if (!text)
        return null;
    return parseComponentXml(text, pi);
}
function parseComponentXml(text, pi) {
    let xml = null;
    try {
        xml = new XML(text);
    }
    catch (e) {
        return null;
    }
    if (!xml)
        return null;
    const model = {
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
    }
    catch (e) { }
    try {
        const displayList = xml.elements.Find("displayList");
        if (displayList) {
            const children = displayList.elements;
            const n = children.Count;
            for (let i = 0; i < n; i++) {
                const node = children.get_Item(i);
                const info = xmlNodeToInfo(node, "", 1);
                if (info)
                    model.objects.push(info);
            }
        }
    }
    catch (e) { }
    return model;
}
function parseControllerXml(c) {
    const info = { name: "", pages: [], homePage: "", selectedIndex: -1 };
    try {
        info.name = c.GetAttribute("name", "");
    }
    catch (e) { }
    try {
        info.homePage = c.GetAttribute("homePage", "");
    }
    catch (e) { }
    try {
        const pagesStr = c.GetAttribute("pages", "");
        if (pagesStr) {
            const parts = pagesStr.split(",");
            for (let i = 0; i + 1 < parts.length; i += 2) {
                info.pages.push({ id: parts[i], name: parts[i + 1] });
            }
        }
    }
    catch (e) { }
    return info;
}
function xmlNodeToInfo(node, parentPath, depth) {
    let tag = "";
    try {
        tag = node.name;
    }
    catch (e) {
        return null;
    }
    if (tag == "displayList")
        return null;
    const get = (attr, def) => {
        try {
            return node.GetAttribute(attr, def);
        }
        catch (e) {
            return def;
        }
    };
    const name = get("name", "");
    const path = parentPath ? parentPath + "/" + name : name;
    const info = {
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
        }
        catch (e) { }
    }
    if (tag == "text" || tag == "richtext" || tag == "inputtext") {
        info.font = get("font", "");
        info.fontSize = parseFloatSafe(get("fontSize", "0"));
    }
    return info;
}
function parsePair(s, index) {
    if (!s)
        return 0;
    const parts = s.split(",");
    if (index >= parts.length)
        return 0;
    const v = parseFloat(parts[index]);
    return isNaN(v) ? 0 : v;
}
function parseFloatSafe(s) {
    const v = parseFloat(s);
    return isNaN(v) ? 0 : v;
}
function getPackageComponents(pkg) {
    const ret = [];
    try {
        const items = (0, Api_1.toArray)(pkg.items);
        for (const pi of items) {
            try {
                if (pi.type == "component" && !pi.isDisposed) {
                    const branch = safeStr(() => pi.branch);
                    if (!branch)
                        ret.push(pi);
                }
            }
            catch (e) { }
        }
    }
    catch (e) { }
    return ret;
}
function getAllPackages() {
    try {
        return (0, Api_1.toArray)(Api_1.App.project.allPackages);
    }
    catch (e) {
        return [];
    }
}
function getPackageByName(name) {
    try {
        return Api_1.App.project.GetPackageByName(name);
    }
    catch (e) {
        return null;
    }
}
function scanPackage(pkg, onProgress) {
    const items = getPackageComponents(pkg);
    const models = [];
    const total = items.length;
    for (let i = 0; i < total; i++) {
        const pi = items[i];
        if (onProgress)
            onProgress({ current: i + 1, total: total, currentName: pi.name });
        try {
            const model = scanPackageItemXml(pi);
            if (model)
                models.push(model);
        }
        catch (e) { }
    }
    return models;
}
