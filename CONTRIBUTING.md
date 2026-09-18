# 贡献指南

感谢你关注 FGUI Assistant！欢迎通过 Issue 和 Pull Request 参与贡献。

编码 Agent / 新贡献者先读仓库根目录 [AGENTS.md](AGENTS.md)（本地索引：命令、布局约束、不要改菜单注册、不要用官方 ScrollPane/GList.SetVirtual）。不要靠 GitHub 网页当说明书。

## 开发环境

- Node.js 16+（仅用于编译与测试，编辑器运行不需要 Node）
- FairyGUI Editor 2021.3+

```bash
git clone <你的仓库地址>
cd fgui-assistant
npm install
npm run build   # 编译 TypeScript 到 dist/
npm test        # Node 冒烟测试（不需要 FairyGUI）
```

## 提交代码

1. Fork 仓库并创建特性分支：
   ```bash
   git checkout -b feature/your-feature
   ```
2. 修改代码后确保通过编译与测试：
   ```bash
   npm run build
   npm test
   ```
3. 提交 Pull Request，并描述：
   - 改了什么、为什么改
   - 是否涉及行为变化
   - 在 FairyGUI Editor 中的实际验证情况

## 代码约定

- **只用公开 API**：不要依赖 undocumented / private API，不要修改 FairyGUI 本体。某功能无法可靠实现时，降级为提醒并在 README「已知限制」中说明。
- **安全优先**：所有编辑器交互（扫描、修复、UI 构建）必须有 try/catch，插件异常不能影响编辑器正常使用。
- **不要自动处理需要设计师判断的内容**（是否单选、是否拆合组件、是否修改公共资源等），这些只能提示。
- **规则不硬编码**：项目规范写入 `config.json` 配置系统，不写死在业务逻辑里。
- **性能**：不做每帧全量扫描；扫描按批次进行并带进度。
- 模块化：规则放 `src/rules/`，编辑器交互放 `src/services/`，界面放 `src/ui/`。
- **文档同步**：改用户可见行为时更新本仓库 `README.md` 与 `CHANGELOG.md`，不要只改 GitHub 描述。
- **插件窗口**：内容必须限制在 Viewport 内并纵向滚动；禁止用加高窗口掩盖溢出。

## 提交信息

使用简洁的中文或英文，说明意图，例如：

```text
修复 Package 扫描时未过滤分支组件的问题
```

## 报告问题

提交 Issue 时请附上：

- FairyGUI Editor 版本
- 插件版本（package.json 中的 version）
- 复现步骤
- 控制台中 `[FGUI助手]` 前缀的日志
