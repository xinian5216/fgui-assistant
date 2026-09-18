# FGUI Assistant

[![CI](https://github.com/xinian5216/fgui-assistant/actions/workflows/ci.yml/badge.svg)](https://github.com/xinian5216/fgui-assistant/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.4-green.svg)](CHANGELOG.md)

FairyGUI Editor 项目辅助插件。目标不是炫技，而是把依赖人工记忆的 UI 规范变成可视化检查流程。

- 减少重复 UI 操作
- 自动检查项目规范
- 能安全修复的项目提供一键修复
- 需要设计师判断的项目只提示，不擅自修改

**版本：** 0.1.4  
**语言：** TypeScript  
**推荐编辑器：** FairyGUI Editor 2021.3 及以上（API 基于 2021.3.0 公开类型定义）

---

## 安装方法

1. 编译本仓库（或直接使用已编译的 `dist/`）：

```text
npm install
npm run build
```

2. 打包安装目录：

```text
npm run pack
```

输出目录：`release/FGUIAssistant/`

3. 把 `FGUIAssistant` 文件夹复制到 FairyGUI 插件目录之一：

| 位置 | 路径 |
|------|------|
| 项目插件（推荐，可随 SVN 共享） | `{FairyGUI 工程根目录}/plugins/FGUIAssistant/` |
| 用户插件 | 编辑器菜单 **插件 → 打开插件目录** |

4. 重启 FairyGUI Editor，或在插件管理中重新加载。

5. 入口：

- 检查器（Inspector）面板中的 **FGUI Assistant**
- 主菜单 **FGUI Assistant → 打开助手窗口**（打开独立窗口；子菜单还提供「检查当前组件」）

---

## 卸载方法

1. 关闭 FairyGUI Editor
2. 删除插件目录 `plugins/FGUIAssistant/`（用户插件目录或项目 `plugins/` 下）
3. 可选：删除项目中的配置文件 `{工程}/plugins/FGUIAssistant/config.json` 和 `local.json`

插件不会修改 FairyGUI 本体。卸载后编辑器恢复原状。

---

## 目录结构

```text
FGUIAssistant/
  package.json              插件清单
  icon.png
  dist/                     编译后的 JS（编辑器实际加载）
  src/                      TypeScript 源码
    main.ts                 入口：Inspector / 菜单 / 发布钩子
    Api.ts                  编辑器 API 安全封装
    core/
      Config.ts             统一配置 FGUIAssistantConfig
      Store.ts              忽略项 / 发布流程 / PS 清单本地状态
      Types.ts              扫描对象与问题模型
      RuleEngine.ts         规则引擎
    rules/                  各检查规则
    services/               选择、扫描、修复、字体
    ui/                     面板与各页签
      Layout.ts             布局常量、滚动几何
      Scroll.ts             Viewport 裁剪 / 纵向滚动 / 虚拟列表
      MainPanel.ts          TabBar + ContentViewport
      FloatingWindow.ts     独立窗口（可缩放）
      pages/                各页签
  typings/                  FairyGUI Editor / PuerTS 类型定义
  test/                     规则与配置的 Node 冒烟测试
  config.json               安装后由插件在项目 plugins 目录自动生成
```

---

## 支持的 FairyGUI Editor 版本

| 版本 | 状态 |
|------|------|
| 2021.3.0 及更新的 2021.x / 2022.x | 目标版本，按公开 API 实现 |
| 2020.3+ | 大部分功能可用；个别 API 缺失时该功能会降级为提示 |
| 更早版本 | 未测试，不保证加载 |

插件在初始化、扫描、修复、UI 构建处均有 try/catch，异常不应导致编辑器无法继续编辑。

---

## 功能介绍

主面板页签：

| 页签 | 作用 |
|------|------|
| 首页 | 当前 Package/组件、公共资源横幅、最近检查摘要（最多 5 条）、查看全部问题、一键修复安全项 |
| 规范检查 | 检查当前组件 / 当前 Package / 整个项目（分批 + 进度）；顶部筛选固定，结果列表在 Viewport 内虚拟滚动 |
| 快速设置 | 对当前选中对象批量：按钮缩放、设为单选、文字轴心、常用字体 |
| 命名助手 | 显示类型与前缀，加前缀 / 应用名称，扫描命名异常 |
| 布局模板 | 把选中对象保存为标准位置，之后应用到其他页面 |
| 红点 | 检查红点 Controller 的 0/1 页与默认页，测试切换 |
| 发布 | 发布工作流清单 + 发布路径回填 |
| PS 清单 | 设计稿人工核对清单（按组件绑定） |
| 设置 | 按钮缩放、字体、受保护 Package、命名规则；内容区滚动，底部「重新加载 / 恢复默认 / 保存」固定 |

---

## 规则说明

### 安全自动修复（可一键处理）

| 规则 | 条件 | 修复 |
|------|------|------|
| 命名前缀 | 对象名缺少配置的类型前缀 | 在现有名称前加上前缀，**不转拼音** |
| 按钮缩放 | Button 按下效果不是 `scale` 或值不是标准值 | `downEffect=scale`，值为配置项（默认 0.98） |
| 文字轴心 | Text / RichText / InputText 轴心不是中心 | pivot=(0.5,0.5) 且作为锚点 |
| 布局模板 | 对象名匹配已保存模板且位置不一致 | 应用模板的 x/y（可选宽高、轴心） |

修复走 `docElement.SetProperty` / `SetExtensionProperty`，尽量进入 FairyGUI Undo。

### 只提示、不自动改

| 规则 | 说明 |
|------|------|
| 单选按钮 | 快速设置提供「设为单选按钮」，检查器不会自动改 mode |
| 红点 Controller | 检查 0/1 页、默认页；不自动创建 Controller |
| 屏幕适配 | 仅当组件名在 `mainComponentNames`（默认 `Main`）时检查；无法可靠改设置则只提醒 |
| 公共资源 | 受保护 Package 显示横幅与警告，需用户确认 |
| Main 简化 | 嵌套过深或过小的子组件给出建议，不移动节点 |
| PS 特效 | 人工 Checklist |
| 是否拆/合组件、改架构 | 不处理 |

### 命名规则默认值

```text
Text        → Tex_
Image       → Img_
Button      → Btn_
List        → Lst_
ProgressBar → Bar_
ComboBox    → Box_
Loader      → Lod_
Component   → Com_
Controller  → C_
```

插件只检查类型前缀是否匹配，不判断后半段语义。例如 `Btn_Back`、`Tex_Title`、`C_Select`。

---

## 配置方法

首次打开带插件的 FairyGUI 工程后，会生成：

```text
{工程根目录}/plugins/FGUIAssistant/config.json
```

主要字段：

```json
{
  "buttonScale": 0.98,
  "namingRules": { "Text": "Tex_", "Button": "Btn_", "Loader": "Lod_", "Controller": "C_" },
  "fonts": ["三极拙楷简体", "方正北魏楷书简体", "方正大标宋简体"],
  "protectedPackages": ["Common"],
  "layoutPresets": [],
  "redDot": {
    "controllerNamePattern": "HongDian",
    "objectNamePattern": "HongDian",
    "pageOff": "0",
    "pageOn": "1"
  },
  "screenAdapt": { "mainComponentNames": ["Main"] },
  "mainComplexity": { "enabled": true, "maxDepth": 3, "smallComponentChildCount": 2 },
  "publishChecklist": [],
  "psChecklist": []
}
```

也可在插件 **设置** 页修改。换项目时只需改配置，不必改代码。

本地状态（忽略项、发布勾选、PS 清单）存在同目录 `local.json`，**不要写入业务 Package**。建议 SVN 忽略 `local.json`，共享 `config.json`。

忽略机制：

- **本次忽略**：当前插件会话有效，重载插件后失效
- **永久忽略**：写入 `local.json`，可在检查页清除

---

## 已知限制

以下能力因公开 API 无法可靠实现，已降级，**没有使用私有 API 或修改编辑器本体**：

1. **不自动创建红点 Controller**  
   创建涉及 gearDisplay 绑定，容易生成错误结构。第一版只做检查 + 测试切换。

2. **屏幕适配不能一键写入**  
   项目级 Adaptation 设置可读性因版本而异；组件级「全屏」属性在公开 API 中不稳定。Main 组件仅提醒，提供「定位设置」说明。

3. **不能自动触发 FairyGUI 发布 / Unity Ctrl+R / 虚拟构建 / SVN**  
   发布页中除「发布路径」（由 `onPublish` 回填）外均为人工确认项。不会假装插件完成了它无法验证的步骤。

4. **布局模板不自动应用 Relation**  
   第一版保存并应用 x/y/宽高/轴心。Relation 请在编辑器中确认。

5. **控制器重命名**  
   命名规则会检查 `C_` 前缀，但不自动改控制器名（避免破坏绑定）。

6. **Package / 全项目扫描为只读 XML 扫描**
   未打开的组件通过解析 XML 检查，不能直接修复。请先「定位」打开组件，再对当前组件修复。Package 与整个项目扫描按组件分批执行（每个组件之间让出一帧），带进度显示，尽量避免卡顿；超大项目扫描期间建议避免高频编辑操作。

7. **插件 UI 为运行时代码绘制**  
   未附带 FairyGUI 发布包（`fui.bytes`）。程序化 UI 无法使用官方 `ScrollPane.Setup` / `GList.SetVirtual`（需要包资源）。0.1.2 起用 `clipRect` + 自研纵向 `VScroll` / 规范页虚拟列表，内容不得画出窗口；不要用加高窗口代替裁剪。

8. **字体检测**  
   通过 `FontUtil.GetOSInstalledFontNames` 与项目内 font 资源判断。未找到时提示，不报致命错误，仍允许应用。

---

## 开发调试方法

环境：Node.js 16+（仅用于编译测试，编辑器运行不需要 Node）。给编码 Agent 的本地索引见 [AGENTS.md](AGENTS.md)。

```text
npm install
npm run build
npm test
npm run watch          # 改源码后自动编译
```

调试流程：

1. 将仓库或 `release/FGUIAssistant` 放到 FairyGUI `plugins/` 目录
2. `npm run watch`
3. 在编辑器中卸载再加载插件，或重启编辑器
4. 控制台过滤 `[FGUI助手]`

建议验证：

- 插件可安装、可卸载、可重载
- 没选对象 / 选错类型 / 多选不报错
- 切换 Package、切换组件正常
- 扫描不修改资源
- 修复只改目标属性，Undo 可用
- 中文名称、中文字体名称正常
- 对象很多时主动扫描，不卡编辑器

---

## 测试

```text
npm test
```

对配置合并、XML 解析、命名 / 按钮缩放 / 轴心 / 红点 / 公共资源 / 忽略 / 布局模板 / 全项目扫描 / 菜单注册层 / 窗口布局与虚拟列表数学 / 滚轮方向做 Node 冒烟测试（当前 105 项，不启动 FairyGUI）。

实际编辑器内测试仍需在 FairyGUI 中完成。

### Editor Integration Test（手工回归）

以下场景无法在 Node 环境模拟，每次发版前请在真实 FairyGUI Editor 中手工验证：

1. 启动 FairyGUI，无异常、无 NRE
2. 点击主菜单 **FGUI Assistant → 打开助手窗口**，无 `MenuBar.Popup` NullReferenceException
3. 连续打开 / 关闭插件窗口 20 次，无异常
4. 点击其他顶部菜单（File / Edit / Resources 等）不受影响
5. 插件 reload：菜单不重复（只有一个 FGUI Assistant）
6. 切换项目：无旧对象遗留
7. 关闭再启动 FairyGUI：正常
8. Inspector 面板仍正常显示与刷新
9. 打开助手窗口：内容不溢出到编辑器、窗外无透明穿透
10. 规范检查在大量结果（如 300+ 警告）下只在窗口内滚动，滚轮向下编号变大且 thumb 向下、向上则相反，窗口高度不随结果条数增长
11. 设置页内容可滚动，底部三个按钮始终可见
12. 拖动窗口右下角缩放后，Tab / 内容区 / 底栏仍对齐，无控件飘出
13. 右上角关闭按钮可见 ×（非整块红），点击整块区域关闭窗口

> 历史问题：0.1.0 曾因用 3 参 `AddItem` 在根 MenuBar 注册无子菜单的顶级项，导致点击菜单时 `MenuBar.Popup` 抛 NullReferenceException，0.1.1 已修复。0.1.1 窗口曾因未裁剪 Viewport、规范页用 `y += height` 堆叠全部结果，导致透明溢出，0.1.2 已用 clip + 滚动修复。0.1.2 滚轮方向与官方 ScrollPane 相反、关闭按钮因缺字只显示红块，0.1.3 已修。

推送与 PR 会自动运行 GitHub Actions（编译 + 测试），见 `.github/workflows/ci.yml`。

---

## 许可

- 本插件代码以 [MIT License](LICENSE) 发布。
- `typings/editor.d.ts` 等类型定义来自 FairyGUI Editor 官方插件 SDK，仅用于插件开发的类型提示，版权归 FairyGUI 所有。
- FairyGUI 与 FairyGUI Editor 是 [FairyGUI](https://www.fairygui.com/) 的产品，本插件为独立第三方插件，与官方无关联。
