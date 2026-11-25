const Module = require('module');
const path = require('path');
const fs = require('fs');
const os = require('os');

const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'fgui-test-'));

const editorEventLog = [];
const projectHandlers = { opened: [], closed: [] };

// 模拟 FairyEditor.Component.IMenu / MenuBar 的合同：
// 根 MenuBar 上的顶级项必须是“子菜单容器”。
// 真实编辑器中点击顶级项会执行 MenuBar.Popup(item)，读取该项关联的 Popup；
// 用 3 参 AddItem 注册“点击即执行”的顶级项没有 Popup，会抛 NullReferenceException。
function makeMenuMock(isRoot) {
    const items = new Map();
    const submenus = new Map();
    return {
        _isRoot: isRoot,
        _items: items,
        _submenus: submenus,
        AddItem(caption, name, a3, a4, a5) {
            let isSubMenu, cb;
            if (typeof a3 === 'function') {
                cb = a3;
                isSubMenu = false;
            } else {
                isSubMenu = !!a4;
                cb = a5;
            }
            if (!caption || !name) throw new Error('menu AddItem 收到空的 caption/name');
            if (typeof cb !== 'function') throw new Error('菜单项回调无效: ' + name);
            if (isRoot && !isSubMenu) {
                throw new Error('NullReferenceException(simulated): MenuBar.Popup 顶级项缺少子菜单');
            }
            if (items.has(name)) throw new Error('重复注册菜单项: ' + name);
            items.set(name, { caption: caption, isSubMenu: isSubMenu, cb: cb });
        },
        GetSubMenu(name) {
            if (!items.has(name)) return null;
            if (!submenus.has(name)) submenus.set(name, makeMenuMock(false));
            return submenus.get(name);
        },
        RemoveItem(name) {
            items.delete(name);
            const s = submenus.get(name);
            if (s) {
                s.ClearItems();
                submenus.delete(name);
            }
        },
        ClearItems() {
            items.clear();
            for (const s of submenus.values()) s.ClearItems();
            submenus.clear();
        },
        AddSeperator() { },
        SetItemEnabled() { },
        SetItemChecked() { },
        IsItemChecked() { return false; },
        SetItemText() { },
        Invoke(name) {
            const it = items.get(name);
            if (it && it.cb) it.cb(name);
        },
        Dispose() { }
    };
}

const csharpMock = {
    FairyGUI: {
        Utils: {
            XML: class XML {
                constructor(str) { this.str = str; this.name = 'component'; this.elements = makeXmlElements(parseXml(str)); }
            }
        },
        EventDispatcher: class { },
        Timers: {
            inst: {
                Add(delay, repeat, cb) { if (typeof cb === 'function') cb(); }
            },
            CallLater() { }
        },
        EventCallback1: function (f) { return f; },
        TimerCallback: function (f) { return f; }
    },
    FairyEditor: {
        EditorEvents: {
            SelectionChanged: 'SelectionChanged',
            DocumentActivated: 'DocumentActivated'
        },
        View: {
            PluginInspector: class PluginInspector {
                constructor() { this.panel = null; this.updateAction = null; }
            }
        },
        App: {
            project: { basePath: tmpBase },
            consoleView: { Log() { }, LogWarning() { }, LogError() { } },
            preferenceFolder: tmpBase,
            menu: makeMenuMock(true),
            inspectorView: { AddInspector() { }, RemoveInspector() { } },
            docFactory: { ConnectInspector() { }, disconnectInspector() { } },
            On(type, d) { editorEventLog.push({ type: type, d: d }); },
            Off(type, d) {
                const i = editorEventLog.findIndex(h => h.type === type && h.d === d);
                if (i >= 0) editorEventLog.splice(i, 1);
            },
            add_onProjectOpened(h) { projectHandlers.opened.push(h); },
            remove_onProjectOpened(h) {
                const i = projectHandlers.opened.indexOf(h);
                if (i >= 0) projectHandlers.opened.splice(i, 1);
            },
            add_onProjectClosed(h) { projectHandlers.closed.push(h); },
            remove_onProjectClosed(h) {
                const i = projectHandlers.closed.indexOf(h);
                if (i >= 0) projectHandlers.closed.splice(i, 1);
            }
        },
        FontUtil: { GetOSInstalledFontNames: () => ({ Count: 0, get_Item: () => null }) },
        ProcessUtil: {
            GetAppVersion: () => '6.1.4-mock',
            Start: () => ''
        },
        BuilderUtil: {
            RevealInExplorer: () => { },
            GetMD5HashFromFile: () => 'mockmd5'
        },
        Clipboard: {
            SetText: () => { }
        }
    },
    System: {
        Type: {
            GetType: (name) => name
        },
        Array: {
            CreateInstance: (t, len) => {
                const a = new Array(len);
                a.SetValue = (v, i) => { a[i] = v; };
                return a;
            }
        },
        IO: {
            File: {
                Exists: (p) => fs.existsSync(p),
                ReadAllText: (p) => fs.readFileSync(p, 'utf8'),
                WriteAllText: (p, c) => fs.writeFileSync(p, c, 'utf8')
            },
            Directory: {
                Exists: (p) => fs.existsSync(p),
                CreateDirectory: (p) => fs.mkdirSync(p, { recursive: true })
            },
            FileInfo: class FileInfo {
                constructor(p) { this.Length = BigInt(fs.statSync(p).size); }
            }
        }
    },
    UnityEngine: {}
};

