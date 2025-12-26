# show-notes README

这个VSCode扩展可以自动在代码文件中显示方法调用的文档注释，支持 Java、JavaScript 和 TypeScript，方便开发者快速了解代码功能。

## 功能特性

### 行尾注释显示

- ✅ **多语言支持**：支持 Java、JavaScript、TypeScript 文件
- ✅ **逐行扫描**：遍历文件的每一行，精确检测方法调用
- ✅ **多种调用模式**：支持实例方法调用（`object.method()`）、静态方法调用（`ClassName.method()`）、链式调用等
- ✅ **智能过滤**：自动跳过注释行、空行和控制结构关键字（if、for、while等）
- ✅ **文档注释提取**：从方法的 Javadoc/JSDoc 注释中提取第一行描述
- ✅ **行尾显示**：以注释的形式显示在代码行末尾
- ✅ **实时更新**：文档打开和修改时自动更新注释显示
- ✅ **完全可配置**：支持自定义注释前缀、颜色、字体样式和最大长度

## 使用方法

### 基本使用

1. 安装本扩展
2. 打开 `.java`、`.js` 或 `.ts` 文件
3. 扩展会自动检测方法调用并显示文档注释

**Java 示例：**

```java
public void testMethod() {
    int result = add(5, 3);        // 计算两个数字的和
    printWelcome();                // 打印欢迎消息
    String name = getUserName();   // 获取用户名称
}
```

**JavaScript/TypeScript 示例：**

```javascript
function processData() {
    const result = calculateSum(10, 20);  // 计算两个数字的总和
    displayMessage('Hello');               // 在控制台显示消息
    const user = fetchUser();              // 从API获取用户信息
}
```

### 配置选项

扩展提供以下可配置选项，可在 VS Code 设置中搜索 "Show Notes" 进行修改：

#### `showNotes.commentPrefix`

- **类型**：字符串
- **默认值**：`"//"`
- **说明**：行尾注释的前缀符号
- **示例**：设置为 `"#"` 或 `"--"` 等

#### `showNotes.maxLength`

- **类型**：数字
- **默认值**：`80`
- **范围**：20-200
- **说明**：注释显示的最大字符数，超过会自动截断并添加 `...`

#### `showNotes.commentColor`

- **类型**：字符串
- **默认值**：`"#6A9955"`
- **说明**：注释文字的颜色，支持十六进制颜色代码
- **示例**：`"#808080"`、`"#00FF00"` 等

#### `showNotes.fontStyle`

- **类型**：字符串
- **默认值**：`"italic"`
- **可选值**：`"normal"`, `"italic"`, `"oblique"`
- **说明**：注释文字的字体样式

### 配置示例

在 `settings.json` 中添加：

```json
{
  "showNotes.commentPrefix": "//",
  "showNotes.maxLength": 100,
  "showNotes.commentColor": "#808080",
  "showNotes.fontStyle": "italic"
}
```

## 系统要求

- **VSCode版本**：1.107.0 或更高
- **语言扩展**：
  - Java：需要安装 Java 语言支持扩展（如 Extension Pack for Java）
  - JavaScript/TypeScript：VS Code 内置支持
- **项目要求**：需要是有效的项目，以便语言服务器能够解析方法定义

## 技术实现

1. **激活时机**：当打开 Java、JavaScript 或 TypeScript 文件时自动激活
2. **监听事件**：监听文档打开和文档修改事件
3. **方法检测**：使用正则表达式匹配方法调用
4. **文档获取**：通过 `vscode.executeHoverProvider` 命令获取方法的悬停信息
5. **注释提取**：智能解析悬停信息，提取 Javadoc/JSDoc 的第一行描述
6. **装饰渲染**：使用 VSCode 的文本装饰 API 在行末显示注释
7. **配置读取**：动态读取用户配置，支持实时自定义样式

## 已知限制

- 每行只显示第一个方法调用的文档注释
- 注释长度超过配置的最大值会被截断并添加省略号
- 需要语言服务器正常工作才能获取文档信息
- 不会显示没有文档注释的方法的任何信息

## 发布说明

详见 [CHANGELOG.md](CHANGELOG.md)

## 反馈与贡献

如有问题或建议，欢迎提交 Issue 或 Pull Request。

---

**享受更清晰的代码阅读体验！** 🎉
