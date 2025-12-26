// 'vscode' 模块包含 VS Code 扩展性 API
// 导入该模块并在代码中使用别名 vscode 引用它
import * as vscode from 'vscode';

let decorationType: vscode.TextEditorDecorationType;

export function activate(context: vscode.ExtensionContext) {
	console.log('Extension "show-notes" is now active!');
	vscode.window.showInformationMessage('Show Notes 扩展已激活！');

	// 创建用于行内注释的装饰类型
	decorationType = vscode.window.createTextEditorDecorationType({
		after: {
			contentText: '',
			color: 'grey',
			fontStyle: 'italic'
		}
	});

	// 支持的语言列表
	const supportedLanguages = ['java', 'javascript', 'typescript'];

	// 监听文档打开事件
	vscode.workspace.onDidOpenTextDocument(doc => {
		if (supportedLanguages.includes(doc.languageId)) {
			console.log(`${doc.languageId} document opened:`, doc.fileName);
			updateDecorations(doc);
		}
	}, null, context.subscriptions);

	// 监听文档修改事件
	vscode.workspace.onDidChangeTextDocument(event => {
		if (supportedLanguages.includes(event.document.languageId)) {
			console.log(`${event.document.languageId} document changed:`, event.document.fileName);
			updateDecorations(event.document);
		}
	}, null, context.subscriptions);

	// 为已打开的编辑器初始化装饰
	console.log('Initializing decorations for visible editors...');
	vscode.window.visibleTextEditors.forEach(editor => {
		if (supportedLanguages.includes(editor.document.languageId)) {
			console.log('Applying decorations to:', editor.document.fileName);
			updateDecorations(editor.document);
		}
	});
}

/**
 * 获取用户配置
 */
function getConfiguration() {
	const config = vscode.workspace.getConfiguration('showNotes');
	return {
		commentPrefix: config.get<string>('commentPrefix', '//'),
		maxLength: config.get<number>('maxLength', 80),
		commentColor: config.get<string>('commentColor', '#6A9955'),
		fontStyle: config.get<string>('fontStyle', 'italic')
	};
}

async function updateDecorations(document: vscode.TextDocument) {
	console.log(`[updateDecorations] Starting for ${document.fileName}, ${document.lineCount} lines`);
	const decorations: vscode.DecorationOptions[] = [];
	const lineCount = document.lineCount;

	// 获取用户配置
	const userConfig = getConfiguration();

	// 遍历文档的每一行
	for (let lineNum = 0; lineNum < lineCount; lineNum++) {
		const line = document.lineAt(lineNum);
		const lineText = line.text;

		// 跳过空行和注释行
		const trimmedLine = lineText.trim();
		if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
			continue;
		}

		// 匹配方法调用的多种模式
		// 1. 实例方法调用: object.method(
		// 2. 静态方法调用: ClassName.method(
		// 3. 链式调用: object.method1().method2(
		// 4. 直接方法调用: method(
		const methodCallRegex = /(\w+\.)?(\w+)\s*\(/g;
		let match;

		while ((match = methodCallRegex.exec(lineText)) !== null) {
			const methodName = match[2];
			const fullMatch = match[0];

			// 跳过常见的控制结构关键字
			if (['if', 'for', 'while', 'switch', 'catch'].includes(methodName)) {
				continue;
			}

			// 计算方法调用的位置
			const matchIndex = match.index + (match[1] ? match[1].length : 0);
			const position = new vscode.Position(lineNum, matchIndex);

			try {
				// 获取悬停信息（包含 Javadoc）
				const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
					'vscode.executeHoverProvider',
					document.uri,
					position
				);

				if (hovers && hovers.length > 0) {
					const javadocSummary = extractJavadocFirstLine(hovers[0], userConfig.maxLength);
					console.log(`[updateDecorations] Line ${lineNum}, method ${methodName}: javadoc = "${javadocSummary}"`);

					if (javadocSummary) {
						// 在行尾添加装饰
						const lineEnd = line.range.end;
						decorations.push({
							range: new vscode.Range(lineEnd, lineEnd),
							renderOptions: {
								after: {
									contentText: ` ${userConfig.commentPrefix} ${javadocSummary}`,
									color: userConfig.commentColor,
									fontStyle: userConfig.fontStyle,
									margin: '0 0 0 1em'
								}
							}
						});

						// 每行只添加一个装饰（找到的第一个方法调用）
						break;
					}
				} else {
					console.log(`[updateDecorations] Line ${lineNum}, method ${methodName}: no hover info`);
				}
			} catch (error) {
				// 忽略错误，继续处理下一个方法调用
				console.error(`Error processing method call at line ${lineNum}:`, error);
			}
		}
	}

	// 应用装饰
	console.log(`[updateDecorations] Found ${decorations.length} decorations to apply`);
	const editor = vscode.window.visibleTextEditors.find(e => e.document === document);
	if (editor) {
		console.log(`[updateDecorations] Applying decorations to editor`);
		editor.setDecorations(decorationType, decorations);
	} else {
		console.log(`[updateDecorations] No visible editor found for document`);
	}
}

/**
 * 从 Hover 信息中提取文档注释的第一行描述
 * 支持 Javadoc (Java)、JSDoc (JavaScript/TypeScript) 等格式
 * @param hover Hover 对象
 * @param maxLength 最大长度
 * @returns 文档注释的第一行描述，如果没有则返回空字符串
 */
function extractJavadocFirstLine(hover: vscode.Hover, maxLength: number = 80): string {
	let javadocText = '';

	// 收集所有 hover 内容
	hover.contents.forEach(content => {
		if (typeof content === 'string') {
			javadocText += content + '\n';
		} else if (content instanceof vscode.MarkdownString) {
			javadocText += content.value + '\n';
		}
	});

	if (!javadocText) {
		return '';
	}

	// 尝试从 markdown 代码块后提取文档注释
	// VSCode 的 hover 通常以代码块开始，文档注释在后面
	const lines = javadocText.split('\n');
	let foundJavadoc = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();

		// 跳过代码块标记
		if (line.startsWith('```')) {
			continue;
		}

		// 跳过空行
		if (!line) {
			continue;
		}

		// 跳过方法签名等技术信息（支持多种语言的关键字）
		if (line.includes('java') || line.includes('typescript') || line.includes('javascript') ||
			line.includes('public') || line.includes('private') || line.includes('protected') ||
			line.includes('static') || line.includes('void') || line.includes('return') ||
			line.includes('function') || line.includes('const') || line.includes('let') ||
			line.includes('var') || line.startsWith('@param') || line.startsWith('@returns') ||
			line.startsWith('@return') || line.startsWith('@type') || line.startsWith('@')) {
			continue;
		}

		// 清理 markdown 格式和文档注释特殊字符
		let cleaned = line
			.replace(/\*+/g, '')           // 移除星号
			.replace(/\/\*+/g, '')         // 移除 /*
			.replace(/\*+\//g, '')         // 移除 */
			.replace(/^[\s\-]+/g, '')      // 移除开头的空格和破折号
			.replace(/`/g, '')             // 移除反引号
			.replace(/<[^>]+>/g, '')       // 移除 HTML 标签
			.trim();

		// 如果清理后的行有内容且不是技术标记，这就是描述的第一行
		if (cleaned && cleaned.length > 0 && !cleaned.startsWith('---')) {
			// 限制长度，避免显示过长
			if (cleaned.length > maxLength) {
				cleaned = cleaned.substring(0, maxLength - 3) + '...';
			}
			return cleaned;
		}
	}

	return '';
}

export function deactivate() {
	if (decorationType) {
		decorationType.dispose();
	}
}
