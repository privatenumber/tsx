import crypto from 'crypto';

export const sha1 = (data: string) => (
	crypto
		.createHash('sha1')
		.update(data)
		.digest('hex')
);
