"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstalledFontFamilies = getInstalledFontFamilies;
exports.refreshFontCache = refreshFontCache;
exports.getProjectFontNames = getProjectFontNames;
exports.fontExists = fontExists;
const csharp_1 = require("csharp");
const Api_1 = require("../Api");
const ScanService_1 = require("./ScanService");
let cachedFamilies = null;
function getInstalledFontFamilies() {
    if (cachedFamilies)
        return cachedFamilies;
    const ret = [];
    try {
        const list = csharp_1.FairyEditor.FontUtil.GetOSInstalledFontNames(false);
        const arr = (0, Api_1.toArray)(list);
        for (const f of arr) {
            try {
                if (f.family)
                    ret.push(("" + f.family).toLowerCase());
                if (f.localeFamily)
                    ret.push(("" + f.localeFamily).toLowerCase());
            }
            catch (e) { }
        }
    }
    catch (e) { }
    cachedFamilies = ret;
    return ret;
}
function refreshFontCache() {
    cachedFamilies = null;
    try {
        csharp_1.FairyEditor.FontUtil.GetOSInstalledFontNames(true);
    }
    catch (e) { }
}
function getProjectFontNames() {
    const ret = [];
    const pkgs = (0, ScanService_1.getAllPackages)();
    for (const pkg of pkgs) {
        try {
            const items = (0, Api_1.toArray)(pkg.items);
            for (const pi of items) {
                try {
                    if (pi.type == "font")
                        ret.push(("" + pi.name).toLowerCase());
                }
                catch (e) { }
            }
        }
        catch (e) { }
    }
    return ret;
}
function fontExists(fontName) {
    if (!fontName)
        return false;
    const lower = fontName.toLowerCase();
    if (getInstalledFontFamilies().indexOf(lower) >= 0)
        return true;
    if (getProjectFontNames().indexOf(lower) >= 0)
        return true;
    return false;
}