function parseAttrs(str) {
    const attrs = {};
    const re = /(\w+)="([^"]*)"/g;
    let m;
    while ((m = re.exec(str))) attrs[m[1]] = m[2];
    return attrs;
}

function parseXml(str) {
    const root = { children: [] };
    const stack = [root];
    const re = /<(\/?)(\w+)([^>]*?)(\/?)>/g;
    let m;
    while ((m = re.exec(str))) {
        if (m[1] === '/') { stack.pop(); continue; }
        const node = { name: m[2], attrs: parseAttrs(m[3]), children: [] };
        stack[stack.length - 1].children.push(node);
        if (m[4] !== '/') stack.push(node);
    }
    return root.children[0] || { children: [] };
}

function makeXmlElements(node) {
    return {
        Count: node.children.length,
        get_Item: (i) => wrapXml(node.children[i]),
        Filter: (sel) => makeXmlElements({ children: node.children.filter(c => c.name === sel) }),
        Find: (sel) => { const f = node.children.find(c => c.name === sel); return f ? wrapXml(f) : null; }
    };
}

function wrapXml(node) {
    if (!node) return null;
    return {
        name: node.name,
        elements: makeXmlElements(node),
        GetAttribute: (a, def) => (node.attrs[a] !== undefined ? node.attrs[a] : def),
        ToString: () => ''
    };
}

const origLoad = Module._load;
Module._load = function (request, parent) {
    if (request === 'csharp') return csharpMock;
    if (request === 'puerts') return { $typeof: () => null };
    return origLoad.apply(this, arguments);
};

let passed = 0, failed = 0;
function assert(cond, name) {
    if (cond) { passed++; console.log('  ✓ ' + name); }
    else { failed++; console.log('  ✕ ' + name); }
}

const dist = (...p) => require(path.join(__dirname, '..', 'dist', ...p));

const { Config, DEFAULT_CONFIG, migrateConfig, orderedNamingKeys, CONFIG_VERSION } = dist('core', 'Config.js');
const { Store } = dist('core', 'Store.js');
const { Engine } = dist('core', 'RuleEngine.js');
const { getNamingType } = dist('rules', 'NamingRule.js');
const { parseComponentXml } = dist('services', 'ScanService.js');

console.log('== Config ==');
Config.load();
assert(Config.config.buttonScale === 0.98, '默认按钮缩放 0.98');
assert(Config.config.namingRules.Button === 'Btn_', 'Button 前缀 Btn_');
assert(Config.config.namingRules.Text === 'Tex_', 'Text 前缀 Tex_');
assert(Config.config.namingRules.Image === 'Img_', 'Image 前缀 Img_');
assert(Config.config.namingRules.List === 'Lst_', 'List 前缀 Lst_');
assert(Config.config.namingRules.ProgressBar === 'Bar_', 'ProgressBar 前缀 Bar_');
assert(Config.config.namingRules.ComboBox === 'Box_', 'ComboBox 前缀 Box_');
assert(Config.config.namingRules.Loader === 'Lod_', 'Loader 前缀 Lod_');
assert(Config.config.namingRules.Component === 'Com_', 'Component 前缀 Com_');
assert(Config.config.namingRules.Controller === 'C_', 'Controller 前缀 C_');
assert(orderedNamingKeys(Config.config.namingRules).join(',') === 'Text,Image,Button,List,ProgressBar,ComboBox,Loader,Component,Controller', '设置页命名规则默认顺序');
assert(fs.existsSync(path.join(tmpBase, 'plugins', 'FGUIAssistant', 'config.json')), '默认配置已写入项目插件目录');
fs.writeFileSync(path.join(tmpBase, 'plugins', 'FGUIAssistant', 'config.json'), JSON.stringify({ buttonScale: 0.95, namingRules: { Button: 'BtnX_' } }));
Config.load();
assert(Config.config.buttonScale === 0.95, '用户配置覆盖 buttonScale');
assert(Config.config.namingRules.Button === 'BtnX_', '用户配置覆盖命名规则');
assert(Config.config.namingRules.List === 'Lst_', '未覆盖项保留默认');
assert(Config.config.namingRules.Text === 'Tex_', '未覆盖 Text 使用新默认 Tex_');
Config.update(c => { c.buttonScale = 0.98; c.namingRules.Button = 'Btn_'; });

