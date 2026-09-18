import { FairyGUI, FairyEditor } from 'csharp';
import { ScanResult, Engine, mergeScanResults } from '../core/RuleEngine';
import { scanCurrentDoc, scanPackageItemXml, getPackageComponents, getAllPackages, getPackageByName, ScanProgress } from './ScanService';
import { getCurrentPackageName } from './EditorService';
import { alert, logWarn } from '../Api';
import { toast } from '../ui/UiKit';

export type ScanScope = "component" | "package" | "project";

interface ScanUnitResult {
    name: string;
    results: ScanResult[] | null;
}

class ScanControllerClass {
    lastResult: ScanResult = null;
    lastScope: ScanScope = "component";
    scanning: boolean = false;
    progress: ScanProgress = null;
    private listeners: (() => void)[] = [];

    onChanged(cb: () => void): void {
        this.listeners.push(cb);
    }

    notify(): void {
        for (const cb of this.listeners) {
            try { cb(); } catch (e) { }
        }
    }

    scanCurrentComponent(): ScanResult {
        const model = scanCurrentDoc();
        if (!model) {
            this.lastResult = null;
            this.notify();
            return null;
        }
        this.lastScope = "component";
        this.lastResult = Engine.runScan(model);
        this.notify();
        return this.lastResult;
    }

    scanCurrentPackage(): void {
        const pkgName = getCurrentPackageName();
        if (!pkgName) {
            alert("没有打开的组件，无法确定当前 Package");
            return;
        }
        this.scanPackageByName(pkgName);
    }

    scanPackageByName(pkgName: string): void {
        const pkg = getPackageByName(pkgName);
        if (!pkg) {
            alert("未找到 Package: " + pkgName);
            return;
        }
        const components = getPackageComponents(pkg);
        if (components.length == 0) {
            this.lastScope = "package";
            this.lastResult = mergeScanResults([], `（整个 Package: ${pkgName}）`, pkgName);
            this.notify();
            toast(`Package「${pkgName}」中没有可检查的组件`);
            return;
        }
        toast(`开始扫描 Package「${pkgName}」（${components.length} 个组件）…`);
        this.driveScan("package", components.length, (i) => scanUnit(components[i], pkgName), (results) => {
            this.lastResult = mergeScanResults(results, `（整个 Package: ${pkgName}）`, pkgName);
            toast(`Package 扫描完成  ✕ ${this.lastResult.errorCount}  ⚠ ${this.lastResult.warningCount}  ⓘ ${this.lastResult.infoCount}`);
        });
    }

    scanWholeProject(): void {
        let pkgs: FairyEditor.FPackage[] = [];
        try { pkgs = getAllPackages(); } catch (e) { }
        if (pkgs.length == 0) {
            alert("项目中没有 Package");
            return;
        }
        const units: { pkgName: string; pi: FairyEditor.FPackageItem }[] = [];
        for (const pkg of pkgs) {
            const pkgName = safeStr(() => pkg.name);
            for (const pi of getPackageComponents(pkg)) {
                units.push({ pkgName: pkgName, pi: pi });
            }
        }
        if (units.length == 0) {
            this.lastScope = "project";
            this.lastResult = mergeScanResults([], "（整个项目）", "");
            this.notify();
            toast("项目中没有可检查的组件");
            return;
        }
        toast(`开始扫描整个项目（${pkgs.length} 个 Package，${units.length} 个组件）…`);
        this.driveScan("project", units.length, (i) => {
            const u = units[i];
            return scanUnit(u.pi, u.pkgName);
        }, (results) => {
            this.lastResult = mergeScanResults(results, "（整个项目）", "");
            toast(`项目扫描完成  ✕ ${this.lastResult.errorCount}  ⚠ ${this.lastResult.warningCount}  ⓘ ${this.lastResult.infoCount}`);
        });
    }

    private driveScan(scope: ScanScope, total: number,
        process: (index: number) => ScanUnitResult,
        onDone: (results: ScanResult[]) => void): void {
        if (this.scanning) {
            alert("正在扫描中，请稍候");
            return;
        }
        this.scanning = true;
        this.lastScope = scope;
        const results: ScanResult[] = [];
        const self = this;
        let index = 0;
        const processOne = () => {
            let name = "";
            try {
                const r = process(index);
                if (r) {
                    name = r.name;
                    if (r.results) {
                        for (const x of r.results) results.push(x);
                    }
                }
            } catch (e) {
                logWarn("扫描单元异常: " + e);
            }
            self.progress = { current: index + 1, total: total, currentName: name };
            index++;
            if (index % 10 == 0 || index >= total) self.notify();
        };
        const finish = () => {
            self.scanning = false;
            self.progress = null;
            onDone(results);
            self.notify();
        };
        const step = () => {
            processOne();
            if (index >= total) {
                finish();
                return;
            }
            let scheduled = false;
            try {
                FairyGUI.Timers.inst.Add(0.03, 1, new FairyGUI.TimerCallback(step));
                scheduled = true;
            } catch (e) { }
            if (!scheduled) {
                while (index < total) processOne();
                finish();
            }
        };
        step();
    }
}

function scanUnit(pi: FairyEditor.FPackageItem, pkgName: string): ScanUnitResult {
    const name = safeStr(() => pi.name);
    try {
        const model = scanPackageItemXml(pi);
        if (model) {
            return { name: pkgName ? pkgName + "/" + name : name, results: [Engine.runScan(model)] };
        }
    } catch (e) { }
    return { name: name, results: null };
}

function safeStr(fn: () => any): string {
    try { const v = fn(); return v === null || v === undefined ? "" : "" + v; } catch (e) { return ""; }
}

export const ScanController = new ScanControllerClass();
