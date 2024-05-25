const outdent = require('outdent');

module.exports = {
	addReleases: 'bottom',
	successComment: outdent`
	:tada: This issue has been resolved in v\${nextRelease.version}
	
	If you appreciate this project, please consider [supporting this project by sponsoring](https://github.com/sponsors/privatenumber) :heart: :pray:
	`,
};