console.log('== 命名规则迁移 ==');
const oldDefault = { namingRules: { Text: 'Txt_', Loader: 'Ldr_', Button: 'Btn_', List: 'Lst_', Image: 'Img_', Component: 'Com_', Controller: 'C_' } };
fs.writeFileSync(path.join(tmpBase, 'plugins', 'FGUIAssistant', 'config.json'), JSON.stringify(oldDefault));
Config.load();
assert(Config.config.namingRules.Text === 'Tex_', '旧默认 Txt_ 迁移为 Tex_');
assert(Config.config.namingRules.Loader === 'Lod_', '旧默认 Ldr_ 迁移为 Lod_');
assert(Config.config.namingRules.ProgressBar === 'Bar_', '缺失 ProgressBar 补 Bar_');
assert(Config.config.namingRules.ComboBox === 'Box_', '缺失 ComboBox 补 Box_');
assert(Config.config.configVersion === CONFIG_VERSION, '迁移后写入 configVersion');

const customCfg = { namingRules: { Text: 'Text_', Loader: 'Loader_', Button: 'Btn_' } };
fs.writeFileSync(path.join(tmpBase, 'plugins', 'FGUIAssistant', 'config.json'), JSON.stringify(customCfg));
Config.load();
assert(Config.config.namingRules.Text === 'Text_', '用户自定义 Text_ 不被覆盖');
assert(Config.config.namingRules.Loader === 'Loader_', '用户自定义 Loader_ 不被覆盖');
assert(Config.config.namingRules.ProgressBar === 'Bar_', '自定义配置仍补齐缺失 Bar_');
assert(Config.config.namingRules.ComboBox === 'Box_', '自定义配置仍补齐缺失 Box_');

const afterV2 = { configVersion: CONFIG_VERSION, namingRules: { Text: 'Txt_', Loader: 'Ldr_' } };
fs.writeFileSync(path.join(tmpBase, 'plugins', 'FGUIAssistant', 'config.json'), JSON.stringify(afterV2));
Config.load();
assert(Config.config.namingRules.Text === 'Txt_', '已迁移版本中用户改回 Txt_ 不再自动覆盖');
assert(Config.config.namingRules.Loader === 'Ldr_', '已迁移版本中用户改回 Ldr_ 不再自动覆盖');

const restored = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
assert(restored.namingRules.Text === 'Tex_' && restored.namingRules.Loader === 'Lod_', '恢复默认使用新规范 Tex_/Lod_');
assert(migrateConfig({ namingRules: { Text: 'Txt_', Loader: 'Ldr_' } }) === true, 'migrateConfig 对旧默认返回 true');
Config.update(c => {
    const d = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    for (const k of Object.keys(d)) c[k] = d[k];
});

console.log('== Store / 忽略 ==');
Store.load();
Store.ignore('rule1|doc|id|name', false);
Store.ignore('rule2|doc|id|name', true);
assert(Store.isIgnored('rule1|doc|id|name'), '本次忽略生效');
assert(Store.isIgnored('rule2|doc|id|name'), '永久忽略生效');
Store.load();
assert(Store.isIgnored('rule1|doc|id|name'), '本次忽略在会话内保持（插件重载才清除）');
assert(Store.isIgnored('rule2|doc|id|name'), '重新加载后永久忽略保留');
Store.clearPermanentIgnores();

