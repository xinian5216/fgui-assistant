"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceAuditController = void 0;
exports.parsePackageXml = parsePackageXml;
exports.collectComponentRefs = collectComponentRefs;
exports.collectFontRefs = collectFontRefs;
exports.auditResources = auditResources;
exports.locateResource = locateResource;
const csharp_1 = require("csharp");
const Api_1 = require("../Api");
const Config_1 = require("../core/Config");
const EditorService_1 = require("./EditorService");
const ScanService_1 = require("./ScanService");
const UiKit_1 = require("../ui/UiKit");
function readAttr(attrsStr, name) {
    if (!attrsStr)
        return "";
    const re = new RegExp(`\\b${name}="([^"]*)"`, "i");
    const m = re.exec(attrsStr);
    return m ? m[1] : "";
}
function parsePackageXml(xmlText, pkgName) {
    const pkg = { id: "", name: pkgName || "", items: [] };
    if (!xmlText)
        return pkg;
    const descMatch = /<packageDescription\b([^>]*)>/i.exec(xmlText);
    if (descMatch) {
        pkg.id = readAttr(descMatch[1], "id");
    }
    const itemRe = /<(image|component|sound|movieclip|font|swf|misc|spine|dragonbones)\b([^>]*?)\/?>/gi;
    let m;
    while ((m = itemRe.exec(xmlText)) !== null) {
        const type = m[1].toLowerCase();
        const attrs = m[2];
        const id = readAttr(attrs, "id");
        const name = readAttr(attrs, "name");
        const path = readAttr(attrs, "path") || "/";
        const exported = readAttr(attrs, "exported") === "true";
        if (!id)
            continue;
        pkg.items.push({
            pkgId: pkg.id,
            pkgName: pkg.name,
            id: id,
            type: type,
            name: name,
            path: path,
            exported: exported,
            url: pkg.id ? `ui://${pkg.id}${id}` : ""
        });
    }
    return pkg;
}
function collectComponentRefs(xmlText, ownPkgId, fromPkgName, fromCompName, fromUrl) {
    const refs = [];
    if (!xmlText)
        return refs;
    const seen = new Set();
    const pushRef = (toPkgId, toResId) => {
        if (!toPkgId || !toResId)
            return;
        const key = toPkgId + ":" + toResId;
        if (seen.has(key))
            return;
        seen.add(key);
        refs.push({
            fromPkgId: ownPkgId,
            fromPkgName: fromPkgName,
            fromCompName: fromCompName,
            fromUrl: fromUrl,
            toPkgId: toPkgId,
            toResId: toResId
        });
    };
    const tagRe = /<([a-zA-Z0-9_]+)\b([^>]*)>/g;
    let m;
    while ((m = tagRe.exec(xmlText)) !== null) {
        const attrs = m[2];
        const src = readAttr(attrs, "src");
        if (src) {
            const pkg = readAttr(attrs, "pkg") || ownPkgId;
            pushRef(pkg, src);
        }
    }
    const urlRe = /ui:\/\/([a-z0-9]{8})([a-z0-9]+)/gi;
    while ((m = urlRe.exec(xmlText)) !== null) {
        pushRef(m[1], m[2]);
    }
    return refs;
}
function collectFontRefs(fntText, ownPkgId, fromPkgName, fromFontName) {
    const refs = [];
    if (!fntText || !ownPkgId)
        return refs;
    const seen = new Set();
    const re = /\bimg=([a-z0-9]+)/gi;
    let m;
    while ((m = re.exec(fntText)) !== null) {
        const resId = m[1];
        if (!resId || seen.has(resId))
            continue;
        seen.add(resId);
        refs.push({
            fromPkgId: ownPkgId,
            fromPkgName: fromPkgName,
            fromCompName: fromFontName,
            toPkgId: ownPkgId,
            toResId: resId
        });
    }
    return refs;
}
const SEVERITY_ORDER = { error: 0, warning: 1, info: 2, pass: 3 };
function auditResources(packages, allRefs, opts) {
    const issues = [];
    const byKey = new Map();
    for (const pkg of packages) {
        for (const item of pkg.items) {
            byKey.set(`${item.pkgId}:${item.id}`, item);
        }
    }
    const referencedSet = new Set();
    for (const ref of allRefs) {
        referencedSet.add(`${ref.toPkgId}:${ref.toResId}`);
    }
    const scopePkgId = opts.scopePkgId || "";
    const seenCross = new Set();
    for (const ref of allRefs) {
        if (!ref.fromPkgId || !ref.toPkgId || ref.fromPkgId === ref.toPkgId)
            continue;
        const target = byKey.get(`${ref.toPkgId}:${ref.toResId}`);
        if (!target || target.exported)
            continue;
        if (scopePkgId && ref.fromPkgId !== scopePkgId && target.pkgId !== scopePkgId)
            continue;
        const crossKey = `${ref.fromPkgId}:${ref.fromCompName}->${target.pkgId}:${target.id}`;
        if (seenCross.has(crossKey))
            continue;
        seenCross.add(crossKey);
        issues.push({
            kind: "crossUnexported",
            severity: "error",
            title: `跨包引用未导出：${target.pkgName}/${target.name}`,
            detail: `被 ${ref.fromPkgName}/${ref.fromCompName} 引用，未设为导出`,
            pkgName: target.pkgName,
            resName: target.name,
            url: target.url,
            filePath: target.filePath
        });
    }
    const maxBytes = Math.max(1, opts.maxImageKB || 512) * 1024;
    for (const pkg of packages) {
        if (scopePkgId && pkg.id !== scopePkgId)
            continue;
        for (const item of pkg.items) {
            const key = `${item.pkgId}:${item.id}`;
            if (!item.exported && !referencedSet.has(key)) {
                const isComp = item.type === "component";
                issues.push({
                    kind: "unused",
                    severity: isComp ? "info" : "warning",
                    title: `未使用资源：${item.pkgName}/${item.name}`,
                    detail: `${item.type} · ${item.path}${item.name}${isComp ? "（组件可能由代码加载）" : ""}`,
                    pkgName: item.pkgName,
                    resName: item.name,
                    url: item.url,
                    filePath: item.filePath
                });
            }
            if (item.type === "image" && typeof item.sizeBytes === "number" && item.sizeBytes > maxBytes) {
                const kb = Math.round(item.sizeBytes / 1024);
                issues.push({
                    kind: "largeImage",
                    severity: "warning",
                    title: `超大图片（${kb} KB）：${item.pkgName}/${item.name}`,
                    detail: `超过阈值 ${opts.maxImageKB} KB · ${item.path}${item.name}`,
                    pkgName: item.pkgName,
                    resName: item.name,
                    url: item.url,
                    filePath: item.filePath
                });
            }
        }
    }
    if (opts.checkDuplicate) {
        const md5Map = new Map();
        for (const pkg of packages) {
            for (const item of pkg.items) {
                if (item.type !== "image" || !item.md5)
                    continue;
                let group = md5Map.get(item.md5);
                if (!group) {
                    group = [];
                    md5Map.set(item.md5, group);
                }
                group.push(item);
            }
        }
        for (const group of md5Map.values()) {
            if (group.length < 2)
                continue;
            if (scopePkgId && !group.some(x => x.pkgId === scopePkgId))
                continue;
            const primary = (scopePkgId ? group.find(x => x.pkgId === scopePkgId) : null) || group[0];
            const names = group.map(x => `${x.pkgName}${x.path}${x.name}`).join(" | ");
            issues.push({
                kind: "duplicateImage",
                severity: "info",
                title: `重复图片（${group.length} 份）：${primary.name}`,
                detail: names,
                pkgName: primary.pkgName,
                resName: primary.name,
                url: primary.url,
                filePath: primary.filePath
            });
        }
    }
    issues.sort((a, b) => { var _a, _b; return ((_a = SEVERITY_ORDER[a.severity]) !== null && _a !== void 0 ? _a : 9) - ((_b = SEVERITY_ORDER[b.severity]) !== null && _b !== void 0 ? _b : 9); });
    return issues;
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
function resolveItemFilePath(pi) {
    const direct = safeStr(() => pi.file);
    if (direct && (0, Api_1.fileExists)(direct))
        return direct;
    try {
        const base = safeStr(() => pi.owner.basePath).replace(/[\\/]+$/, "");
        const relPath = safeStr(() => pi.path) || "/";
        const fileName = safeStr(() => pi.fileName) || safeStr(() => pi.name);
        if (base && fileName) {
            const joined = `${base}/assets${relPath.charAt(0) === "/" ? relPath : "/" + relPath}${fileName}`;
            return joined.replace(/\/+/g, "/");
        }
    }
    catch (e) { }
    return direct;
}
function readItemText(pi) {
    const fp = resolveItemFilePath(pi);
    let text = fp ? (0, Api_1.readTextFile)(fp) : null;
    if (!text) {
        try {
            const asset = pi.GetAsset();
            if (asset && asset.xml)
                text = asset.xml.ToString();
        }
        catch (e) { }
    }
    return text || "";
}
function locateResource(issue) {
    try {
        if (issue.url && Api_1.App.project && Api_1.App.libView) {
            const pi = Api_1.App.project.GetItemByURL(issue.url);
            if (pi) {
                Api_1.App.libView.Highlight(pi, true);
                return;
            }
        }
    }
    catch (e) { }
    if (issue.filePath && (0, Api_1.fileExists)(issue.filePath)) {
        if ((0, Api_1.revealInExplorer)(issue.filePath))
            return;
    }
    (0, UiKit_1.toast)("无法定位该资源");
}
class ResourceAuditControllerClass {
    constructor() {
        this.scanning = false;
        this.progress = null;
        this.lastIssues = null;
        this.lastScopeLabel = "";
        this.listeners = [];
    }
    onChanged(cb) {
        this.listeners.push(cb);
    }
    notify() {
        for (const cb of this.listeners) {
            try {
                cb();
            }
            catch (e) { }
        }
    }
    scanCurrentPackage() {
        const pkgName = (0, EditorService_1.getCurrentPackageName)();
        if (!pkgName) {
            (0, UiKit_1.toast)("没有打开的组件，无法确定当前 Package");
            return;
        }
        const pkg = (0, ScanService_1.getPackageByName)(pkgName);
        if (!pkg) {
            (0, UiKit_1.toast)("未找到 Package: " + pkgName);
            return;
        }
        this.runAudit(safeStr(() => pkg.id), `Package「${pkgName}」`);
    }
    scanWholeProject() {
        this.runAudit("", "整个项目");
    }
    runAudit(scopePkgId, scopeLabel) {
        if (this.scanning) {
            (0, UiKit_1.toast)("资源体检正在进行中，请稍候");
            return;
        }
        const pkgs = (0, ScanService_1.getAllPackages)();
        if (pkgs.length === 0) {
            this.lastScopeLabel = scopeLabel;
            this.lastIssues = [];
            this.notify();
            (0, UiKit_1.toast)("项目中没有 Package");
            return;
        }
        const rcCfg = Config_1.Config.config.resourceCheck || { maxImageKB: 512, checkDuplicate: true };
        const auditPkgs = [];
        const textItems = [];
        const imageEntries = [];
        for (const pkg of pkgs) {
            const pkgId = safeStr(() => pkg.id);
            const pkgName = safeStr(() => pkg.name);
            const ap = { id: pkgId, name: pkgName, items: [] };
            const rawItems = (0, Api_1.toArray)(pkg.items);
            for (const pi of rawItems) {
                try {
                    if (!pi || pi.isDisposed)
                        continue;
                    if (safeStr(() => pi.branch))
                        continue;
                    const type = safeStr(() => pi.type).toLowerCase();
                    if (!type || type === "folder" || type === "atlas")
                        continue;
                    const id = safeStr(() => pi.id);
                    const name = safeStr(() => pi.name);
                    const path = safeStr(() => pi.path) || "/";
                    const filePath = resolveItemFilePath(pi);
                    const url = safeStr(() => pi.GetURL()) || (pkgId && id ? `ui://${pkgId}${id}` : "");
                    const item = {
                        pkgId: pkgId,
                        pkgName: pkgName,
                        id: id,
                        type: type,
                        name: name,
                        path: path,
                        exported: !!pi.exported,
                        filePath: filePath,
                        url: url
                    };
                    if (type === "image") {
                        imageEntries.push({ item: item, filePath: filePath });
                        const ch = safeStr(() => pi.contentHash);
                        if (ch)
                            item.md5 = ch;
                    }
                    else if (type === "component" || type === "font") {
                        textItems.push({ pkgId: pkgId, pkgName: pkgName, pi: pi, type: type });
                    }
                    ap.items.push(item);
                }
                catch (e) { }
            }
            auditPkgs.push(ap);
        }
        const totalSteps = textItems.length + imageEntries.length;
        if (totalSteps === 0) {
            this.lastScopeLabel = scopeLabel;
            this.lastIssues = auditResources(auditPkgs, [], {
                scopePkgId: scopePkgId,
                maxImageKB: rcCfg.maxImageKB,
                checkDuplicate: rcCfg.checkDuplicate
            });
            this.notify();
            return;
        }
        this.scanning = true;
        this.lastScopeLabel = scopeLabel;
        const allRefs = [];
        let index = 0;
        const self = this;
        const processBatch = (count) => {
            const limit = Math.min(totalSteps, index + count);
            let curName = "";
            while (index < limit) {
                if (index < textItems.length) {
                    const t = textItems[index];
                    curName = `${t.pkgName}/${safeStr(() => t.pi.name)}`;
                    try {
                        const text = readItemText(t.pi);
                        if (text) {
                            if (t.type === "component") {
                                const refs = collectComponentRefs(text, t.pkgId, t.pkgName, safeStr(() => t.pi.name), safeStr(() => t.pi.GetURL()));
                                for (const r of refs)
                                    allRefs.push(r);
                            }
                            else if (t.type === "font") {
                                const refs = collectFontRefs(text, t.pkgId, t.pkgName, safeStr(() => t.pi.name));
                                for (const r of refs)
                                    allRefs.push(r);
                            }
                        }
                    }
                    catch (e) { }
                }
                else {
                    const im = imageEntries[index - textItems.length];
                    curName = `${im.item.pkgName}/${im.item.name}`;
                    try {
                        if (im.filePath) {
                            const sz = (0, Api_1.getFileSize)(im.filePath);
                            if (sz >= 0)
                                im.item.sizeBytes = sz;
                            if (rcCfg.checkDuplicate && !im.item.md5) {
                                im.item.md5 = (0, Api_1.getFileMd5)(im.filePath);
                            }
                        }
                    }
                    catch (e) { }
                }
                index++;
            }
            self.progress = { current: index, total: totalSteps, currentName: curName };
        };
        const finish = () => {
            self.scanning = false;
            self.progress = null;
            try {
                self.lastIssues = auditResources(auditPkgs, allRefs, {
                    scopePkgId: scopePkgId,
                    maxImageKB: rcCfg.maxImageKB,
                    checkDuplicate: rcCfg.checkDuplicate
                });
            }
            catch (e) {
                (0, Api_1.logWarn)("资源体检汇总失败: " + e);
                self.lastIssues = [];
            }
            self.notify();
            const n = self.lastIssues.length;
            (0, UiKit_1.toast)(`${scopeLabel}资源体检完成，共 ${n} 项`);
        };
        const step = () => {
            processBatch(12);
            if (index >= totalSteps) {
                finish();
                return;
            }
            if (index % 24 === 0)
                self.notify();
            let scheduled = false;
            try {
                csharp_1.FairyGUI.Timers.inst.Add(0.03, 1, new csharp_1.FairyGUI.TimerCallback(step));
                scheduled = true;
            }
            catch (e) { }
            if (!scheduled) {
                while (index < totalSteps)
                    processBatch(50);
                finish();
            }
        };
        this.notify();
        step();
    }
}
exports.ResourceAuditController = new ResourceAuditControllerClass();
