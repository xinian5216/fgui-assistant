import { FairyGUI, FairyEditor } from 'csharp';
import { App, dirExists, getEditorVersion, log, logWarn } from './Api';
import { Config } from './core/Config';
import { Store } from './core/Store';
import { ScanController } from './services/ScanController';
import { showEnvCheckDialog } from './services/EnvCheck';
import { svnUpdateProject, svnCommitCurrentPackage } from './services/SvnService';
import { MainPanel } from './ui/MainPanel';
import { FloatingWindow } from './ui/FloatingWindow';

const INSPECTOR_NAME = "FGUI Assistant";
const MENU_ITEM_NAME = "fguiAssistantMain";
const MENU_CMD_OPEN = "fguiAssistantOpen";
const MENU_CMD_SCAN = "fguiAssistantScan";
const MENU_CMD_SVN_UP = "fguiAssistantSvnUpdate";
const MENU_CMD_SVN_CI = "fguiAssistantSvnCommit";
const MENU_CMD_ENV = "fguiAssistantEnv";

let floatingWindow: FloatingWindow = null;
let inspectorPanel: MainPanel = null;
let mainMenu: FairyEditor.Component.IMenu = null;
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
    const ver = getEditorVersion();
    log("插件加载中…" + (ver ? `（Editor ${ver}）` : ""));
    try { Config.load(); } catch (e) { logWarn("配置加载失败: " + e); }
    try { Store.load(); } catch (e) { logWarn("状态加载失败: " + e); }

    floatingWindow = new FloatingWindow();

    try {
        App.inspectorView.AddInspector(() => new FGUIAssistantInspector(), INSPECTOR_NAME, "FGUI Assistant");
        App.docFactory.ConnectInspector(INSPECTOR_NAME, "mixed", true, false);
    } catch (e) {
        logWarn("注册检查器失败: " + e);
    }

    registerMenu();

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

    log("插件已加载。主菜单：FGUI Assistant → 打开助手窗口；或使用检查器（Inspector）中的 FGUI Assistant 面板。");
}

function registerMenu(): void {
    try {
        // 插件 reload 时旧实例可能遗留同名菜单（回调指向已销毁的 JS 环境），
        // 先移除再注册，避免重复项与悬空回调
        try { App.menu.RemoveItem(MENU_ITEM_NAME); } catch (e) { }

        // 顶级菜单必须使用带 isSubMenu 的重载声明为“下拉菜单容器”：
        // 根 MenuBar 点击顶级项时固定执行 MenuBar.Popup(item)，
        // 若用 3 参重载注册“点击即执行”项，Popup 拿不到关联子菜单会抛 NullReferenceException
        App.menu.AddItem("FGUI Assistant", MENU_ITEM_NAME, -1, true, (_n: string) => { });

        mainMenu = App.menu.GetSubMenu(MENU_ITEM_NAME);
        if (mainMenu) {
            mainMenu.AddItem("打开助手窗口", MENU_CMD_OPEN, (_n: string) => {
                try { if (floatingWindow) floatingWindow.open(); } catch (e) { }
            });
            mainMenu.AddItem("检查当前组件", MENU_CMD_SCAN, (_n: string) => {
                try { ScanController.scanCurrentComponent(); } catch (e) { }
            });
            try { mainMenu.AddSeperator(); } catch (e) { }
            mainMenu.AddItem("SVN 更新项目", MENU_CMD_SVN_UP, (_n: string) => {
                try { svnUpdateProject(); } catch (e) { }
            });
            mainMenu.AddItem("SVN 提交当前包", MENU_CMD_SVN_CI, (_n: string) => {
                try { svnCommitCurrentPackage(); } catch (e) { }
            });
            try { mainMenu.AddSeperator(); } catch (e) { }
            mainMenu.AddItem("环境自检", MENU_CMD_ENV, (_n: string) => {
                try { showEnvCheckDialog(); } catch (e) { }
            });
        } else {
            logWarn("获取 FGUI Assistant 子菜单失败，菜单入口不可用（Inspector 面板不受影响）");
        }
    } catch (e) {
        logWarn("注册菜单失败（不影响 Inspector 面板使用）: " + e);
    }
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
        if (exportPath) {
            if (!dirExists(exportPath)) logWarn(`发布路径不存在：${exportPath}`);
            log(`发布路径：${exportPath}`);
        }
        try { ScanController.notify(); } catch (e) { }
    } catch (e) {
        console.warn("[FGUI助手] onPublish 异常: " + e);
    }
}

function onDestroy(): void {
    try { App.inspectorView.RemoveInspector(INSPECTOR_NAME); } catch (e) { }
    try { App.docFactory.disconnectInspector(INSPECTOR_NAME); } catch (e) { }
    try { if (mainMenu) mainMenu.RemoveItem(MENU_CMD_OPEN); } catch (e) { }
    try { if (mainMenu) mainMenu.RemoveItem(MENU_CMD_SCAN); } catch (e) { }
    try { if (mainMenu) mainMenu.RemoveItem(MENU_CMD_SVN_UP); } catch (e) { }
    try { if (mainMenu) mainMenu.RemoveItem(MENU_CMD_SVN_CI); } catch (e) { }
    try { if (mainMenu) mainMenu.RemoveItem(MENU_CMD_ENV); } catch (e) { }
    try { App.menu.RemoveItem(MENU_ITEM_NAME); } catch (e) { }
    mainMenu = null;
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