console.log('== XML 解析 ==');
const xmlText = `<?xml version="1.0" encoding="utf-8"?>
<component size="750,1334">
  <controller name="C_HongDian" pages="a1,0,a2,1"/>
  <displayList>
    <image id="n1" name="Img_Bg" xy="0,0" size="750,1334"/>
    <text id="n2" name="Tex_Title" xy="100,50" size="200,40" font="三极拙楷简体" fontSize="30"/>
    <text id="n3" name="title2" xy="100,100" size="200,40" pivot="0.5,0.5" anchor="true"/>
    <component id="n4" name="Btn_Ok" xy="100,200" size="120,40" extention="Button">
      <Button downEffect="scale" downEffectValue="0.98"/>
    </component>
    <component id="n5" name="button2" xy="100,300" size="120,40" extention="Button">
      <Button downEffect="scale" downEffectValue="1"/>
    </component>
    <list id="n6" name="list1" xy="0,400" size="300,200"/>
  </displayList>
</component>`;
const pi = { file: 'x.xml', name: 'Main', owner: { name: 'TestPkg', id: 'pkgid001', basePath: tmpBase }, GetURL: () => 'ui://pkgid001/item0001' };
const model = parseComponentXml(xmlText, pi);
assert(model.objects.length === 6, 'XML 解析出 6 个对象, 实际 ' + model.objects.length);
assert(model.controllers.length === 1, '解析出 1 个控制器');
assert(model.controllers[0].pages.length === 2, '控制器 2 个页面');
assert(model.controllers[0].pages[0].name === '0', '页面 0 名称正确');
const btn2 = model.objects.find(o => o.name === 'button2');
assert(btn2 && btn2.extType === 'Button' && btn2.downEffectValue === 1, '按钮缩放值解析');
const txt2 = model.objects.find(o => o.name === 'title2');
assert(txt2 && txt2.pivotX === 0.5 && txt2.anchor === true, '文字轴心解析');

console.log('== 规则检查 ==');
const result = Engine.runScan(model);
const byRule = (id) => result.issues.filter(i => i.ruleId === id);
assert(byRule('naming').some(i => i.objectName === 'button2'), '命名: button2 缺少 Btn_ 前缀');
assert(byRule('naming').some(i => i.objectName === 'title2'), '命名: title2 缺少 Tex_ 前缀');
const titleIssue = byRule('naming').find(i => i.objectName === 'title2');
assert(titleIssue && titleIssue.detail.indexOf('Tex_title2') >= 0, '建议只补前缀不改原名');
assert(titleIssue && titleIssue.fixLabel === '改为 Tex_title2', '修复标签为改为 Tex_title2');
assert(byRule('naming').some(i => i.objectName === 'list1'), '命名: list1 缺少 Lst_ 前缀');
assert(!byRule('naming').some(i => i.objectName === 'Btn_Ok'), '命名: Btn_Ok 通过');
assert(byRule('naming').every(i => i.fixable === false), 'XML 扫描结果不可直接修复');
assert(byRule('buttonScale').some(i => i.objectName === 'button2'), '按钮缩放: button2 缩放为 1 报警');
assert(!byRule('buttonScale').some(i => i.objectName === 'Btn_Ok'), '按钮缩放: Btn_Ok 0.98 通过');
assert(byRule('textPivot').some(i => i.objectName === 'Tex_Title'), '文字轴心: Tex_Title 未居中报警');
assert(!byRule('textPivot').some(i => i.objectName === 'title2'), '文字轴心: title2 通过');
assert(byRule('redDot').length === 0, '红点: 0/1 页面齐全且默认 0 通过');
assert(byRule('screenAdapt').some(i => i.severity === 'info'), '屏幕适配: Main 无法读取设置时提示人工确认');

console.log('== 红点规则 ==');
const xmlBadReddot = xmlText.replace('pages="a1,0,a2,1"', 'pages="a1,0"');
const modelBad = parseComponentXml(xmlBadReddot, pi);
const rBad = Engine.runScan(modelBad);
assert(rBad.issues.some(i => i.ruleId === 'redDot' && i.title.indexOf('缺少') >= 0), '红点: 缺少页面 1 报警');

console.log('== 公共资源保护 ==');
Config.update(c => { c.protectedPackages = ['TestPkg']; });
const rProt = Engine.runScan(model);
assert(rProt.issues.some(i => i.ruleId === 'protectedPackage'), '受保护 Package 产生提醒');
Store.ackProtected('TestPkg');
const rProt2 = Engine.runScan(model);
assert(!rProt2.issues.some(i => i.ruleId === 'protectedPackage'), '确认后不再提醒');
Config.update(c => { c.protectedPackages = []; });

console.log('== 忽略机制 ==');
const r1 = Engine.runScan(model);
const namingIssue = r1.issues.find(i => i.ruleId === 'naming' && i.objectName === 'button2');
Store.ignore(namingIssue.ignoreKey, false);
const r2 = Engine.runScan(model);
assert(!r2.issues.some(i => i.ignoreKey === namingIssue.ignoreKey), '忽略后该问题不再出现');

