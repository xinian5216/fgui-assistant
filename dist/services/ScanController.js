"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScanController = void 0;
const csharp_1 = require("csharp");
const RuleEngine_1 = require("../core/RuleEngine");
const ScanService_1 = require("./ScanService");
const EditorService_1 = require("./EditorService");
const Api_1 = require("../Api");
const UiKit_1 = require("../ui/UiKit");
class ScanControllerClass {
    constructor() {
        this.lastResult = null;
        this.lastScope = "component";
        this.scanning = false;
        this.progress = null;
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
    scanCurrentComponent() {
        const model = (0, ScanService_1.scanCurrentDoc)();
        if (!model) {
            this.lastResult = null;
            this.notify();
            return null;
        }
        this.lastScope = "component";
        this.lastResult = RuleEngine_1.Engine.runScan(model);
        this.notify();
        return this.lastResult;
    }
    scanCurrentPackage() {
        const pkgName = (0, EditorService_1.getCurrentPackageName)();
        if (!pkgName) {
            (0, Api_1.alert)("没有打开的组件，无法确定当前 Package");
            return;
        }
        this.scanPackageByName(pkgName);
    }
    scanPackageByName(pkgName) {
        const pkg = (0, ScanService_1.getPackageByName)(pkgName);
        if (!pkg) {
            (0, Api_1.alert)("未找到 Package: " + pkgName);
            return;
        }
        const components = (0, ScanService_1.getPackageComponents)(pkg);
        if (components.length == 0) {
            this.lastScope = "package";
            this.lastResult = (0, RuleEngine_1.mergeScanResults)([], `（整个 Package: ${pkgName}）`, pkgName);
            this.notify();
            (0, UiKit_1.toast)(`Package「${pkgName}」中没有可检查的组件`);
            return;
        }
        (0, UiKit_1.toast)(`开始扫描 Package「${pkgName}」（${components.length} 个组件）…`);
        this.driveScan("package", components.length, (i) => scanUnit(components[i], pkgName), (results) => {
            this.lastResult = (0, RuleEngine_1.mergeScanResults)(results, `（整个 Package: ${pkgName}）`, pkgName);
            (0, UiKit_1.toast)(`Package 扫描完成  ✕ ${this.lastResult.errorCount}  ⚠ ${this.lastResult.warningCount}  ⓘ ${this.lastResult.infoCount}`);
        });
    }
    scanWholeProject() {
        let pkgs = [];
        try {
            pkgs = (0, ScanService_1.getAllPackages)();
        }
        catch (e) { }
        if (pkgs.length == 0) {
            (0, Api_1.alert)("项目中没有 Package");
            return;
        }
        const units = [];
        for (const pkg of pkgs) {
            const pkgName = safeStr(() => pkg.name);
            for (const pi of (0, ScanService_1.getPackageComponents)(pkg)) {
                units.push({ pkgName: pkgName, pi: pi });
            }
        }
        if (units.length == 0) {
            this.lastScope = "project";
            this.lastResult = (0, RuleEngine_1.mergeScanResults)([], "（整个项目）", "");
            this.notify();
            (0, UiKit_1.toast)("项目中没有可检查的组件");
            return;
        }
        (0, UiKit_1.toast)(`开始扫描整个项目（${pkgs.length} 个 Package，${units.length} 个组件）…`);
        this.driveScan("project", units.length, (i) => {
            const u = units[i];
            return scanUnit(u.pi, u.pkgName);
        }, (results) => {
            this.lastResult = (0, RuleEngine_1.mergeScanResults)(results, "（整个项目）", "");
            (0, UiKit_1.toast)(`项目扫描完成  ✕ ${this.lastResult.errorCount}  ⚠ ${this.lastResult.warningCount}  ⓘ ${this.lastResult.infoCount}`);
        });
    }
    driveScan(scope, total, process, onDone) {
        if (this.scanning) {
            (0, Api_1.alert)("正在扫描中，请稍候");
            return;
        }
        this.scanning = true;
        this.lastScope = scope;
        const results = [];
        const self = this;
        let index = 0;
        const processOne = () => {
            let name = "";
            try {
                const r = process(index);
                if (r) {
                    name = r.name;
                    if (r.results) {
                        for (const x of r.results)
                            results.push(x);
                    }
                }
            }
            catch (e) {
                (0, Api_1.logWarn)("扫描单元异常: " + e);
            }
            self.progress = { current: index + 1, total: total, currentName: name };
            index++;
            if (index % 10 == 0 || index >= total)
                self.notify();
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
                csharp_1.FairyGUI.Timers.inst.Add(0.03, 1, new csharp_1.FairyGUI.TimerCallback(step));
                scheduled = true;
            }
            catch (e) { }
            if (!scheduled) {
                while (index < total)
                    processOne();
                finish();
            }
        };
        step();
    }
}
function scanUnit(pi, pkgName) {
    const name = safeStr(() => pi.name);
    try {
        const model = (0, ScanService_1.scanPackageItemXml)(pi);
        if (model) {
            return { name: pkgName ? pkgName + "/" + name : name, results: [RuleEngine_1.Engine.runScan(model)] };
        }
    }
    catch (e) { }
    return { name: name, results: null };
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
exports.ScanController = new ScanControllerClass();
