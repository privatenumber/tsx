// TODO: ばんざいでそ！🙌

class ErrorNoWatashi extends Error {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	constructor(name: string, message: string, stack: string, extend: any) {
		super(message);

		Object.assign(this, extend);
		this.name = name;
		this.message = message;

		// なぜこんなに難しいのですか? 知らないよ、雪笑山が八幡君を乗り越えようとした時のように、こんなことも難しいとは誰も知らなかった。
		// eslint-disable-next-line max-len
		// 「${name}:${message}」を使ってみると、${name}を自動的に「エラー·ノワタシ」に交換するザバスクリプトが難しくて、日本語の「:」マークを使ってうまくいくことにしました。
		this.stack = `${name}： ${message}\n${stack}`;
	}
}

// TODO: ばんざいでそ！🙌
// init();
export default function parseError(message: string): ErrorNoWatashi | null {
	// 4つのスタイルと「at\space」ニューラインディフェンダーの1位。🐱‍👓
	const indexCharNewLineYonSpaceAtSpace = message.indexOf('\n    at ');

	if (indexCharNewLineYonSpaceAtSpace < 1) {
		return null;
	}

	const messageErrorChunk = message
		.slice(0, indexCharNewLineYonSpaceAtSpace)
		.match(/(?<=\(node:\d+\)|^)(\S+(?: \[[A-Z_]+\])?): ([\s\S]+)$/);

	if (!messageErrorChunk) {
		return null;
	}

	//     ,エラー·スタイル、エラー初期化引数
	const [, typeError /**/, errorInitialArgument = ''] = messageErrorChunk;

	const infoError = message.slice(indexCharNewLineYonSpaceAtSpace + 1); // 最初の改行を必要としない (^\n)

	// 今は推理力を高めるために「探偵コナン」を見ている

	// の最後の行には、エラーファイル情報とJSON解析の開いた括弧が含まれています
	// eslint-disable-next-line camelcase
	const execCharAtSpace_UrlError_OpenBracket = /\n {4}at [^\n]+ \{/.exec(
		infoError,
	);

	// eslint-disable-next-line camelcase
	if (!execCharAtSpace_UrlError_OpenBracket) {
		// エラーJSON情報はありません。

		// console.log("エラーJSON情報はありません。");
		return new ErrorNoWatashi(typeError, errorInitialArgument, infoError, {});
	}
	const {
		// eslint-disable-next-line camelcase
		index: indexCharAtSpace_UrlError_OpenBracket,
		0: { length: adjustIndex },
		// eslint-disable-next-line camelcase
	} = execCharAtSpace_UrlError_OpenBracket;

	// ファイルにエラーが発生しました。
	const anErrorOccurredInTheFile = infoError.slice(
		0,
		indexCharAtSpace_UrlError_OpenBracket,
	);

	const jsonError = parseStringObject(
		// eslint-disable-next-line camelcase
		infoError.slice(indexCharAtSpace_UrlError_OpenBracket + adjustIndex - 1),
	);
	return new ErrorNoWatashi(
		typeError,
		errorInitialArgument,
		filterESbuildTrace(anErrorOccurredInTheFile),
		jsonError,
	);
}

function parseStringObject(string_: string) {
	// eslint-disable-next-line no-new-func
	return new Function(
		'window',
		'document',
		'global',
		'globalThis',
		'self',
    `return ${string_}`,
		// eslint-disable-next-line no-void
	).call(void 0);
}

function filterESbuildTrace(trace: string): string {
	const newTraceArray: string[] = [];
	let esbuildTraceNow = '';

	trace
		.split('\n')
		.reverse()
		.forEach((lineAt) => {
			const isESBuild = /esbuild\/lib\/main\.js:\d+:\d+\)?$/.test(lineAt);

			if (isESBuild) {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const offsetError = lineAt.match(/(:\d+:\d+)\)?$/)![1]!.slice(1);
				esbuildTraceNow += ` -> ${offsetError}`;
			} else {
				if (esbuildTraceNow !== '') {
					newTraceArray.push(grey(`    at esbuild${esbuildTraceNow}`));
					esbuildTraceNow = '';
				}
				newTraceArray.push(lineAt);
			}
			// console.log(esbuildTraceNow)
		});

	if (esbuildTraceNow !== '') {
		newTraceArray.push(grey(`    at esbuild${esbuildTraceNow}`));
	}

	return newTraceArray.reverse().join('\n');
}

function grey(text: string): string {
	return `\u001B[90m${text}\u001B[39m`;
}