console.log('== 布局模板 ==');
Config.update(c => { c.layoutPresets = [{ name: 'Btn_Ok', x: 999, y: 888, width: 120, height: 40, pivotX: 0, pivotY: 0, anchor: false }]; });
const rLayout = Engine.runScan(model);
assert(rLayout.issues.some(i => i.ruleId === 'layoutPreset' && i.objectName === 'Btn_Ok'), '位置与模板不一致时提示');
Config.update(c => { c.layoutPresets = [{ name: 'Btn_Ok', x: 100, y: 200, width: 120, height: 40, pivotX: 0, pivotY: 0, anchor: false }]; });
const rLayout2 = Engine.runScan(model);
assert(!rLayout2.issues.some(i => i.ruleId === 'layoutPreset'), '位置一致时通过');
Config.update(c => { c.layoutPresets = []; });

console.log('== 命名类型映射 ==');
assert(getNamingType({ extType: 'Button', objectType: 'component' }) === 'Button', 'Button');
assert(getNamingType({ extType: '', objectType: 'list' }) === 'List', 'List');
assert(getNamingType({ extType: '', objectType: 'text' }) === 'Text', 'Text');
assert(getNamingType({ extType: '', objectType: 'component' }) === 'Component', 'Component');
assert(getNamingType({ extType: '', objectType: 'loader' }) === 'Loader', 'Loader');
assert(getNamingType({ extType: 'ProgressBar', objectType: 'component' }) === 'ProgressBar', 'ProgressBar');
assert(getNamingType({ extType: 'ComboBox', objectType: 'component' }) === 'ComboBox', 'ComboBox');

console.log('== 布局 / 滚动系统 ==');
const Layout = dist('ui', 'Layout.js');
assert(Layout.LAYOUT.HOME_MAX_ISSUES === 5, '首页最近问题最多 5 条');
assert(Layout.LAYOUT.ISSUE_ITEM_H > 0 && Layout.LAYOUT.ISSUE_ITEM_H < 200, '检查结果 Item 为有限高度');
const minWin = Layout.computeMinWindow(9);
assert(minWin.width >= 360 && minWin.height >= 400, '最小窗口由控件推算且不为 0');
const defWin = Layout.computeDefaultWindow(9);
assert(defWin.width >= minWin.width && defWin.height >= minWin.height, '默认窗口不小于最小窗口');
const tabsNarrow = Layout.tabLayout(9, 272);
assert(tabsNarrow.rows >= 2 && tabsNarrow.tabAreaH === tabsNarrow.rows * Layout.LAYOUT.TAB_ROW_H, '窄宽度下 Tab 自动换行');
const tabsWide = Layout.tabLayout(9, 560);
assert(tabsWide.rows === 1, '宽窗口 Tab 单行');
const vpH = Layout.contentViewportHeight(640, tabsWide.tabAreaH);
assert(vpH === 640 - tabsWide.tabAreaH && vpH > 0, 'ContentViewport 高度 = 面板高度 - TabBar');
assert(Layout.scrollMax(100, 200) === 0, '内容不足时无滚动范围');
assert(Layout.scrollMax(20000, 400) === 19600, '超长内容滚动范围按 viewport 计算，不撑开窗口');
assert(Layout.clampScroll(-10, 20000, 400) === 0, '滚动位置下限为 0');
assert(Layout.clampScroll(999999, 20000, 400) === 19600, '滚动位置上限为 content-view');
const noBar = Layout.thumbMetrics(400, 200, 0);
assert(noBar.show === false, '内容不足时不显示滚动条');
const bar = Layout.thumbMetrics(400, 20000, 0);
assert(bar.show === true && bar.thumbH >= Layout.LAYOUT.MIN_THUMB && bar.thumbH < 400, '超长内容显示窄滚动条');
const range = Layout.visibleIndexRange(0, 400, Layout.LAYOUT.ISSUE_ITEM_H, 1000, 2);
assert(range.start === 0 && range.end > 0 && (range.end - range.start) <= 12, '1000 条结果只渲染可见附近 Item');
const rangeMid = Layout.visibleIndexRange(84 * 200, 400, 84, 1000, 2);
assert(rangeMid.start >= 198 && rangeMid.end <= 210 && (rangeMid.end - rangeMid.start) <= 12, '滚动后仍只渲染可见窗口');
assert(Layout.visibleIndexRange(0, 400, 84, 366, 2).end <= 12, '366 条警告不会生成无限高度窗口');
assert(Layout.wheelToScrollDelta(1) > 0, '滚轮向下（delta>0）scrollOffset 增大');
assert(Layout.wheelToScrollDelta(-1) < 0, '滚轮向上（delta<0）scrollOffset 减小');
const afterDown = Layout.clampScroll(0 + Layout.wheelToScrollDelta(3), 20000, 400);
const visDown = Layout.visibleIndexRange(afterDown, 400, 84, 1000, 0);
assert(visDown.start > 0, '滚轮向下 visibleStartIndex 增大');
const afterUp = Layout.clampScroll(afterDown + Layout.wheelToScrollDelta(-3), 20000, 400);
assert(afterUp === 0, '滚轮向上回到更靠前位置');

