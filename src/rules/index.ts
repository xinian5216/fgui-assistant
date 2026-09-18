import { Rule } from '../core/Types';
import { NamingRule } from './NamingRule';
import { ButtonScaleRule } from './ButtonScaleRule';
import { TextPivotRule } from './TextPivotRule';
import { RedDotRule } from './RedDotRule';
import { ScreenAdaptRule } from './ScreenAdaptRule';
import { ProtectedPackageRule } from './ProtectedPackageRule';
import { LayoutPresetRule } from './LayoutPresetRule';
import { MainComplexityRule } from './MainComplexityRule';

export function getAllRules(): Rule[] {
    return [
        new ProtectedPackageRule(),
        new NamingRule(),
        new ButtonScaleRule(),
        new TextPivotRule(),
        new RedDotRule(),
        new ScreenAdaptRule(),
        new LayoutPresetRule(),
        new MainComplexityRule()
    ];
}
