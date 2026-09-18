"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LayoutPresetRule = void 0;
const Types_1 = require("../core/Types");
function near(a, b) {
    return Math.abs(a - b) < 0.51;
}
class LayoutPresetRule {
    constructor() {
        this.id = "layoutPreset";
        this.name = "固定位置模板";
        this.description = "固定按钮（返回/主页/关闭等）应使用标准位置模板";
        this.safeFix = true;
    }
    check(ctx) {
        const issues = [];
        const presets = ctx.config.layoutPresets || [];
        if (presets.length == 0)
            return issues;
        for (const obj of ctx.model.objects) {
            for (const preset of presets) {
                if (!preset.name)
                    continue;
                if (obj.name.toLowerCase().indexOf(preset.name.toLowerCase()) < 0)
                    continue;
                const posOk = near(obj.x, preset.x) && near(obj.y, preset.y);
                if (posOk)
                    continue;
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
                    ignoreKey: (0, Types_1.makeIssueKey)(this.id, ctx.model.docUrl, obj.id, obj.name + "|" + preset.name)
                });
            }
        }
        return issues;
    }
}
exports.LayoutPresetRule = LayoutPresetRule;
