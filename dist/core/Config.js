"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = exports.DEFAULT_CONFIG = exports.NAMING_RULE_ORDER = exports.CONFIG_VERSION = void 0;
exports.orderedNamingKeys = orderedNamingKeys;
exports.migrateConfig = migrateConfig;
const Api_1 = require("../Api");
exports.CONFIG_VERSION = 2;
exports.NAMING_RULE_ORDER = [
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
exports.DEFAULT_CONFIG = {
    configVersion: exports.CONFIG_VERSION,
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
function cloneDefaults() {
    return JSON.parse(JSON.stringify(exports.DEFAULT_CONFIG));
}
function mergeConfig(base, override) {
    if (!override)
        return base;
    const out = base;
    for (const k of Object.keys(override)) {
        const v = override[k];
        if (v === null || v === undefined)
            continue;
        if (k == "namingRules" && typeof v == "object") {
            out.namingRules = Object.assign({}, base.namingRules, v);
        }
        else if (k == "redDot" || k == "screenAdapt" || k == "mainComplexity") {
            out[k] = Object.assign({}, base[k], v);
        }
        else {
            out[k] = v;
        }
    }
    return out;
}
function orderedNamingKeys(rules) {
    const src = rules || {};
    const seen = {};
    const out = [];
    for (let i = 0; i < exports.NAMING_RULE_ORDER.length; i++) {
        const k = exports.NAMING_RULE_ORDER[i];
        if (src[k] !== undefined) {
            out.push(k);
            seen[k] = true;
        }
    }
    const keys = Object.keys(src);
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (!seen[k])
            out.push(k);
    }
    return out;
}
function migrateConfig(cfg) {
    if (!cfg)
        return false;
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
    const defaults = exports.DEFAULT_CONFIG.namingRules;
    const dk = Object.keys(defaults);
    for (let i = 0; i < dk.length; i++) {
        const k = dk[i];
        if (rules[k] === undefined || rules[k] === null) {
            rules[k] = defaults[k];
            changed = true;
        }
    }
    if (ver < exports.CONFIG_VERSION) {
        cfg.configVersion = exports.CONFIG_VERSION;
        changed = true;
    }
    return changed;
}
class ConfigManager {
    constructor() {
        this._config = cloneDefaults();
        this._path = null;
    }
    get config() {
        return this._config;
    }
    get configDir() {
        try {
            if (Api_1.App.project && Api_1.App.project.basePath)
                return (0, Api_1.joinPath)(Api_1.App.project.basePath, "plugins/FGUIAssistant");
        }
        catch (e) { }
        return null;
    }
    load() {
        this._config = cloneDefaults();
        const dir = this.configDir;
        if (!dir)
            return;
        this._path = (0, Api_1.joinPath)(dir, "config.json");
        if ((0, Api_1.fileExists)(this._path)) {
            const text = (0, Api_1.readTextFile)(this._path);
            if (text) {
                try {
                    const userCfg = JSON.parse(text);
                    this._config = mergeConfig(cloneDefaults(), userCfg);
                    if (userCfg.configVersion == null)
                        this._config.configVersion = 0;
                    if (migrateConfig(this._config))
                        this.save();
                }
                catch (e) {
                    (0, Api_1.logWarn)("config.json 解析失败，已使用默认配置: " + e);
                }
            }
        }
        else {
            this.save();
        }
    }
    save() {
        if (!this._path) {
            const dir = this.configDir;
            if (!dir)
                return false;
            this._path = (0, Api_1.joinPath)(dir, "config.json");
        }
        return (0, Api_1.writeTextFile)(this._path, JSON.stringify(this._config, null, 2));
    }
    update(mutate) {
        mutate(this._config);
        return this.save();
    }
}
exports.Config = new ConfigManager();
