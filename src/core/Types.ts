import { FairyEditor } from 'csharp';

export type Severity = "error" | "warning" | "info" | "pass";

export interface ObjInfo {
    id: string;
    name: string;
    objectType: string;
    extType: string;
    path: string;
    depth: number;
    x: number;
    y: number;
    width: number;
    height: number;
    pivotX: number;
    pivotY: number;
    anchor: boolean;
    childCount: number;
    downEffect?: string;
    downEffectValue?: number;
    buttonMode?: string;
    font?: string;
    fontSize?: number;
    resourceURL?: string;
    live?: FairyEditor.FObject;
}

export interface ControllerInfo {
    name: string;
    pages: { id: string; name: string }[];
    homePage: string;
    selectedIndex: number;
}

export interface DocModel {
    docUrl: string;
    componentName: string;
    packageName: string;
    packageId: string;
    isLive: boolean;
    objects: ObjInfo[];
    controllers: ControllerInfo[];
    xmlText?: string;
    doc?: FairyEditor.View.Document;
}

export interface Issue {
    ruleId: string;
    severity: Severity;
    title: string;
    detail?: string;
    objectName?: string;
    objectPath?: string;
    docUrl?: string;
    targetId?: string;
    fixable: boolean;
    fixLabel?: string;
    fixType?: string;
    fixData?: any;
    ignoreKey: string;
}

export interface RuleContext {
    model: DocModel;
    config: any;
    isLive: boolean;
}

export interface Rule {
    id: string;
    name: string;
    description: string;
    safeFix: boolean;
    check(ctx: RuleContext): Issue[];
}

export function makeIssueKey(ruleId: string, docUrl: string, targetId: string, objectName: string): string {
    return `${ruleId}|${docUrl || ""}|${targetId || ""}|${objectName || ""}`;
}
