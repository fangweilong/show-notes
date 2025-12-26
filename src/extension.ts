// 'vscode' 模块包含 VS Code 扩展性 API
// 导入该模块并在代码中使用别名 vscode 引用它
import * as vscode from 'vscode';

let decorationType: vscode.TextEditorDecorationType | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;

// 用于跟踪每个文档的处理状态
const processingTasks = new Map<string, AbortController>();

// 缓存每个文档的装饰结果
const decorationsCache = new Map<string, vscode.DecorationOptions[]>();

// 支持的语言列表
const supportedLanguages = ['java', 'javascript', 'typescript'];

// 标记是否已初始化
let isInitialized = false;

/**
 * 懒加载初始化资源
 */
function ensureInitialized(context: vscode.ExtensionContext) {
	if (isInitialized) {
		return;
	}

	console.log('正在初始化 Show Notes 资源...');

	// 创建用于行内注释的装饰类型
	decorationType = vscode.window.createTextEditorDecorationType({
		after: {
			contentText: '',
			color: 'grey',
			fontStyle: 'italic'
		}
	});

	// 创建状态栏项
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	statusBarItem.text = "$(sync~spin) Show Notes";
	context.subscriptions.push(statusBarItem);

	isInitialized = true;
	console.log('Show Notes 资源初始化完成');
}

export function activate(context: vscode.ExtensionContext) {
	console.log('扩展 "show-notes" 已激活！');

	// 注册手动刷新命令
	const refreshCommand = vscode.commands.registerCommand('show-notes.refresh', () => {
		const editor = vscode.window.activeTextEditor;
		if (editor && supportedLanguages.includes(editor.document.languageId)) {
			console.log('[手动刷新] 开始刷新当前编辑器');
			ensureInitialized(context);
			// 清除当前文档的缓存，强制重新加载
			const docKey = editor.document.uri.toString();
			decorationsCache.delete(docKey);
			updateDecorationsAsync(editor.document, context);
		} else {
			vscode.window.showInformationMessage('当前文件不是支持的语言类型');
		}
	});
	context.subscriptions.push(refreshCommand);

	// 监听文档打开事件 - 懒加载
	vscode.workspace.onDidOpenTextDocument(doc => {
		if (supportedLanguages.includes(doc.languageId)) {
			ensureInitialized(context);
			console.log(`[文档打开] ${doc.languageId} 文档:`, doc.fileName);
			// 注意：文档打开时不一定有对应的编辑器，所以在这里不处理
			// 等待 onDidChangeActiveTextEditor 触发时再处理
		}
	}, null, context.subscriptions);

	// 监听文档修改事件 - 添加防抖
	let changeTimeout: NodeJS.Timeout | undefined;
	vscode.workspace.onDidChangeTextDocument(event => {
		if (supportedLanguages.includes(event.document.languageId)) {
			ensureInitialized(context);
			console.log(`${event.document.languageId} 文档已修改:`, event.document.fileName);

			// 取消当前文档的处理任务
			const docKey = event.document.uri.toString();
			const controller = processingTasks.get(docKey);
			if (controller) {
				controller.abort();
			}

			// 防抖：延迟500ms后再处理
			if (changeTimeout) {
				clearTimeout(changeTimeout);
			}
			changeTimeout = setTimeout(() => {
				updateDecorationsAsync(event.document, context);
			}, 500);
		}
	}, null, context.subscriptions);

	// 监听活动编辑器切换（这是最重要的事件）
	vscode.window.onDidChangeActiveTextEditor(async editor => {
		if (!editor) {
			console.log(`[编辑器切换] 编辑器为空`);
			return;
		}

		console.log(`[编辑器切换] 切换到: ${editor.document.fileName}, 语言: ${editor.document.languageId}`);

		if (supportedLanguages.includes(editor.document.languageId)) {
			ensureInitialized(context);
			const docKey = editor.document.uri.toString();

			console.log(`[编辑器切换] docKey: ${docKey}`);
			console.log(`[编辑器切换] 装饰类型是否存在: ${!!decorationType}`);
			console.log(`[编辑器切换] 缓存是否存在: ${decorationsCache.has(docKey)}`);
			console.log(`[编辑器切换] 当前缓存的文档数量: ${decorationsCache.size}`);

			// 如果有缓存，立即应用；否则异步加载
			if (decorationsCache.has(docKey) && decorationType) {
				const cachedDecorations = decorationsCache.get(docKey)!;
				console.log(`[编辑器切换] 从缓存恢复 ${cachedDecorations.length} 个装饰`);
				editor.setDecorations(decorationType, cachedDecorations);
				console.log(`[编辑器切换] 装饰已应用到编辑器`);
			} else {
				console.log(`[编辑器切换] 无缓存，开始异步加载`);
				await updateDecorationsAsync(editor.document, context);
			}
		} else {
			console.log(`[编辑器切换] 不支持的语言类型: ${editor.document.languageId}`);
		}
	}, null, context.subscriptions);

	// 监听文档关闭事件 - 清除缓存
	vscode.workspace.onDidCloseTextDocument(doc => {
		const docKey = doc.uri.toString();
		if (decorationsCache.has(docKey)) {
			decorationsCache.delete(docKey);
			console.log(`[文档关闭] 已清除缓存:`, doc.fileName);
		}
		// 同时清理处理任务
		const controller = processingTasks.get(docKey);
		if (controller) {
			controller.abort();
			processingTasks.delete(docKey);
		}
	}, null, context.subscriptions);

	// 检查是否有已打开的支持语言的编辑器
	const hasSupportedEditor = vscode.window.visibleTextEditors.some(
		editor => supportedLanguages.includes(editor.document.languageId)
	);

	// 只在有支持的编辑器时才初始化
	if (hasSupportedEditor) {
		ensureInitialized(context);
		console.log('正在为可见编辑器初始化装饰...');
		vscode.window.visibleTextEditors.forEach(editor => {
			if (supportedLanguages.includes(editor.document.languageId)) {
				console.log('正在应用装饰到:', editor.document.fileName);
				updateDecorationsAsync(editor.document, context);
			}
		});
	} else {
		console.log('未检测到支持的语言文件，等待打开文档时再初始化');
	}
}

