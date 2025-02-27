/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import ManualAudit from '../../audits/manual/manual-audit.js';
import {strict as assert} from 'assert';

/* eslint-env jest */

// Extend the Audit class but fail to implement meta. It should throw errors.
class TestAudit extends ManualAudit {
  static get meta() {
    return Object.assign({
      id: 'manual-audit',
      description: 'Some help text.',
    }, super.partialMeta);
  }
}

describe('ManualAudit', () => {
  it('sets defaults', () => {
    assert.equal(TestAudit.meta.id, 'manual-audit');
    assert.equal(TestAudit.meta.requiredArtifacts.length, 0);
    assert.equal(TestAudit.meta.scoreDisplayMode, 'manual');
  });
});
