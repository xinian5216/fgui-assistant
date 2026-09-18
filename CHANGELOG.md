# Changelog

## 0.1.4 — 2026-09-18

### 修复

- **默认命名规范与真实项目不一致**：`Text` 默认 `Txt_` 改为 `Tex_`，`Loader` 默认 `Ldr_` 改为 `Lod_`；补充 `ProgressBar → Bar_`、`ComboBox → Box_`。
- 旧 `config.json` 中仍等于旧默认值的项自动迁移；用户自定义前缀保留；缺失规则补默认。增加 `configVersion`，避免重复覆盖。
- 「恢复默认」与设置页顺序同步为新规范。建议名只补前缀、不改原名主体。

### 测试

- 新增默认前缀表、旧默认迁移、自定义不覆盖、缺失补齐、`configVersion` 保护。合计 105 项。

## 0.1.3 — 2026-09-18

### 修复

- **滚轮方向反了**：FairyGUI `mouseWheelDelta` 来自 Unity `Event.delta.y`（向下为正），官方 ScrollPane 是 `posY += step * delta`。0.1.2 写成了 `pos -= delta`，已改为 `pos += wheelToScrollDelta(delta)`。滚动条 thumb 与虚拟列表 `visibleStartIndex` 仍由同一 `pos` 驱动。
- **关闭按钮只有红块没有 ×**：程序化 `GTextField` 使用 `✕`，编辑器默认字体无该字形。改为两条旋转 `GGraph` 细线绘制 ×，不依赖字体；整块可点，带 hover / pressed。

### 测试

- 新增滚轮 delta → scrollOffset / visibleStartIndex 方向测试。当时合计 78 项。

## 0.1.2 — 2026-09-18

### 修复

- **插件窗口透明溢出**：页面内容超过窗口后仍绘制在编辑器上，窗外背景透明。
  - 根因：程序化 `GComponent` 没有可用的 overflow/ScrollPane；规范页用 `y += height` 把全部检查结果加入普通容器；背景图只覆盖初始高度。
  - 修复：统一 Root / Header / TabBar / ContentViewport；Viewport `clipRect` 裁剪；公共纵向 `VScroll`（内容不够不显示条）；规范页固定头 + 虚拟列表（只渲染可见附近 Item）；设置/发布底栏固定；独立窗口可缩放，背景随窗口拉伸。

### 测试

- 新增布局/滚动/虚拟列表数学测试（最小窗口、Viewport 高度、366/1000 条结果只渲染可见区、无条时不显示滚动条）。当时合计 74 项。

## 0.1.1 — 2026-09-18

### 修复

- **主菜单 NullReferenceException**：点击主菜单「FGUI Assistant」时 `FairyEditor.Component.MenuBar.Popup` 抛空引用异常。
  - 根因：原实现使用 `App.menu.AddItem` 的 3 参重载在根 MenuBar 上注册了「点击即执行」的命令型顶级项（无子菜单 / 无 Popup）。编辑器的 MenuBar 点击顶级项时固定执行 `MenuBar.Popup(item)` 读取该项关联的 Popup，读不到即抛 NullReferenceException。
  - 修复：改用官方 5 参重载 `AddItem(caption, name, atIndex, isSubMenu=true, callback)` 把顶级项声明为子菜单容器，再用 `GetSubMenu` 注册命令：
    - `FGUI Assistant → 打开助手窗口`
    - `FGUI Assistant → 检查当前组件`
  - 加载时预清理同名菜单项，插件 reload（含异常 reload / 未触发 onDestroy 的场景）不再重复注册或遗留指向已销毁 JS 环境的悬空回调。
  - 卸载时同时移除子菜单命令与顶级菜单。

### 测试

- 新增菜单注册层回归测试（Node 模拟 MenuBar 合同）：根菜单拒绝无 Popup 的顶级项（对应本次 NRE）、reload 不重复注册、`onDestroy` 后无残留菜单与事件监听。当时合计 58 项测试。

## 0.1.0 — 2026-09-17

第一版。面向公司 FairyGUI 项目生产环境。

### 已实现

- 插件加载 / 卸载 / Inspector 面板 / 主菜单独立窗口
- 统一配置 `config.json`（命名规则、按钮缩放、字体、受保护 Package、布局模板、红点、发布与 PS 清单）
- 当前组件实时扫描 + 当前 Package XML 扫描 + 整个项目扫描（按组件分批 + 进度显示，避免卡编辑器）
- 命名规范检查与命名助手（加前缀，不转拼音）
- Button 按下缩放检查与修复（默认 0.98），支持当前组件一键修复
- 文字轴心居中检查与修复
- 常用字体快捷应用（字体不存在时提示）
- 快速设置：缩放、单选按钮、轴心、字体
- 问题定位（打开组件并选中对象）
- 安全项一键修复（走 Undo）
- 本次忽略 / 永久忽略
- 布局模板：从选中对象保存 / 应用到其他页面
- 红点 Controller 检查与 0/1 测试切换（不自动创建）
- 公共资源 Package 横幅与发布前提醒
- 屏幕适配：Main 组件提醒（无法可靠写入则不自动改）
- Main 结构复杂度建议（不自动重构）
- 发布工作流人工确认项 + `onPublish` 回填发布路径
- PS 设计稿核对清单（按组件绑定，存插件本地状态）

### 已知限制

见 README「已知限制」。
