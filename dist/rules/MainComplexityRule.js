"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MainComplexityRule = void 0;
const Types_1 = require("../core/Types");
const Api_1 = require("../Api");
class MainComplexityRule {
    constructor() {
        this.id = "mainComplexity";
        this.name = "Main 简化建议";
        this.description = "结构较简单的子组件可考虑直接放入 Main（软规范，仅供参考）";
        this.safeFix = false;
    }
    check(ctx) {
        const issues = [];
        const cfg = ctx.config.mainComplexity || {};
        if (cfg.enabled === false)
            return issues;
        if (!ctx.isLive)
            return issues;
        const maxDepth = cfg.maxDepth || 3;
        const smallCount = cfg.smallComponentChildCount || 2;
        let deepest = 0;
        for (const obj of ctx.model.objects) {
            if (obj.depth > deepest)
                deepest = obj.depth;
        }
        if (deepest > maxDepth) {
            issues.push({
                ruleId: this.id,
                severity: "info",
                title: `当前结构嵌套较深（${deepest} 层）`,
                detail: `项目软规范：简单功能尽量直接放 Main。\n当前最大嵌套 ${deepest} 层，建议检视是否可以简化结构。\n（仅供参考，不建议自动调整）`,
                objectName: ctx.model.componentName,
                docUrl: ctx.model.docUrl,
                fixable: false,
                ignoreKey: (0, Types_1.makeIssueKey)(this.id, ctx.model.docUrl, "depth", ctx.model.componentName)
            });
        }
        for (const obj of ctx.model.objects) {
            if (obj.objectType != "component" || obj.extType)
                continue;
            const childCount = this.getRefChildCount(obj.resourceURL, ctx.model.packageName);
            if (childCount < 0 || childCount > smallCount)
                continue;
            issues.push({
                ruleId: this.id,
                severity: "info",
                title: `${obj.name}：子组件结构较简单（${childCount} 个子对象）`,
                detail: "该子组件结构较简单，可考虑直接放入 Main 减少封装层级。\n（仅供参考，请由设计师判断）",
                objectName: obj.name,
                objectPath: obj.path,
                docUrl: ctx.model.docUrl,
                targetId: obj.id,
                fixable: false,
                ignoreKey: (0, Types_1.makeIssueKey)(this.id, ctx.model.docUrl, obj.id, obj.name)
            });
        }
        return issues;
    }
    getRefChildCount(resourceURL, currentPkg) {
        if (!resourceURL)
            return -1;
        try {
            const pi = Api_1.App.project.GetItemByURL(resourceURL);
            if (!pi || !pi.file)
                return -1;
            const text = (0, Api_1.readTextFile)(pi.file);
            if (!text)
                return -1;
            const m = text.match(/<displayList[^>]*>/);
            if (!m)
                return 0;
            const start = text.indexOf(m[0]) + m[0].length;
            const end = text.indexOf("</displayList>", start);
            if (end < 0)
                return -1;
            const body = text.substring(start, end);
            let count = 0;
            let idx = 0;
            while (true) {
                const i = body.indexOf("<", idx);
                if (i < 0)
                    break;
                const next = body.charAt(i + 1);
                if (next != "/" && next != "!" && next != "?") {
                    const tagMatch = body.substring(i).match(/^<(\w+)/);
                    if (tagMatch && ["image", "text", "richtext", "inputtext", "component", "list", "loader", "loader3D", "graph", "group", "movieclip", "swf"].indexOf(tagMatch[1]) >= 0) {
                        count++;
                    }
                }
                idx = i + 1;
            }
            return count;
        }
        catch (e) {
            return -1;
        }
    }
}
exports.MainComplexityRule = MainComplexityRule;
