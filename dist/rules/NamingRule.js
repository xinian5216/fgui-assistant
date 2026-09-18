"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NamingRule = void 0;
exports.getNamingType = getNamingType;
const Types_1 = require("../core/Types");
function getNamingType(obj) {
    if (obj.extType == "Button")
        return "Button";
    if (obj.objectType == "list")
        return "List";
    if (obj.objectType == "text" || obj.objectType == "richtext" || obj.objectType == "inputtext")
        return "Text";
    if (obj.objectType == "image")
        return "Image";
    if (obj.objectType == "loader" || obj.objectType == "loader3D")
        return "Loader";
    if (obj.objectType == "component")
        return "Component";
    if (obj.objectType == "movieclip")
        return "MovieClip";
    if (obj.objectType == "graph")
        return "Graph";
    if (obj.objectType == "group")
        return "Group";
    return "";
}
class NamingRule {
    constructor() {
        this.id = "naming";
        this.name = "命名规范";
        this.description = "对象名称必须使用类型对应的前缀（如 Btn_、Txt_）";
        this.safeFix = true;
    }
    check(ctx) {
        const issues = [];
        const rules = ctx.config.namingRules || {};
        for (const obj of ctx.model.objects) {
            const type = getNamingType(obj);
            if (!type)
                continue;
            const prefix = rules[type];
            if (!prefix)
                continue;
            if (!obj.name)
                continue;
            if (obj.name.indexOf(prefix) == 0)
                continue;
            issues.push({
                ruleId: this.id,
                severity: "warning",
                title: `${obj.name}：${type} 命名缺少前缀 ${prefix}`,
                detail: `当前：${obj.name}\n建议：${prefix}xxx`,
                objectName: obj.name,
                objectPath: obj.path,
                docUrl: ctx.model.docUrl,
                targetId: obj.id,
                fixable: ctx.isLive,
                fixLabel: `改为 ${prefix}${obj.name}`,
                fixType: "naming",
                fixData: { prefix: prefix },
                ignoreKey: (0, Types_1.makeIssueKey)(this.id, ctx.model.docUrl, obj.id, obj.name)
            });
        }
        const ctrlPrefix = rules["Controller"];
        if (ctrlPrefix) {
            for (const c of ctx.model.controllers) {
                if (!c.name)
                    continue;
                if (c.name.indexOf(ctrlPrefix) == 0)
                    continue;
                issues.push({
                    ruleId: this.id,
                    severity: "info",
                    title: `控制器 ${c.name}：命名缺少前缀 ${ctrlPrefix}`,
                    detail: `当前：${c.name}\n建议：${ctrlPrefix}xxx\n（控制器请在 FairyGUI 中手动重命名）`,
                    objectName: c.name,
                    docUrl: ctx.model.docUrl,
                    fixable: false,
                    ignoreKey: (0, Types_1.makeIssueKey)(this.id, ctx.model.docUrl, "ctrl:" + c.name, c.name)
                });
            }
        }
        return issues;
    }
}
exports.NamingRule = NamingRule;
