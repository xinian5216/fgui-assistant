"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onPublish = onPublish;
exports.onDestroy = onDestroy;
const csharp_1 = require("csharp");
const Api_1 = require("./Api");
const Config_1 = require("./core/Config");
const Store_1 = require("./core/Store");
const ScanController_1 = require("./services/ScanController");
const MainPanel_1 = require("./ui/MainPanel");
const FloatingWindow_1 = require("./ui/FloatingWindow");
const INSPECTOR_NAME = "FGUI Assistant";
const MENU_ITEM_NAME = "fguiAssistantMain";
let floatingWindow = null;
let inspectorPanel = null;
let eventHandlers = [];
let refreshTimerPending = false;
let projectOpenedHandler = null;
let projectClosedHandler = null;
class FGUIAssistantInspector extends csharp_1.FairyEditor.View.PluginInspector {
    constructor() {
        super();
        try {
            inspectorPanel = new MainPanel_1.MainPanel(272, 520);
            this.panel = inspectorPanel.view;
        }
        catch (e) {
            (0, Api_1.logWarn)("面板创建失败: " + e);
            this.panel = new csharp_1.FairyGUI.GComponent();
        }
        this.updateAction = () => { return true; };
    }
}
function onEditorEvent(type) {
    if (type == csharp_1.FairyEditor.EditorEvents.DocumentActivated) {
        try {
            Config_1.Config.load();
            Store_1.Store.load();
            ScanController_1.ScanController.scanCurrentComponent();
        }
        catch (e) { }
        return;
    }
    scheduleLightRefresh();
}
function scheduleLightRefresh() {
    if (refreshTimerPending)
        return;
    refreshTimerPending = true;
    try {
        csharp_1.FairyGUI.Timers.inst.Add(0.2, 1, new csharp_1.FairyGUI.TimerCallback(() => {
            refreshTimerPending = false;
            try {
                if (inspectorPanel)
                    inspectorPanel.refresh();
                if (floatingWindow)
                    floatingWindow.refresh();
            }
            catch (e) { }
        }));
    }
    catch (e) {
        refreshTimerPending = false;
    }
}
function subscribeEvent(type) {
    const cb = (data) => {
        try {
            onEditorEvent(type);
        }
        catch (e) { }
    };
    try {
        const delegate = new csharp_1.FairyGUI.EventCallback1(cb);
        Api_1.App.On(type, delegate);
        eventHandlers.push({ type: type, cb: delegate });
    }
    catch (e) { }
}
function init() {
    (0, Api_1.log)("插件加载中…");
    try {
        Config_1.Config.load();
    }
    catch (e) {
        (0, Api_1.logWarn)("配置加载失败: " + e);
    }
    try {
        Store_1.Store.load();
    }
    catch (e) {
        (0, Api_1.logWarn)("状态加载失败: " + e);
    }
    floatingWindow = new FloatingWindow_1.FloatingWindow();
    try {
        Api_1.App.inspectorView.AddInspector(() => new FGUIAssistantInspector(), INSPECTOR_NAME, "FGUI Assistant");
        Api_1.App.docFactory.ConnectInspector(INSPECTOR_NAME, "mixed", true, false);
    }
    catch (e) {
        (0, Api_1.logWarn)("注册检查器失败: " + e);
    }
    try {
        Api_1.App.menu.AddItem("FGUI Assistant", MENU_ITEM_NAME, (name) => {
            try {
                if (floatingWindow)
                    floatingWindow.toggle();
            }
            catch (e) { }
        });
    }
    catch (e) {
        (0, Api_1.logWarn)("注册菜单失败（不影响使用）: " + e);
    }
    subscribeEvent(csharp_1.FairyEditor.EditorEvents.SelectionChanged);
    subscribeEvent(csharp_1.FairyEditor.EditorEvents.DocumentActivated);
    projectOpenedHandler = () => {
        try {
            Config_1.Config.load();
            Store_1.Store.load();
            ScanController_1.ScanController.scanCurrentComponent();
        }
        catch (e) { }
    };
    projectClosedHandler = () => {
        try {
            ScanController_1.ScanController.lastResult = null;
            ScanController_1.ScanController.notify();
        }
        catch (e) { }
    };
    try {
        Api_1.App.add_onProjectOpened(projectOpenedHandler);
    }
    catch (e) { }
    try {
        Api_1.App.add_onProjectClosed(projectClosedHandler);
    }
    catch (e) { }
    (0, Api_1.log)("插件已加载。菜单：FGUI Assistant；或在检查器（Inspector）中找到 FGUI Assistant 面板。");
}
function onPublish(handler) {
    try {
        let pkgName = "";
        try {
            pkgName = "" + handler.pkg.name;
        }
        catch (e) { }
        let exportPath = "";
        try {
            exportPath = "" + handler.exportPath;
        }
        catch (e) { }
        if (pkgName) {
            Store_1.Store.markPublish(pkgName, exportPath);
            Store_1.Store.setPublishStep(3, true, (Config_1.Config.config.publishChecklist || []).length);
        }
        const protectedList = Config_1.Config.config.protectedPackages || [];
        if (pkgName && protectedList.indexOf(pkgName) >= 0) {
            (0, Api_1.logWarn)(`正在发布受保护的公共 Package「${pkgName}」，请确认其中的修改都是必要的！`);
        }
        if (exportPath)
            (0, Api_1.log)(`发布路径：${exportPath}`);
    }
    catch (e) {
        console.warn("[FGUI助手] onPublish 异常: " + e);
    }
}
function onDestroy() {
    try {
        Api_1.App.inspectorView.RemoveInspector(INSPECTOR_NAME);
    }
    catch (e) { }
    try {
        Api_1.App.docFactory.disconnectInspector(INSPECTOR_NAME);
    }
    catch (e) { }
    try {
        Api_1.App.menu.RemoveItem(MENU_ITEM_NAME);
    }
    catch (e) { }
    for (const h of eventHandlers) {
        try {
            Api_1.App.Off(h.type, h.cb);
        }
        catch (e) { }
    }
    eventHandlers = [];
    try {
        if (projectOpenedHandler)
            Api_1.App.remove_onProjectOpened(projectOpenedHandler);
    }
    catch (e) { }
    try {
        if (projectClosedHandler)
            Api_1.App.remove_onProjectClosed(projectClosedHandler);
    }
    catch (e) { }
    try {
        if (floatingWindow)
            floatingWindow.close();
    }
    catch (e) { }
    try {
        if (inspectorPanel) {
            inspectorPanel.dispose();
        }
    }
    catch (e) { }
    inspectorPanel = null;
    floatingWindow = null;
    (0, Api_1.log)("插件已卸载");
}
try {
    init();
}
catch (e) {
    console.warn("[FGUI助手] 初始化异常: " + e);
}
exports.default = onDestroy;
