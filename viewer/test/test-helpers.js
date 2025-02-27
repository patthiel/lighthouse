/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import fs from 'fs';
import path from 'path';

import * as jsdom from 'jsdom';

import {LH_ROOT} from '../../root.js';

/* eslint-env jest */

const PAGE = fs.readFileSync(path.join(LH_ROOT, 'viewer/app/index.html'), 'utf8');

function setupJsDomGlobals() {
  const {window} = new jsdom.JSDOM(PAGE);
  global.document = window.document;
  global.window = window;
  global.logger = console;
  global.logger.hide = () => {/* noop */};
}

function cleanupJsDomGlobals() {
  global.document = undefined;
  global.window = undefined;
  global.logger = undefined;
}

export {
  setupJsDomGlobals,
  cleanupJsDomGlobals,
};