console.log('== 全项目扫描 ==');
const { ScanController } = dist('services', 'ScanController.js');
const xmlPath = path.join(tmpBase, 'comp_project.xml');
fs.writeFileSync(xmlPath, xmlText);
const mkPi = (pkgName, compName) => ({
    type: 'component', isDisposed: false, branch: '', file: xmlPath, name: compName,
    owner: { name: pkgName, id: 'id_' + pkgName, basePath: tmpBase },
    GetURL: () => `ui://id_${pkgName}/${compName}`
});
const mkPkg = (pkgName) => ({
    name: pkgName,
    items: { Count: 1, get_Item: () => mkPi(pkgName, 'Comp_' + pkgName) }
});
csharpMock.FairyEditor.App.project.allPackages = { Count: 2, get_Item: (i) => (i === 0 ? mkPkg('PkgA') : mkPkg('PkgB')) };
ScanController.scanWholeProject();
assert(ScanController.lastScope === 'project', '全项目扫描完成（scope=project）');
assert(ScanController.scanning === false, '扫描状态复位');
const pr = ScanController.lastResult;
assert(pr && pr.model.componentName === '（整个项目）', '合并模型标签正确');
assert(pr.issues.filter(i => i.ruleId === 'buttonScale' && i.objectName === 'button2').length === 2, '两个 Package 的按钮缩放问题都被收集');
assert(pr.errorCount + pr.warningCount + pr.infoCount === pr.issues.length, '汇总统计一致');
assert(pr.warningCount >= 10, '合并警告数包含两个 Package 的结果');

console.log('== 菜单注册回归（MenuBar.Popup NRE） ==');
const rootMenu = csharpMock.FairyEditor.App.menu;
// 合同验证：根 MenuBar 拒绝无 Popup 的顶级项（旧实现的死因）
let rootNre = false;
try { rootMenu.AddItem('X', 'x', () => { }); } catch (e) { rootNre = true; }
assert(rootNre, 'mock 合同：根 MenuBar 注册非子菜单顶级项触发 Popup NRE');

const mainPath = path.join(__dirname, '..', 'dist', 'main.js');

// 第一次加载
const plugin1 = require(mainPath);
const rootItems = rootMenu._items;
assert(rootItems.has('fguiAssistantMain'), '顶级菜单已注册');
assert(rootItems.get('fguiAssistantMain').isSubMenu === true, '顶级菜单声明为子菜单容器（Popup 存在）');
const sub1 = rootMenu._submenus.get('fguiAssistantMain');
assert(sub1 && sub1._items.has('fguiAssistantOpen'), '子菜单包含「打开助手窗口」命令');
assert(sub1 && sub1._items.has('fguiAssistantScan'), '子菜单包含「检查当前组件」命令');
assert(sub1 && sub1._items.has('fguiAssistantSvnUpdate'), '子菜单包含「SVN 更新项目」命令');
assert(sub1 && sub1._items.has('fguiAssistantSvnCommit'), '子菜单包含「SVN 提交当前包」命令');
assert(sub1 && sub1._items.has('fguiAssistantEnv'), '子菜单包含「环境自检」命令');

// 正常卸载：菜单移除 + 监听全部解除
plugin1.onDestroy();
assert(!rootItems.has('fguiAssistantMain'), 'onDestroy 移除顶级菜单');
assert(editorEventLog.length === 0, 'onDestroy 解除全部事件监听');
assert(projectHandlers.opened.length === 0 && projectHandlers.closed.length === 0, 'onDestroy 解除项目事件监听');

// 正常 reload：先 destroy 再加载，仍只有 1 个顶级菜单
delete require.cache[require.resolve(mainPath)];
const plugin2 = require(mainPath);
assert(rootItems.size === 1 && rootItems.has('fguiAssistantMain'), '正常 reload 后顶级菜单仅 1 项');

// 异常 reload：旧实例未 destroy 直接再加载（模拟编辑器 JsEnv 重建），
// 插件靠加载时预清理避免重复项与悬空回调
delete require.cache[require.resolve(mainPath)];
const plugin3 = require(mainPath);
assert(rootItems.size === 1 && rootItems.has('fguiAssistantMain'), '异常 reload（未清理）后顶级菜单不重复');
const sub3 = rootMenu._submenus.get('fguiAssistantMain');
assert(sub3 && sub3._items.size === 5, '异常 reload 后子菜单命令不重复');

