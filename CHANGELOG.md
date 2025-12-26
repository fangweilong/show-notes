# Change Log

## [0.0.3] - 2025-12-26

### Breaking Changes

- 🔥 **移除了 Java 文件树视图功能**：不再在资源管理器中显示"Java Notes"面板
- 扩展现在专注于核心的行尾注释显示功能

### Added

- ✨ **多语言支持**：现在支持 JavaScript 和 TypeScript 文件，除了原有的 Java 支持
- ⚙️ **完全可配置**：新增四个配置选项，允许用户自定义注释显示样式
  - `showNotes.commentPrefix`：自定义注释前缀（默认：`//`）
  - `showNotes.maxLength`：自定义注释最大长度（默认：80，范围：20-200）
  - `showNotes.commentColor`：自定义注释颜色（默认：`#6A9955`）
  - `showNotes.fontStyle`：自定义字体样式（默认：`italic`，可选：normal/italic/oblique）

### Changed

- 📝 优化注释提取逻辑，支持 Javadoc（Java）和 JSDoc（JavaScript/TypeScript）格式
- 🎨 注释样式现在完全可通过配置自定义
- 📖 更新文档，详细说明新增的配置选项和多语言支持

### Removed

- ❌ 移除 `JavaTreeDataProvider` 及相关文件树视图功能
- ❌ 移除 `package-info.java` 解析功能
- ❌ 移除文件系统监听器（用于树视图刷新）
- ❌ 移除 "Refresh Java Notes" 命令

### Technical

- 重构 `activate()` 函数，简化扩展激活逻辑
- 新增 `getConfiguration()` 函数，动态读取用户配置
- 扩展 `extractJavadocFirstLine()` 函数，支持多语言关键字过滤
- 更新激活事件，添加 `onLanguage:javascript` 和 `onLanguage:typescript`
- 优化正则表达式，支持更多 JavaScript/TypeScript 语法模式

## [0.0.2] - 2025-12-26

### Added

- 🆕 新增Java文件树视图，在资源管理器中显示"Java Notes"面板
- 🆕 支持从`package-info.java`中提取包的Javadoc注释，显示在文件夹旁边
- 🆕 支持从`.java`文件中提取类的Javadoc注释，显示在文件名旁边
- 🆕 添加刷新按钮，可手动刷新Java Notes视图
- 🆕 自动监听Java文件的创建、删除和修改，实时更新显示

### Changed

- 优化Javadoc解析逻辑，智能提取注释的描述部分
- 注释显示长度限制为100字符，超出部分自动截断

### Technical

- 实现`JavaTreeDataProvider`类，提供自定义树数据
- 使用`vscode.workspace.createFileSystemWatcher`监听文件变化
- 在`package.json`中注册新的视图和命令
- 支持点击树节点直接打开对应文件

## [0.0.1] - 2025-12-26

### Added

- ✨ 逐行扫描Java文件，精确检测方法调用
- ✨ 支持多种方法调用模式：
  - 实例方法调用（`object.method()`）
  - 静态方法调用（`ClassName.method()`）
  - 链式调用（`object.method1().method2()`）
  - 直接方法调用（`method()`）
- ✨ 智能过滤控制结构关键字（if、for、while、switch、catch）
- ✨ 自动跳过注释行和空行
- ✨ 从Javadoc中智能提取第一行描述
- ✨ 在代码行末尾以灰色斜体显示Javadoc注释
- ✨ 实时响应文档打开和修改事件
- ✨ 自动清理Markdown格式和HTML标签
- ✨ 超长注释自动截断（最多80字符）

### Technical

- 使用VSCode的Hover Provider API获取方法文档
- 使用Text Decoration API实现行内注释显示
- 正则表达式模式：`(\w+\.)?(\w+)\s*\(`
- 监听文档事件：`onDidOpenTextDocument`、`onDidChangeTextDocument`

### Notes

- 需要安装Java语言支持扩展（如Extension Pack for Java）
- 每行只显示第一个方法调用的Javadoc
- 仅处理有Javadoc注释的方法