/**
 * 异步更新装饰，支持取消和进度显示
 */
async function updateDecorationsAsync(document: vscode.TextDocument, context: vscode.ExtensionContext) {
	ensureInitialized(context);
	const docKey = document.uri.toString();

	// 取消之前的处理任务
	const oldController = processingTasks.get(docKey);
	if (oldController) {
		oldController.abort();
	}

	// 创建新的 AbortController
	const controller = new AbortController();
	processingTasks.set(docKey, controller);

	try {
		await updateDecorations(document, controller.signal);
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			console.log(`[异步更新装饰] 已取消处理文档: ${document.fileName}`);
		} else {
			console.error(`[异步更新装饰] 处理文档时出错 ${document.fileName}:`, error);
		}
	} finally {
		// 清理
		if (processingTasks.get(docKey) === controller) {
			processingTasks.delete(docKey);
		}
	}
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

/**
 * 等待语言服务器准备就绪
 * 使用指数退避策略，累计最多等待1分钟
 */
async function waitForLanguageServer(document: vscode.TextDocument): Promise<boolean> {
	console.log(`[等待语言服务器] 开始检测...`);
	
	const maxTotalWaitTime = 60000; // 最多等待60秒
	let totalWaitTime = 0;
	let retryCount = 0;
	
	while (totalWaitTime < maxTotalWaitTime) {
		try {
			// 尝试获取文档中某个位置的 hover，检测服务器是否有数据
			for (let lineNum = 0; lineNum < Math.min(document.lineCount, 20); lineNum++) {
				const line = document.lineAt(lineNum);
				const methodMatch = line.text.match(/(\w+)\s*\(/);
				if (methodMatch) {
					const position = new vscode.Position(lineNum, line.text.indexOf(methodMatch[1]));
					const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
						'vscode.executeHoverProvider',
						document.uri,
						position
					);
					
					// 检查是否有实际内容
					if (hovers && hovers.length > 0 && hovers[0].contents.length > 0) {
						console.log(`[等待语言服务器] 第 ${retryCount + 1} 次尝试成功，总等待时间: ${totalWaitTime}ms`);
						return true;
					}
				}
			}
		} catch (error) {
			console.log(`[等待语言服务器] 第 ${retryCount + 1} 次检测出错:`, error);
		}
		
		// 指数退避：200ms, 400ms, 800ms, 1600ms, 最大2000ms
		const delay = Math.min(200 * Math.pow(2, retryCount), 2000);
		console.log(`[等待语言服务器] 第 ${retryCount + 1} 次检测未就绪，等待 ${delay}ms 后重试（已等待: ${totalWaitTime}ms）`);
		
		await new Promise(resolve => setTimeout(resolve, delay));
		totalWaitTime += delay;
		retryCount++;
	}
	
	console.log(`[等待语言服务器] 达到最大等待时间 (${maxTotalWaitTime}ms)，继续处理`);
	return false;
}

