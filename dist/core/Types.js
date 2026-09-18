"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeIssueKey = makeIssueKey;
function makeIssueKey(ruleId, docUrl, targetId, objectName) {
    return `${ruleId}|${docUrl || ""}|${targetId || ""}|${objectName || ""}`;
}
