"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Engine = exports.RuleEngine = void 0;
exports.mergeScanResults = mergeScanResults;
const rules_1 = require("../rules");
const Store_1 = require("./Store");
const Config_1 = require("./Config");
class RuleEngine {
    constructor() {
        this.rules = [];
        this.rules = (0, rules_1.getAllRules)();
    }
    runOnModel(model, includeIgnored) {
        const issues = [];
        if (!model)
            return issues;
        for (const rule of this.rules) {
            try {
                const found = rule.check({ model: model, config: Config_1.Config.config, isLive: model.isLive });
                for (const issue of found) {
                    if (!includeIgnored && Store_1.Store.isIgnored(issue.ignoreKey))
                        continue;
                    issues.push(issue);
                }
            }
            catch (e) {
                console.warn("[FGUI助手] 规则执行异常 " + rule.id + ": " + e);
            }
        }
        return issues;
    }
    runScan(model) {
        const issues = this.runOnModel(model);
        return {
            model: model,
            issues: issues,
            passCount: 0,
            errorCount: issues.filter(i => i.severity == "error").length,
            warningCount: issues.filter(i => i.severity == "warning").length,
            infoCount: issues.filter(i => i.severity == "info").length,
            scanTime: new Date().toISOString()
        };
    }
}
exports.RuleEngine = RuleEngine;
exports.Engine = new RuleEngine();
function mergeScanResults(results, label, pkgName) {
    const allIssues = [];
    for (const r of results) {
        if (!r)
            continue;
        for (const i of r.issues)
            allIssues.push(i);
    }
    const model = {
        docUrl: "",
        componentName: label,
        packageName: pkgName,
        packageId: "",
        isLive: false,
        objects: [],
        controllers: []
    };
    return {
        model: model,
        issues: allIssues,
        passCount: 0,
        errorCount: allIssues.filter(i => i.severity == "error").length,
        warningCount: allIssues.filter(i => i.severity == "warning").length,
        infoCount: allIssues.filter(i => i.severity == "info").length,
        scanTime: new Date().toISOString()
    };
}
