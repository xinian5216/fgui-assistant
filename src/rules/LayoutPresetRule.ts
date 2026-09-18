import { Rule, RuleContext, Issue, makeIssueKey } from '../core/Types';
import { LayoutPreset } from '../core/Config';

function near(a: number, b: number): boolean {
    return Math.abs(a - b) < 0.51;
}

export class LayoutPresetRule implements Rule {
    id = "layoutPreset";
    name = "固定位置模板";
    description = "固定按钮（返回/主页/关闭等）应使用标准位置模板";
    safeFix = true;

    check(ctx: RuleContext): Issue[] {
        const issues: Issue[] = [];
        const presets: LayoutPreset[] = ctx.config.layoutPresets || [];
        if (presets.length == 0) return issues;
        for (const obj of ctx.model.objects) {
            for (const preset of presets) {
                if (!preset.name) continue;
                if (obj.name.toLowerCase().indexOf(preset.name.toLowerCase()) < 0) continue;
                const posOk = near(obj.x, preset.x) && near(obj.y, preset.y);
                if (posOk) continue;
                issues.push({
                    ruleId: this.id,
                    severity: "info",
                    title: `${obj.name}：位置与模板「${preset.name}」不一致`,
                    detail: `当前：X=${obj.x} Y=${obj.y}\n标准：X=${preset.x} Y=${preset.y}`,
                    objectName: obj.name,
                    objectPath: obj.path,
                    docUrl: ctx.model.docUrl,
                    targetId: obj.id,
                    fixable: ctx.isLive,
                    fixLabel: "应用标准位置",
                    fixType: "layoutPreset",
                    fixData: preset,
                    ignoreKey: makeIssueKey(this.id, ctx.model.docUrl, obj.id, obj.name + "|" + preset.name)
                });
            }
        }
        return issues;
    }
}
