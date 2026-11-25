# Agent Index

给编码 Agent 的本地索引。先读本文件，不要为了了解本仓库去 GitHub、克隆历史或翻 FairyGUI-unity 源码。

## 这是什么

FairyGUI Editor 插件（TypeScript → `dist/`）。编辑器加载 `dist/main.js`。目标：把 UI 规范变成检查/安全修复，不擅自改需要设计师判断的内容。

当前版本见 `package.json`（0.2.0）。公开类型以 `typings/editor.d.ts` 为准，不要猜未导出 API。

## 命令

```text
npm run build    # tsc
npm test         # node test/run-tests.js（不启动 FairyGUI）
npm run watch
npm run pack     # 输出 release/FGUIAssistant/
```

没有独立 lint。类型检查就是 `tsc`。不要为了「验证」去 GitHub Actions 上看结果；本地 `npm test` 即可。

## 不要做

- 不要改 `src/main.ts` 里菜单注册（0.1.1：根 MenuBar 必须 5 参 `AddItem(..., isSubMenu=true)`，3 参会 `MenuBar.Popup` NRE）。
- 不要对程序化 UI 使用 `GComponent.overflow` / 官方 `ScrollPane.Setup` / `GList.SetVirtual`（需要包资源和 ByteBuffer，插件环境不可用）。裁剪用 `applyClip`（`clipRect` + 尽量 Overflow Hidden）。
- 不要用私有 API，不要改 FairyGUI 本体。
- 不要把溢出「修」成加高窗口。必须走 Viewport clip + 纵向滚动。
- 不要改 RuleEngine / 规则语义 / 配置格式，除非任务明确要求。
- 不要提交密钥。不要在未要求时 commit / push / 开 Issue / 开 PR。
- 不要为回答本仓库问题去 fetch GitHub README；仓库里已有 README / CHANGELOG / 本文件。

## 布局系统（必读）

```text
FloatingWindow Root（opaque + clip，背景随窗口拉伸）
├── Header（标题 / 关闭，不滚动）
├── MainPanel
│   ├── TabBar（固定，可换行）
│   └── ContentViewport（clip，占剩余空间）
│       ├── VScroll → PageContent     默认页
│       └── Footer                    设置 / 发布固定底栏
```

- 公共滚动：`src/ui/Scroll.ts` 的 `VScroll`（仅纵向，内容不够不显示条；滚轮 / 拖条 / PageUp·PageDown）。滚轮：FairyGUI `mouseWheelDelta` 向下为正，必须 `pos += delta * step`（与官方 ScrollPane 一致），不要 `pos -= delta`。
- 关闭按钮：不要用 `GTextField` 画 `✕`（编辑器字体常缺字只剩红块）。用两条旋转 `GGraph` 细线。
- 规范页：`manageLayout`，固定头 + `VirtualList`（只渲染可见附近 Item）。不要再 `y += height` 把几百条塞进普通 GComponent。
- 首页最近问题最多 `LAYOUT.HOME_MAX_ISSUES`（5）条，其余走「查看全部问题」。
- 常量与滚动数学：`src/ui/Layout.ts`。窗口最小/默认尺寸由控件推算，禁止散落魔法宽高。
- 独立窗口可拖右下角缩放；Inspector 用 `onSizeChanged`。

## 目录

| 路径 | 职责 |
|------|------|
| `src/main.ts` | 入口、Inspector、菜单、onPublish |
| `src/Api.ts` | 编辑器 API 安全封装 |
| `src/core/` | Config / Store / RuleEngine / Types |
| `src/rules/` | 检查规则 |
| `src/services/` | 扫描、修复、字体、编辑器对象、环境自检、红点创建、SVN、资源体检 |
| `src/ui/Layout.ts` | 布局常量、滚动几何 |
| `src/ui/Scroll.ts` | clip / VScroll / VirtualList |
| `src/ui/MainPanel.ts` | Tab + Viewport |
| `src/ui/FloatingWindow.ts` | 独立窗口 |
| `src/ui/pages/` | 各页签 |
| `typings/editor.d.ts` | 唯一 API 依据 |
| `test/run-tests.js` | Node 冒烟（含 MenuBar 合同 + 布局数学） |

## 测试

`test/run-tests.js` 当前 **132** 项：配置、XML、规则、忽略、全项目扫描、MenuBar NRE 回归、布局/虚拟列表数学、滚轮方向、一键红点、SVN 参数、环境自检、资源体检。

改 UI 后至少跑 `npm test`。无法在 Node 里测真实 clipRect / 滚轮，发版前需 FairyGUI 实机（见 README「Editor Integration Test」）。

## GitHub

- 远程：`https://github.com/xinian5216/fgui-assistant.git`（仅发布/PR 时用）。
- CI：`.github/workflows/ci.yml`，push/PR 到 main 时 `build` + `test`；**纯文档（`*.md` / LICENSE）变更不应触发 CI**。
- 不要靠 GitHub 网页当项目说明书；改功能时同步本仓库 `README.md` 与 `CHANGELOG.md`。
