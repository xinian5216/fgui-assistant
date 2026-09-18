"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextPivotRule = void 0;
const Types_1 = require("../core/Types");
class TextPivotRule {
    constructor() {
        this.id = "textPivot";
        this.name = "文字轴心";
        this.description = "文字对象轴心一般应居中（0.5, 0.5 并作为锚点）";
        this.safeFix = true;
    }
    check(ctx) {
        const issues = [];
        for (const obj of ctx.model.objects) {
            if (obj.objectType != "text" && obj.objectType != "richtext" && obj.objectType != "inputtext")
                continue;
            const ok = Math.abs(obj.pivotX - 0.5) < 0.001 && Math.abs(obj.pivotY - 0.5) < 0.001 && obj.anchor;
            if (ok)
                continue;
            issues.push({
                ruleId: this.id,
                severity: "warning",
                title: `${obj.name}：字体轴心不是中心`,
                detail: `当前：pivot=(${obj.pivotX}, ${obj.pivotY}) anchor=${obj.anchor}\n标准：(0.5, 0.5) 且作为锚点`,
                objectName: obj.name,
                objectPath: obj.path,
                docUrl: ctx.model.docUrl,
                targetId: obj.id,
                fixable: ctx.isLive,
                fixLabel: "设为中心",
                fixType: "textPivot",
                ignoreKey: (0, Types_1.makeIssueKey)(this.id, ctx.model.docUrl, obj.id, obj.name)
            });
        }
        return issues;
    }
}
exports.TextPivotRule = TextPivotRule;
