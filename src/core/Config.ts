import { App, logWarn, joinPath, readTextFile, writeTextFile, fileExists } from '../Api';

export interface NamingRules {
    [typeName: string]: string;
}

export interface LayoutPreset {
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    pivotX: number;
    pivotY: number;
    anchor: boolean;
    note?: string;
}

export const CONFIG_VERSION = 2;

export const NAMING_RULE_ORDER = [
    "Text",
    "Image",
    "Button",
    "List",
    "ProgressBar",
    "ComboBox",
    "Loader",
    "Component",
    "Controller"
];

export interface AssistantConfig {
    configVersion?: number;
    buttonScale: number;
    requireButtonDownEffect: boolean;
    namingRules: NamingRules;
    fonts: string[];
    protectedPackages: string[];
    layoutPresets: LayoutPreset[];
    redDot: {
        controllerNamePattern: string;
        objectNamePattern: string;
        pageOff: string;
        pageOn: string;
    };
    screenAdapt: {
        mainComponentNames: string[];
    };
    mainComplexity: {
        enabled: boolean;
        maxDepth: number;
        smallComponentChildCount: number;
    };
    publishChecklist: string[];
    psChecklist: string[];
}

export const DEFAULT_CONFIG: AssistantConfig = {
    configVersion: CONFIG_VERSION,
    buttonScale: 0.98,
    requireButtonDownEffect: true,
    namingRules: {
        Text: "Tex_",
        Image: "Img_",
        Button: "Btn_",
        List: "Lst_",
        ProgressBar: "Bar_",
        ComboBox: "Box_",
        Loader: "Lod_",
        Component: "Com_",
        Controller: "C_"
    },
    fonts: [
        "三极拙楷简体",
        "方正北魏楷书简体",
        "方正大标宋简体"
    ],
    protectedPackages: [],
    layoutPresets: [],
    redDot: {
        controllerNamePattern: "HongDian",
        objectNamePattern: "HongDian",
        pageOff: "0",
        pageOn: "1"
    },
    screenAdapt: {
        mainComponentNames: ["Main"]
    },
    mainComplexity: {
        enabled: true,
        maxDepth: 3,
        smallComponentChildCount: 2
    },
    publishChecklist: [
        "SVN Update（上传项目前）",
        "Unity 已提前打开",
        "FairyGUI 发布设置已确认",
        "FairyGUI 执行发布",
        "确认发布路径",
        "Unity 中 Ctrl+R 刷新",
        "内部 → 虚拟构建",
        "SVN Commit（单个文件夹）"
    ],
    psChecklist: [
        "已确认底图分辨率",
        "智能对象比例已按底图调整",
        "透明度已核对",
        "阴影已核对",
        "发光已核对",
        "描边已核对",
        "其他 PS 特效已核对"
    ]
};

function cloneDefaults(): AssistantConfig {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function mergeConfig(base: AssistantConfig, override: any): AssistantConfig {
    if (!override) return base;
    const out: any = base;
    for (const k of Object.keys(override)) {
        const v = override[k];
        if (v === null || v === undefined) continue;
        if (k == "namingRules" && typeof v == "object") {
            out.namingRules = Object.assign({}, base.namingRules, v);
        } else if (k == "redDot" || k == "screenAdapt" || k == "mainComplexity") {
            out[k] = Object.assign({}, (base as any)[k], v);
        } else {
            out[k] = v;
        }
    }
    return out;
}

export function orderedNamingKeys(rules: NamingRules): string[] {
    const src = rules || {};
    const seen: { [k: string]: boolean } = {};
    const out: string[] = [];
    for (let i = 0; i < NAMING_RULE_ORDER.length; i++) {
        const k = NAMING_RULE_ORDER[i];
        if (src[k] !== undefined) {
            out.push(k);
            seen[k] = true;
        }
    }
    const keys = Object.keys(src);
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (!seen[k]) out.push(k);
    }
    return out;
}

export function migrateConfig(cfg: AssistantConfig): boolean {
    if (!cfg) return false;
    let changed = false;
    const ver = cfg.configVersion || 0;
    if (!cfg.namingRules) {
        cfg.namingRules = {};
        changed = true;
    }
    const rules = cfg.namingRules;
    if (ver < 2) {
        if (rules.Text === "Txt_") {
            rules.Text = "Tex_";
            changed = true;
        }
        if (rules.Loader === "Ldr_") {
            rules.Loader = "Lod_";
            changed = true;
        }
    }
    const defaults = DEFAULT_CONFIG.namingRules;
    const dk = Object.keys(defaults);
    for (let i = 0; i < dk.length; i++) {
        const k = dk[i];
        if (rules[k] === undefined || rules[k] === null) {
            rules[k] = defaults[k];
            changed = true;
        }
    }
    if (ver < CONFIG_VERSION) {
        cfg.configVersion = CONFIG_VERSION;
        changed = true;
    }
    return changed;
}

class ConfigManager {
    private _config: AssistantConfig = cloneDefaults();
    private _path: string = null;

    get config(): AssistantConfig {
        return this._config;
    }

    get configDir(): string {
        try {
            if (App.project && App.project.basePath) return joinPath(App.project.basePath, "plugins/FGUIAssistant");
        } catch (e) { }
        return null;
    }

    load(): void {
        this._config = cloneDefaults();
        const dir = this.configDir;
        if (!dir) return;
        this._path = joinPath(dir, "config.json");
        if (fileExists(this._path)) {
            const text = readTextFile(this._path);
            if (text) {
                try {
                    const userCfg = JSON.parse(text);
                    this._config = mergeConfig(cloneDefaults(), userCfg);
                    if (userCfg.configVersion == null) this._config.configVersion = 0;
                    if (migrateConfig(this._config)) this.save();
                } catch (e) {
                    logWarn("config.json 解析失败，已使用默认配置: " + e);
                }
            }
        } else {
            this.save();
        }
    }

    save(): boolean {
        if (!this._path) {
            const dir = this.configDir;
            if (!dir) return false;
            this._path = joinPath(dir, "config.json");
        }
        return writeTextFile(this._path, JSON.stringify(this._config, null, 2));
    }

    update(mutate: (cfg: AssistantConfig) => void): boolean {
        mutate(this._config);
        return this.save();
    }
}

export const Config = new ConfigManager();