async function updateDecorations(document: vscode.TextDocument, signal?: AbortSignal) {
	if (!decorationType || !statusBarItem) {
		console.error('[更新装饰] 资源未初始化');
		return;
	}

	// 使用局部变量避免 TypeScript 类型检查问题
	const currentDecorationType = decorationType;
	const currentStatusBarItem = statusBarItem;

	const startTime = Date.now();
	console.log(`[更新装饰] 开始处理 ${document.fileName}, 共 ${document.lineCount} 行`);

	// 等待语言服务器准备就绪
	await waitForLanguageServer(document);

	if (signal?.aborted) {
		console.log(`[更新装饰] 已取消`);
		return;
	}

	const lineCount = document.lineCount;
	const userConfig = getConfiguration();

	// 更新状态栏
	currentStatusBarItem.text = `$(sync~spin) Show Notes: 0/${lineCount}`;
	currentStatusBarItem.tooltip = `正在处理: ${document.fileName}`;
	currentStatusBarItem.show();

	// 存储所有行的处理 Promise
	const lineProcessingPromises: Promise<vscode.DecorationOptions | null>[] = [];

	// 为每一行创建异步处理任务
	for (let lineNum = 0; lineNum < lineCount; lineNum++) {
		// 检查是否已取消
		if (signal?.aborted) {
			throw new Error('AbortError');
		}

		lineProcessingPromises.push(processLine(document, lineNum, userConfig, signal));
	}

	// 使用 Promise.allSettled 并发处理所有行，同时收集结果
	const decorations: vscode.DecorationOptions[] = [];
	let completedCount = 0;

	// 分批处理以避免一次性创建太多 Promise
	const batchSize = 10;
	for (let i = 0; i < lineProcessingPromises.length; i += batchSize) {
		if (signal?.aborted) {
			throw new Error('AbortError');
		}

		const batch = lineProcessingPromises.slice(i, i + batchSize);
		const results = await Promise.allSettled(batch);

		results.forEach((result, index) => {
			completedCount++;

			// 更新进度
			if (completedCount % 5 === 0 || completedCount === lineCount) {
				currentStatusBarItem.text = `$(sync~spin) Show Notes: ${completedCount}/${lineCount}`;
			}

			if (result.status === 'fulfilled' && result.value) {
				decorations.push(result.value);

				// 渐进式渲染：每处理几行就更新一次装饰
				if (decorations.length % 5 === 0) {
					const editor = vscode.window.visibleTextEditors.find(e => e.document === document);
					if (editor && !signal?.aborted) {
						editor.setDecorations(currentDecorationType, [...decorations]);
					}
				}
			}
		});
	}

	// 最终应用所有装饰
	const editor = vscode.window.visibleTextEditors.find(e => e.document === document);
	if (editor && !signal?.aborted) {
		editor.setDecorations(currentDecorationType, decorations);

		// 缓存装饰结果
		const docKey = document.uri.toString();
		decorationsCache.set(docKey, decorations);
		console.log(`[缓存] 已缓存 ${decorations.length} 个装饰:`, document.fileName);

		const duration = Date.now() - startTime;
		currentStatusBarItem.text = `$(check) Show Notes: ${decorations.length}/${lineCount} (${duration}ms)`;
		currentStatusBarItem.tooltip = `已完成: ${document.fileName}\n找到 ${decorations.length} 个注释`;

		// 3秒后隐藏状态栏
		setTimeout(() => {
			if (currentStatusBarItem.text.startsWith('$(check)')) {
				currentStatusBarItem.hide();
			}
		}, 3000);

		console.log(`[更新装饰] 完成: 找到 ${decorations.length} 个装饰，耗时 ${duration}ms`);
	} else {
		console.log(`[更新装饰] 未找到可见编辑器或已取消`);
		currentStatusBarItem.hide();
	}
}

/**
 * 异步处理单行，查找方法调用并获取文档注释
 */
