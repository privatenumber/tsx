const base64Module = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const dataUrl = base64Module('console.log(123)');
import(dataUrl);
