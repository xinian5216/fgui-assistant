import { FairyEditor } from 'csharp';
import { toArray } from '../Api';
import { getAllPackages } from './ScanService';

let cachedFamilies: string[] = null;

export function getInstalledFontFamilies(): string[] {
    if (cachedFamilies) return cachedFamilies;
    const ret: string[] = [];
    try {
        const list = FairyEditor.FontUtil.GetOSInstalledFontNames(false);
        const arr = toArray<FairyEditor.FontUtil.FontInfo>(list);
        for (const f of arr) {
            try {
                if (f.family) ret.push(("" + f.family).toLowerCase());
                if (f.localeFamily) ret.push(("" + f.localeFamily).toLowerCase());
            } catch (e) { }
        }
    } catch (e) { }
    cachedFamilies = ret;
    return ret;
}

export function refreshFontCache(): void {
    cachedFamilies = null;
    try { FairyEditor.FontUtil.GetOSInstalledFontNames(true); } catch (e) { }
}

export function getProjectFontNames(): string[] {
    const ret: string[] = [];
    const pkgs = getAllPackages();
    for (const pkg of pkgs) {
        try {
            const items = toArray<FairyEditor.FPackageItem>(pkg.items);
            for (const pi of items) {
                try {
                    if (pi.type == "font") ret.push(("" + pi.name).toLowerCase());
                } catch (e) { }
            }
        } catch (e) { }
    }
    return ret;
}

export function fontExists(fontName: string): boolean {
    if (!fontName) return false;
    const lower = fontName.toLowerCase();
    if (getInstalledFontFamilies().indexOf(lower) >= 0) return true;
    if (getProjectFontNames().indexOf(lower) >= 0) return true;
    return false;
}
