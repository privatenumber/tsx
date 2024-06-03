'use strict';

var path = require('node:path');
var os = require('node:os');

const { geteuid } = process;
const userId = geteuid ? geteuid() : os.userInfo().username;
const tmpdir = path.join(os.tmpdir(), `tsx-${userId}`);

exports.tmpdir = tmpdir;