// 菜单命令回调可安全调用（不抛异常）
let invoked = true;
try { sub3.Invoke('fguiAssistantOpen'); } catch (e) { invoked = false; }
try { sub3.Invoke('fguiAssistantScan'); } catch (e) { invoked = false; }
try { sub3.Invoke('fguiAssistantSvnUpdate'); } catch (e) { invoked = false; }
try { sub3.Invoke('fguiAssistantSvnCommit'); } catch (e) { invoked = false; }
try { sub3.Invoke('fguiAssistantEnv'); } catch (e) { invoked = false; }
assert(invoked, '菜单命令回调可安全调用');

// 最终清理（含重复 destroy 的健壮性）
plugin3.onDestroy();
plugin2.onDestroy();
assert(!rootItems.has('fguiAssistantMain'), '最终卸载后顶级菜单已移除');
assert(editorEventLog.length === 0, '最终卸载后无残留事件监听');

console.log('== v0.2.0 Config 扩展 ==');
const partialV2 = {
    configVersion: CONFIG_VERSION,
    svn: {},
    resourceCheck: { maxImageKB: 256 }
};
fs.writeFileSync(path.join(tmpBase, 'plugins', 'FGUIAssistant', 'config.json'), JSON.stringify(partialV2));
Config.load();
assert(Config.config.configVersion === 2, 'CONFIG_VERSION 保持 2');
assert(Config.config.svn && Config.config.svn.tortoiseProcPath.indexOf('TortoiseProc.exe') >= 0, '缺失 svn 默认路径自动补齐');
assert(Config.config.resourceCheck && Config.config.resourceCheck.maxImageKB === 256, '用户自定义 maxImageKB 保留');
assert(Config.config.resourceCheck && Config.config.resourceCheck.checkDuplicate === true, '缺失 checkDuplicate 自动补默认 true');
Config.update(c => {
    const d = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    for (const k of Object.keys(d)) c[k] = d[k];
});

console.log('== 一键红点 XML 与规则联动 ==');
const { buildRedDotControllerXml, defaultRedDotControllerName } = dist('services', 'RedDotService.js');
const rdName = defaultRedDotControllerName(Config.config);
assert(rdName === 'C_HongDian', '默认红点控制器名包含 Controller 前缀 C_');
const rdXml = buildRedDotControllerXml(rdName, Config.config.redDot.pageOff, Config.config.redDot.pageOn);
assert(rdXml === '<controller name="C_HongDian" pages="0,,1," selected="0"/>', '生成与原生一致的红点控制器 XML');
const xmlWithGeneratedRd = `<?xml version="1.0" encoding="utf-8"?>
<component size="200,80">
  ${rdXml}
  <displayList/>
</component>`;
const rdModel = parseComponentXml(xmlWithGeneratedRd, pi);
const rdScan = Engine.runScan(rdModel);
assert(!rdScan.issues.some(i => i.ruleId === 'redDot'), '生成的红点 XML 通过 RedDotRule 检查');
assert(!rdScan.issues.some(i => i.ruleId === 'naming' && i.objectName === rdName), '生成的红点控制器名通过 NamingRule 检查');

console.log('== SVN 参数与单包路径 ==');
const { buildSvnArgs, getPackageFolderPath } = dist('services', 'SvnService.js');
const upArgs = buildSvnArgs('update', 'D:\\proj');
assert(upArgs[0] === '/command:update' && upArgs[1] === '/path:D:\\proj' && upArgs[2] === '/closeonend:0', 'SVN update 参数正确');
const pkgDir = getPackageFolderPath('D:\\proj\\', 'PkgA');
assert(pkgDir.endsWith('/assets/PkgA'), 'SVN commit 目标为单个包目录: ' + pkgDir);
const ciArgs = buildSvnArgs('commit', pkgDir);
assert(ciArgs[0] === '/command:commit' && ciArgs[1] === '/path:' + pkgDir, 'SVN commit 参数正确');

console.log('== 环境自检报告 ==');
const { formatEnvCheckReport } = dist('services', 'EnvCheck.js');
const report = formatEnvCheckReport([
    { name: '编辑器版本', ok: true, detail: '6.1.4' },
    { name: 'TortoiseSVN', ok: false, detail: '未找到' }
]);
assert(report.indexOf('1/2 通过') >= 0 && report.indexOf('✓ 编辑器版本') >= 0 && report.indexOf('✕ TortoiseSVN') >= 0, '环境自检报告格式化正确');

