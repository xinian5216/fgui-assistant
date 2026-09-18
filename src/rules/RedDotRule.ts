import { Rule, RuleContext, Issue, makeIssueKey, ControllerInfo } from '../core/Types';

function matchPattern(name: string, pattern: string): boolean {
    if (!pattern) return false;
    return (name || "").toLowerCase().indexOf(pattern.toLowerCase()) >= 0;
}

export class RedDotRule implements Rule {
    id = "redDot";
    name = "红点控制器";
    description = "红点 Controller 应包含 0/1 两个页面，且默认页面为 0";
    safeFix = false;

    check(ctx: RuleContext): Issue[] {
        const issues: Issue[] = [];
        const cfg = ctx.config.redDot || {};
        const pattern = cfg.controllerNamePattern || "HongDian";
        const pageOff = cfg.pageOff || "0";
        const pageOn = cfg.pageOn || "1";
        for (const ctrl of ctx.model.controllers) {
            if (!matchPattern(ctrl.name, pattern)) continue;
            const key = makeIssueKey(this.id, ctx.model.docUrl, "ctrl:" + ctrl.name, ctrl.name);
            const hasOff = ctrl.pages.some(p => p.name == pageOff || p.id == pageOff);
            const hasOn = ctrl.pages.some(p => p.name == pageOn || p.id == pageOn);
            if (!hasOff || !hasOn) {
                issues.push({
                    ruleId: this.id,
                    severity: "warning",
                    title: `${ctrl.name}：红点控制器缺少 ${pageOff}/${pageOn} 页面`,
                    detail: `当前页面：${ctrl.pages.map(p => p.name || p.id).join(", ") || "(无)"}\n要求：包含 ${pageOff}（无红点）和 ${pageOn}（有红点）`,
                    objectName: ctrl.name,
                    docUrl: ctx.model.docUrl,
                    fixable: false,
                    ignoreKey: key + "|pages"
                });
                continue;
            }
            const offPage = ctrl.pages.find(p => p.name == pageOff || p.id == pageOff);
            const defaultOk = this.checkDefaultPage(ctrl, offPage);
            if (!defaultOk) {
                issues.push({
                    ruleId: this.id,
                    severity: "warning",
                    title: `${ctrl.name}：红点默认状态不是 ${pageOff}`,
                    detail: `要求默认页面为 ${pageOff}（无红点）\n请在 FairyGUI 中检查控制器首页/初始页设置`,
                    objectName: ctrl.name,
                    docUrl: ctx.model.docUrl,
                    fixable: false,
                    ignoreKey: key + "|default"
                });
            }
        }
        return issues;
    }

    private checkDefaultPage(ctrl: ControllerInfo, offPage: { id: string; name: string }): boolean {
        if (ctrl.pages.length == 0) return false;
        if (ctrl.homePage) {
            return ctrl.homePage == offPage.id || ctrl.homePage == offPage.name;
        }
        const first = ctrl.pages[0];
        return first == offPage || first.id == offPage.id;
    }
}
