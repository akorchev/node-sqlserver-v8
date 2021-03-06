/**
* Copyright Microsoft Corporation and contributors
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

var fs = require('fs');
var path = require('path');
var config = require('./test-config');

// version dependent use of existsSync
var version = process.version.split('.');

//if( version[0] != 'v0' || ( version[1] != '6' && version[1] != '8' )) {
//  throw new Error( "Tests only run in node.js 0.6.x or 0.8.x" );
//}

var pathExistsSync;
  pathExistsSync = fs.existsSync;

var fileContent;
var root = false;
if (pathExistsSync('./testlist.txt')) {
  fileContent = fs.readFileSync('./testlist.txt').toString();
} else {
  fileContent = fs.readFileSync('./test/testlist.txt').toString();
  root = true;
}

var files = fileContent.split('\n');
var args = (process.ARGV || process.argv);
args.push('-u');
args.push('tdd');

// TODO: remove this timeout once tests are faster
args.push('-t');
args.push('200000');

files.forEach(function (file) {
  // trim trailing \r if it exists
  file = file.replace('\r', '');

  if (root) {
    args.push('test/' + file);
  } else {
    args.push(file);
  }
});

require('mocha/bin/mocha');
