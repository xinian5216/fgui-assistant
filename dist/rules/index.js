"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllRules = getAllRules;
const NamingRule_1 = require("./NamingRule");
const ButtonScaleRule_1 = require("./ButtonScaleRule");
const TextPivotRule_1 = require("./TextPivotRule");
const RedDotRule_1 = require("./RedDotRule");
const ScreenAdaptRule_1 = require("./ScreenAdaptRule");
const ProtectedPackageRule_1 = require("./ProtectedPackageRule");
const LayoutPresetRule_1 = require("./LayoutPresetRule");
const MainComplexityRule_1 = require("./MainComplexityRule");
function getAllRules() {
    return [
        new ProtectedPackageRule_1.ProtectedPackageRule(),
        new NamingRule_1.NamingRule(),
        new ButtonScaleRule_1.ButtonScaleRule(),
        new TextPivotRule_1.TextPivotRule(),
        new RedDotRule_1.RedDotRule(),
        new ScreenAdaptRule_1.ScreenAdaptRule(),
        new LayoutPresetRule_1.LayoutPresetRule(),
        new MainComplexityRule_1.MainComplexityRule()
    ];
}