async function processLine(
	document: vscode.TextDocument,
	lineNum: number,
	userConfig: ReturnType<typeof getConfiguration>,
	signal?: AbortSignal
): Promise<vscode.DecorationOptions | null> {
	try {
		if (signal?.aborted) {
			return null;
		}

		const line = document.lineAt(lineNum);
		const lineText = line.text;

		// 跳过空行和注释行
		const trimmedLine = lineText.trim();
		if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
			return null;
		}

		console.log(`[processLine] 处理第 ${lineNum} 行: "${lineText.trim()}"`);

		// 匹配方法调用的多种模式
		const methodCallRegex = /(\w+\.)?(\w+)\s*\(/g;
		let match;
		let matchCount = 0;

		while ((match = methodCallRegex.exec(lineText)) !== null) {
			matchCount++;
			if (signal?.aborted) {
				return null;
			}

			const methodName = match[2];
			console.log(`[processLine] 第 ${lineNum} 行找到方法调用: ${methodName}`);

			// 跳过常见的控制结构关键字
			if (['if', 'for', 'while', 'switch', 'catch'].includes(methodName)) {
				console.log(`[processLine] 跳过控制结构关键字: ${methodName}`);
				continue;
			}

			// 计算方法调用的位置
			const matchIndex = match.index + (match[1] ? match[1].length : 0);
			const position = new vscode.Position(lineNum, matchIndex);

			try {
				console.log(`[processLine] 准备获取 hover，第 ${lineNum} 行, 方法 ${methodName}, 位置 ${position.line}:${position.character}`);

				// 获取悬停信息（包含 Javadoc）
				const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
					'vscode.executeHoverProvider',
					document.uri,
					position
				);

				console.log(`[processLine] hover 命令执行完毕，结果: ${hovers ? `数组长度 ${hovers.length}` : 'null/undefined'}`);

				if (hovers && hovers.length > 0) {
					// 调试：打印 hover 的原始内容
					console.log(`[processLine] 第 ${lineNum} 行, 方法 ${methodName}, hover 数量: ${hovers.length}`);
					hovers[0].contents.forEach((content, index) => {
						if (typeof content === 'string') {
							console.log(`[processLine] hover[${index}] (string): ${content.substring(0, 200)}`);
						} else if (content instanceof vscode.MarkdownString) {
							console.log(`[processLine] hover[${index}] (markdown): ${content.value.substring(0, 200)}`);
						}
					});

					const javadocSummary = extractJavadocFirstLine(hovers[0], userConfig.maxLength);
					console.log(`[processLine] 提取的注释: "${javadocSummary}"`);

					if (javadocSummary) {
						// 在行尾添加装饰
						const lineEnd = line.range.end;
						console.log(`[processLine] 找到有效注释，创建装饰`);
						return {
							range: new vscode.Range(lineEnd, lineEnd),
							renderOptions: {
								after: {
									contentText: ` ${userConfig.commentPrefix} ${javadocSummary}`,
									color: userConfig.commentColor,
									fontStyle: userConfig.fontStyle,
									margin: '0 0 0 1em'
								}
							}
						};
					} else {
						console.log(`[processLine] 提取的注释为空`);
					}
				} else {
					console.log(`[processLine] 没有 hover 结果`);
				}
			} catch (error) {
				console.error(`[processLine] 处理第 ${lineNum} 行时出错:`, error);
			}
		}

		if (matchCount === 0) {
			console.log(`[processLine] 第 ${lineNum} 行没有找到方法调用`);
		}

		return null;
	} catch (error) {
		console.error(`[processLine] 第 ${lineNum} 行出错:`, error);
		return null;
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

	// 分割成行处理
	const lines = javadocText.split('\n');
	let inCodeBlock = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();

		// 处理代码块标记
		if (line.startsWith('```')) {
			inCodeBlock = !inCodeBlock;
			continue;
		}

		// 跳过代码块内的内容
		if (inCodeBlock) {
			continue;
		}

		// 跳过空行
		if (!line) {
			continue;
		}

		// 跳过分隔线
		if (line.startsWith('---') || line.match(/^-{3,}$/)) {
			continue;
		}

		// 跳过参数、返回值等标记行（这些标记说明描述部分已结束）
		if (line.match(/^(@param|@return|@returns|@throws|@see|@since|@deprecated|参数:|返回:|Param|Return)/i)) {
			break;
		}

		// 跳过纯粹的类型信息和方法签名
		if (line.match(/^(public|private|protected|static|final|abstract|class|interface|enum)\s/) ||
			line.match(/^\w+\s*\(.*\)\s*(:\s*\w+)?$/) ||
			line.match(/^(java\.|void\s|int\s|String\s|boolean\s|long\s|double\s|float\s)/)) {
			continue;
		}

		// 清理格式
		let cleaned = line
			.replace(/^\*+\s*/, '')         // 移除开头的星号和空格
			.replace(/\*+$/, '')            // 移除结尾的星号
			.replace(/\/\*+/, '')           // 移除 /*
			.replace(/\*+\//, '')           // 移除 */
			.replace(/`/g, '')              // 移除反引号
			.replace(/<[^>]+>/g, '')        // 移除 HTML 标签
			.replace(/^\s*[-•]\s*/, '')     // 移除列表符号
			.trim();

		// 如果找到有效内容（长度大于3避免提取到无意义的短词）
		if (cleaned && cleaned.length > 3) {
			// 限制长度
			if (cleaned.length > maxLength) {
				cleaned = cleaned.substring(0, maxLength - 3) + '...';
			}
			return cleaned;
		}
	}

	return '';
}

export function deactivate() {
	// 取消所有正在进行的处理任务
	processingTasks.forEach(controller => controller.abort());
	processingTasks.clear();

	// 清空缓存
	decorationsCache.clear();

	if (decorationType) {
		decorationType.dispose();
	}

	if (statusBarItem) {
		statusBarItem.dispose();
	}
}