console.log('== 资源体检（ResourceAudit） ==');
const { parsePackageXml, collectComponentRefs, collectFontRefs, auditResources } = dist('services', 'ResourceAudit.js');
const pkgAXml = `<?xml version="1.0" encoding="utf-8"?>
<packageDescription id="pkgaaaaa">
  <resources>
    <component id="comp1" name="Main.xml" path="/" exported="true"/>
    <image id="imgUsed" name="used.png" path="/"/>
    <image id="imgUnused" name="unused.png" path="/"/>
    <image id="imgBig" name="big.png" path="/"/>
    <image id="imgDupA" name="dupA.png" path="/"/>
    <font id="fnt1" name="Num.fnt" path="/"/>
    <image id="imgGlyph" name="g0.png" path="/"/>
  </resources>
</packageDescription>`;
const pkgBXml = `<?xml version="1.0" encoding="utf-8"?>
<packageDescription id="pkgbbbbb">
  <resources>
    <image id="bUnexp" name="secret.png" path="/"/>
    <image id="bExp" name="shared.png" path="/" exported="true"/>
    <image id="bCrossUsed" name="cross.png" path="/"/>
    <image id="imgDupB" name="dupB.png" path="/"/>
  </resources>
</packageDescription>`;
const apA = parsePackageXml(pkgAXml, 'PkgA');
const apB = parsePackageXml(pkgBXml, 'PkgB');
assert(apA.id === 'pkgaaaaa' && apA.items.length === 7, 'parsePackageXml 解析 PkgA 成功');
assert(apB.id === 'pkgbbbbb' && apB.items.length === 4, 'parsePackageXml 解析 PkgB 成功');

const bigItem = apA.items.find(x => x.id === 'imgBig');
bigItem.sizeBytes = 600 * 1024;
apA.items.find(x => x.id === 'imgDupA').md5 = 'SAME_HASH';
apB.items.find(x => x.id === 'imgDupB').md5 = 'SAME_HASH';

const compAXml = `<component size="1280,720"><displayList>
  <image id="n1" name="a" src="imgUsed"/>
  <image id="n2" name="b" src="imgBig"/>
  <image id="n3" name="c" src="imgDupA"/>
  <image id="n4" name="d" src="bUnexp" pkg="pkgbbbbb"/>
  <image id="n5" name="e" src="bExp" pkg="pkgbbbbb"/>
  <loader id="n6" name="f" url="ui://pkgbbbbbbCrossUsed"/>
</displayList></component>`;
const fntAText = `char id=48 img=imgGlyph xoffset=0 yoffset=0 xadvance=10`;
const refsA = collectComponentRefs(compAXml, 'pkgaaaaa', 'PkgA', 'Main');
const refsFnt = collectFontRefs(fntAText, 'pkgaaaaa', 'PkgA', 'Num.fnt');
const allRefs = refsA.concat(refsFnt);
assert(refsA.some(r => r.toPkgId === 'pkgbbbbb' && r.toResId === 'bCrossUsed'), 'ui:// 跨包引用解析正确');
assert(refsFnt.some(r => r.toPkgId === 'pkgaaaaa' && r.toResId === 'imgGlyph'), '.fnt 位图字体图元引用解析正确');

const auditAll = auditResources([apA, apB], allRefs, { maxImageKB: 512, checkDuplicate: true });
assert(auditAll.some(i => i.kind === 'crossUnexported' && i.severity === 'error' && i.resName === 'secret.png'), '跨包引用未导出资源报 error');
assert(!auditAll.some(i => i.kind === 'crossUnexported' && i.resName === 'shared.png'), '跨包引用已导出资源不报错');
assert(auditAll.some(i => i.kind === 'unused' && i.severity === 'warning' && i.resName === 'unused.png'), '未使用图片报 warning');
assert(!auditAll.some(i => i.kind === 'unused' && i.resName === 'g0.png'), '.fnt 引用的图元不报未使用');
assert(!auditAll.some(i => i.kind === 'unused' && i.resName === 'Main.xml'), 'exported 组件不报未使用');
assert(auditAll.some(i => i.kind === 'largeImage' && i.resName === 'big.png'), '超大图片报 warning');
assert(auditAll.some(i => i.kind === 'duplicateImage' && i.severity === 'info'), 'MD5 重复图片报 info');

const auditScopeB = auditResources([apA, apB], allRefs, { scopePkgId: 'pkgbbbbb', maxImageKB: 512, checkDuplicate: true });
assert(!auditScopeB.some(i => i.kind === 'unused' && i.resName === 'cross.png'), '单包体检保留跨包引用，不误报未使用');

console.log(`\n结果: ${passed} 通过, ${failed} 失败`);
process.exit(failed > 0 ? 1 : 0);
