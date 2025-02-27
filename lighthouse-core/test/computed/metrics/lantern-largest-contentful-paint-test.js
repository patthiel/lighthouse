/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import {strict as assert} from 'assert';
import trace from '../../fixtures/traces/lcp-m78.json';
import devtoolsLog from '../../fixtures/traces/lcp-m78.devtools.log.json';
import LanternLargestContentfulPaint from '../../../computed/metrics/lantern-largest-contentful-paint.js'; // eslint-disable-line max-len
import {getURLArtifactFromDevtoolsLog} from '../../test-utils.js';

const URL = getURLArtifactFromDevtoolsLog(devtoolsLog);

/* eslint-env jest */
describe('Metrics: Lantern LCP', () => {
  it('should compute predicted value', async () => {
    const gatherContext = {gatherMode: 'navigation'};
    const settings = {};
    const computedCache = new Map();
    const result = await LanternLargestContentfulPaint.request(
      {trace, devtoolsLog, gatherContext, settings, URL},
      {computedCache}
    );

    expect({
      timing: Math.round(result.timing),
      optimistic: Math.round(result.optimisticEstimate.timeInMs),
      pessimistic: Math.round(result.pessimisticEstimate.timeInMs),
    }).toMatchInlineSnapshot(
      {},
      `
      Object {
        "optimistic": 2289,
        "pessimistic": 3228,
        "timing": 2758,
      }
    `
    );
    assert.equal(result.optimisticEstimate.nodeTimings.size, 12);
    assert.equal(result.pessimisticEstimate.nodeTimings.size, 19);
    assert.ok(result.optimisticGraph, 'should have created optimistic graph');
    assert.ok(result.pessimisticGraph, 'should have created pessimistic graph');
  });
});
