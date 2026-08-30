const outdent = require('outdent');

module.exports = {
	// Append links to other published releases at the bottom of the GitHub release notes.
	addReleases: 'bottom',
	// The plugin discovers issues from closing keywords in release PR bodies or commit
	// messages, then also targets the associated PR. Keep only human-authored issues
	// to avoid duplicate notifications. This filters targets, not closure reasons.
	// See https://github.com/semantic-release/github/blob/v12.0.9/lib/success.js#L148-L215
	// and https://github.com/semantic-release/issue-parser/blob/v7.0.2/lib/hosts-config.js#L2-L18.
	successCommentCondition: '<% return !issue.pull_request && issue.user.type === \'User\'; %>',
	successComment: outdent`
	@<%= issue.user.login %> Thanks for the report. This is fixed in [tsx v\${nextRelease.version}](https://github.com/privatenumber/tsx/releases/tag/v\${nextRelease.version}).

	Please update to that version and let us know if you still see the problem.

	If tsx has been useful to you, [sponsorship helps support its maintenance](https://github.com/sponsors/privatenumber).
	`,
};
