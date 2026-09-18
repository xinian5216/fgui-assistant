import { FairyEditor } from 'csharp';
import { App } from '../Api';
import { Rule, RuleContext, Issue, makeIssueKey } from '../core/Types';

export class ScreenAdaptRule implements Rule {
    id = "screenAdapt";
    name = "屏幕适配";
    description = "页面级 Main 组件需要开启全屏与标准屏幕适配";
    safeFix = false;

    check(ctx: RuleContext): Issue[] {
        const issues: Issue[] = [];
        const cfg = ctx.config.screenAdapt || {};
        const mainNames: string[] = cfg.mainComponentNames || ["Main"];
        if (mainNames.indexOf(ctx.model.componentName) < 0) return issues;
        const key = makeIssueKey(this.id, ctx.model.docUrl, "", ctx.model.componentName);
        let settings: any = null;
        const keys = ["Adaptation", "adaptation", "ScreenAdaptation"];
        for (const k of keys) {
            try {
                settings = App.project.GetSettings(k);
            } catch (e) { }
            if (settings) break;
        }
        if (!settings) {
            issues.push({
                ruleId: this.id,
                severity: "info",
                title: `${ctx.model.componentName}：请人工确认屏幕适配设置`,
                detail: "无法通过插件 API 读取项目屏幕适配设置。\n请人工确认：项目设置 → 屏幕适配（全屏、设计分辨率、缩放模式）已正确配置。",
                objectName: ctx.model.componentName,
                docUrl: ctx.model.docUrl,
                fixable: false,
                ignoreKey: key + "|unreadable"
            });
            return issues;
        }
        let scaleMode = "";
        let designX = 0, designY = 0;
        try { const v = settings.scaleMode; if (v !== undefined && v !== null) scaleMode = "" + v; } catch (e) { }
        try { const v = Number(settings.designResolutionX); if (!isNaN(v)) designX = v; } catch (e) { }
        try { const v = Number(settings.designResolutionY); if (!isNaN(v)) designY = v; } catch (e) { }
        if (!scaleMode) {
            issues.push({
                ruleId: this.id,
                severity: "error",
                title: `${ctx.model.componentName}：未检测到标准屏幕适配配置`,
                detail: `项目屏幕适配缩放模式为空。\n设计分辨率：${designX} x ${designY}\n请到 项目设置 → 屏幕适配 中检查。`,
                objectName: ctx.model.componentName,
                docUrl: ctx.model.docUrl,
                fixable: false,
                fixLabel: "定位设置",
                ignoreKey: key + "|scalemode"
            });
        }
        return issues;
    }
}
