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
        FontUtil: { GetOSInstalledFontNames: () => ({ Count: 0, get_Item: () => null }) }
    },
    System: {
        IO: {
            File: {
                Exists: (p) => fs.existsSync(p),
                ReadAllText: (p) => fs.readFileSync(p, 'utf8'),
                WriteAllText: (p, c) => fs.writeFileSync(p, c, 'utf8')
            },
            Directory: {
                Exists: (p) => fs.existsSync(p),
                CreateDirectory: (p) => fs.mkdirSync(p, { recursive: true })
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

const { Config, DEFAULT_CONFIG } = dist('core', 'Config.js');
const { Store } = dist('core', 'Store.js');
const { Engine } = dist('core', 'RuleEngine.js');
const { getNamingType } = dist('rules', 'NamingRule.js');
const { parseComponentXml } = dist('services', 'ScanService.js');

console.log('== Config ==');
Config.load();
assert(Config.config.buttonScale === 0.98, '默认按钮缩放 0.98');
assert(Config.config.namingRules.Button === 'Btn_', 'Button 前缀 Btn_');
assert(fs.existsSync(path.join(tmpBase, 'plugins', 'FGUIAssistant', 'config.json')), '默认配置已写入项目插件目录');
fs.writeFileSync(path.join(tmpBase, 'plugins', 'FGUIAssistant', 'config.json'), JSON.stringify({ buttonScale: 0.95, namingRules: { Button: 'BtnX_' } }));
Config.load();
assert(Config.config.buttonScale === 0.95, '用户配置覆盖 buttonScale');
assert(Config.config.namingRules.Button === 'BtnX_', '用户配置覆盖命名规则');
assert(Config.config.namingRules.List === 'Lst_', '未覆盖项保留默认');
Config.update(c => { c.buttonScale = 0.98; c.namingRules.Button = 'Btn_'; });

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
    <text id="n2" name="Txt_Title" xy="100,50" size="200,40" font="三极拙楷简体" fontSize="30"/>
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
assert(byRule('naming').some(i => i.objectName === 'title2'), '命名: title2 缺少 Txt_ 前缀');
assert(byRule('naming').some(i => i.objectName === 'list1'), '命名: list1 缺少 Lst_ 前缀');
assert(!byRule('naming').some(i => i.objectName === 'Btn_Ok'), '命名: Btn_Ok 通过');
assert(byRule('naming').every(i => i.fixable === false), 'XML 扫描结果不可直接修复');
assert(byRule('buttonScale').some(i => i.objectName === 'button2'), '按钮缩放: button2 缩放为 1 报警');
assert(!byRule('buttonScale').some(i => i.objectName === 'Btn_Ok'), '按钮缩放: Btn_Ok 0.98 通过');
assert(byRule('textPivot').some(i => i.objectName === 'Txt_Title'), '文字轴心: Txt_Title 未居中报警');
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
assert(sub3 && sub3._items.size === 2, '异常 reload 后子菜单命令不重复');

// 菜单命令回调可安全调用（不抛异常）
let invoked = true;
try { sub3.Invoke('fguiAssistantOpen'); } catch (e) { invoked = false; }
try { sub3.Invoke('fguiAssistantScan'); } catch (e) { invoked = false; }
assert(invoked, '菜单命令回调可安全调用');

// 最终清理（含重复 destroy 的健壮性）
plugin3.onDestroy();
plugin2.onDestroy();
assert(!rootItems.has('fguiAssistantMain'), '最终卸载后顶级菜单已移除');
assert(editorEventLog.length === 0, '最终卸载后无残留事件监听');

console.log(`\n结果: ${passed} 通过, ${failed} 失败`);
process.exit(failed > 0 ? 1 : 0);
