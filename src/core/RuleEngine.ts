import { DocModel, Issue, Rule, Severity } from './Types';
import { getAllRules } from '../rules';
import { Store } from './Store';
import { Config } from './Config';

export interface ScanResult {
    model: DocModel;
    issues: Issue[];
    passCount: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    scanTime: string;
}

export class RuleEngine {
    private rules: Rule[] = [];

    constructor() {
        this.rules = getAllRules();
    }

    runOnModel(model: DocModel, includeIgnored?: boolean): Issue[] {
        const issues: Issue[] = [];
        if (!model) return issues;
        for (const rule of this.rules) {
            try {
                const found = rule.check({ model: model, config: Config.config, isLive: model.isLive });
                for (const issue of found) {
                    if (!includeIgnored && Store.isIgnored(issue.ignoreKey)) continue;
                    issues.push(issue);
                }
            } catch (e) {
                console.warn("[FGUI助手] 规则执行异常 " + rule.id + ": " + e);
            }
        }
        return issues;
    }

    runScan(model: DocModel): ScanResult {
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

export const Engine = new RuleEngine();

export function mergeScanResults(results: ScanResult[], label: string, pkgName: string): ScanResult {
    const allIssues: Issue[] = [];
    for (const r of results) {
        if (!r) continue;
        for (const i of r.issues) allIssues.push(i);
    }
    const model: DocModel = {
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
