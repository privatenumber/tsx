const outdent = require('outdent');

module.exports = {
	addReleases: 'bottom',
	successComment: outdent`
	:tada: This issue has been resolved in v\${nextRelease.version}
	
	If you rely on this project, please consider [making a donation](https://github.com/sponsors/privatenumber) :heart: :pray:
	`,
};
