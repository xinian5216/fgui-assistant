import { FairyGUI, FairyEditor } from 'csharp';
import { App, log, logWarn } from './Api';
import { Config } from './core/Config';
import { Store } from './core/Store';
import { ScanController } from './services/ScanController';
import { MainPanel } from './ui/MainPanel';
import { FloatingWindow } from './ui/FloatingWindow';

const INSPECTOR_NAME = "FGUI Assistant";
const MENU_ITEM_NAME = "fguiAssistantMain";

let floatingWindow: FloatingWindow = null;
let inspectorPanel: MainPanel = null;
let eventHandlers: { type: string; cb: any }[] = [];
let refreshTimerPending = false;
let projectOpenedHandler: any = null;
let projectClosedHandler: any = null;

class FGUIAssistantInspector extends FairyEditor.View.PluginInspector {
    constructor() {
        super();
        try {
            inspectorPanel = new MainPanel(272, 520);
            this.panel = inspectorPanel.view;
        } catch (e) {
            logWarn("面板创建失败: " + e);
            this.panel = new FairyGUI.GComponent();
        }
        this.updateAction = () => { return true; };
    }
}

function onEditorEvent(type: string): void {
    if (type == FairyEditor.EditorEvents.DocumentActivated) {
        try {
            Config.load();
            Store.load();
            ScanController.scanCurrentComponent();
        } catch (e) { }
        return;
    }
    scheduleLightRefresh();
}

function scheduleLightRefresh(): void {
    if (refreshTimerPending) return;
    refreshTimerPending = true;
    try {
        FairyGUI.Timers.inst.Add(0.2, 1, new FairyGUI.TimerCallback(() => {
            refreshTimerPending = false;
            try {
                if (inspectorPanel) inspectorPanel.refresh();
                if (floatingWindow) floatingWindow.refresh();
            } catch (e) { }
        }));
    } catch (e) {
        refreshTimerPending = false;
    }
}

function subscribeEvent(type: string): void {
    const cb = (data: any) => {
        try { onEditorEvent(type); } catch (e) { }
    };
    try {
        const delegate = new FairyGUI.EventCallback1(cb);
        App.On(type, delegate);
        eventHandlers.push({ type: type, cb: delegate });
    } catch (e) { }
}

function init(): void {
    log("插件加载中…");
    try { Config.load(); } catch (e) { logWarn("配置加载失败: " + e); }
    try { Store.load(); } catch (e) { logWarn("状态加载失败: " + e); }

    floatingWindow = new FloatingWindow();

    try {
        App.inspectorView.AddInspector(() => new FGUIAssistantInspector(), INSPECTOR_NAME, "FGUI Assistant");
        App.docFactory.ConnectInspector(INSPECTOR_NAME, "mixed", true, false);
    } catch (e) {
        logWarn("注册检查器失败: " + e);
    }

    try {
        App.menu.AddItem("FGUI Assistant", MENU_ITEM_NAME, (name: string) => {
            try {
                if (floatingWindow) floatingWindow.toggle();
            } catch (e) { }
        });
    } catch (e) {
        logWarn("注册菜单失败（不影响使用）: " + e);
    }

    subscribeEvent(FairyEditor.EditorEvents.SelectionChanged);
    subscribeEvent(FairyEditor.EditorEvents.DocumentActivated);

    projectOpenedHandler = () => {
        try {
            Config.load();
            Store.load();
            ScanController.scanCurrentComponent();
        } catch (e) { }
    };
    projectClosedHandler = () => {
        try {
            ScanController.lastResult = null;
            ScanController.notify();
        } catch (e) { }
    };
    try { App.add_onProjectOpened(projectOpenedHandler); } catch (e) { }
    try { App.add_onProjectClosed(projectClosedHandler); } catch (e) { }

    log("插件已加载。菜单：FGUI Assistant；或在检查器（Inspector）中找到 FGUI Assistant 面板。");
}

function onPublish(handler: FairyEditor.PublishHandler): void {
    try {
        let pkgName = "";
        try { pkgName = "" + handler.pkg.name; } catch (e) { }
        let exportPath = "";
        try { exportPath = "" + handler.exportPath; } catch (e) { }
        if (pkgName) {
            Store.markPublish(pkgName, exportPath);
            Store.setPublishStep(3, true, (Config.config.publishChecklist || []).length);
        }
        const protectedList = Config.config.protectedPackages || [];
        if (pkgName && protectedList.indexOf(pkgName) >= 0) {
            logWarn(`正在发布受保护的公共 Package「${pkgName}」，请确认其中的修改都是必要的！`);
        }
        if (exportPath) log(`发布路径：${exportPath}`);
    } catch (e) {
        console.warn("[FGUI助手] onPublish 异常: " + e);
    }
}

function onDestroy(): void {
    try { App.inspectorView.RemoveInspector(INSPECTOR_NAME); } catch (e) { }
    try { App.docFactory.disconnectInspector(INSPECTOR_NAME); } catch (e) { }
    try { App.menu.RemoveItem(MENU_ITEM_NAME); } catch (e) { }
    for (const h of eventHandlers) {
        try { App.Off(h.type, h.cb); } catch (e) { }
    }
    eventHandlers = [];
    try { if (projectOpenedHandler) App.remove_onProjectOpened(projectOpenedHandler as any); } catch (e) { }
    try { if (projectClosedHandler) App.remove_onProjectClosed(projectClosedHandler as any); } catch (e) { }
    try { if (floatingWindow) floatingWindow.close(); } catch (e) { }
    try { if (inspectorPanel) { inspectorPanel.dispose(); } } catch (e) { }
    inspectorPanel = null;
    floatingWindow = null;
    log("插件已卸载");
}

try { init(); } catch (e) { console.warn("[FGUI助手] 初始化异常: " + e); }

export { onPublish, onDestroy };
export default onDestroy;
