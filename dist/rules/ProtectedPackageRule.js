"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtectedPackageRule = void 0;
const Types_1 = require("../core/Types");
const Store_1 = require("../core/Store");
class ProtectedPackageRule {
    constructor() {
        this.id = "protectedPackage";
        this.name = "公共资源保护";
        this.description = "受保护的公共 Package 原则上不要修改源组件";
        this.safeFix = false;
    }
    check(ctx) {
        const issues = [];
        const protectedList = ctx.config.protectedPackages || [];
        if (protectedList.indexOf(ctx.model.packageName) < 0)
            return issues;
        if (Store_1.Store.isProtectedAcked(ctx.model.packageName))
            return issues;
        issues.push({
            ruleId: this.id,
            severity: "warning",
            title: `当前 Package「${ctx.model.packageName}」属于公共资源`,
            detail: "原则上不要修改源组件，只允许在引用实例表面调整。\n如确为必要修改，请确认后继续。",
            objectName: ctx.model.componentName,
            docUrl: ctx.model.docUrl,
            fixable: false,
            fixLabel: "我确认这是必要修改",
            fixType: "ackProtected",
            fixData: { pkg: ctx.model.packageName },
            ignoreKey: (0, Types_1.makeIssueKey)(this.id, ctx.model.docUrl, "", ctx.model.packageName)
        });
        return issues;
    }
}
exports.ProtectedPackageRule = ProtectedPackageRule;
