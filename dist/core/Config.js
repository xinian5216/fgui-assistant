"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = exports.DEFAULT_CONFIG = void 0;
const Api_1 = require("../Api");
exports.DEFAULT_CONFIG = {
    buttonScale: 0.98,
    requireButtonDownEffect: true,
    namingRules: {
        Button: "Btn_",
        List: "Lst_",
        Controller: "C_",
        Text: "Txt_",
        Image: "Img_",
        Loader: "Ldr_",
        Component: "Com_"
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
