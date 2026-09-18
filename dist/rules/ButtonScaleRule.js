"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ButtonScaleRule = void 0;
const Types_1 = require("../core/Types");
class ButtonScaleRule {
    constructor() {
        this.id = "buttonScale";
        this.name = "按钮缩放";
        this.description = "按钮按下缩放效果应为标准值（默认 0.98）";
        this.safeFix = true;
    }
    check(ctx) {
        const issues = [];
        const standard = Number(ctx.config.buttonScale) || 0.98;
        const requireEffect = ctx.config.requireButtonDownEffect !== false;
        for (const obj of ctx.model.objects) {
            if (obj.extType != "Button")
                continue;
            const effect = (obj.downEffect || "").toLowerCase();
            const value = obj.downEffectValue;
            const effectOk = effect == "scale";
            const valueOk = value !== undefined && Math.abs(value - standard) < 0.001;
            if (effectOk && valueOk)
                continue;
            if (!requireEffect && effectOk == false && effect == "")
                continue;
            let detail;
            if (!effectOk) {
                detail = `当前：未启用缩放效果（${obj.downEffect || "无"}）\n标准：缩放 ${standard}`;
            }
            else {
                detail = `当前：${value}\n标准：${standard}`;
            }
            issues.push({
                ruleId: this.id,
                severity: "warning",
                title: `${obj.name}：按钮缩放不是标准值`,
                detail: detail,
                objectName: obj.name,
                objectPath: obj.path,
                docUrl: ctx.model.docUrl,
                targetId: obj.id,
                fixable: ctx.isLive,
                fixLabel: `修复为缩放 ${standard}`,
                fixType: "buttonScale",
                fixData: { scale: standard },
                ignoreKey: (0, Types_1.makeIssueKey)(this.id, ctx.model.docUrl, obj.id, obj.name)
            });
        }
        return issues;
    }
}
exports.ButtonScaleRule = ButtonScaleRule;
