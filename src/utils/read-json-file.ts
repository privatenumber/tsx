import fs from 'fs';

export const readJsonFile = <JsonType>(
	filePath: string,
) => {
	try {
		const jsonString = fs.readFileSync(filePath, 'utf8');
		return JSON.parse(jsonString) as JsonType;
	} catch {}
};
