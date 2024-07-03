const outdent = require('outdent');

module.exports = {
	addReleases: 'bottom',
	successComment: outdent`
	This issue is now resolved in [v\${nextRelease.version}](https://github.com/privatenumber/tsx/releases/tag/v\${nextRelease.version}).
	
	If you're able to, [your sponsorship](https://github.com/sponsors/privatenumber) would be very much appreciated.
	`,
};
