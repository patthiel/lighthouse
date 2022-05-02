/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview  A runner that launches Chrome and executes Lighthouse via a
 * bundle to test that bundling has produced correct and runnable code.
 * Currently uses `lighthouse-dt-bundle.js`.
 * Runs in a worker to avoid messing up marky's global state.
 */

import fs from 'fs';
import {Worker, isMainThread, parentPort} from 'worker_threads';

import puppeteer from 'puppeteer-core';
import ChromeLauncher from 'chrome-launcher';

import ChromeProtocol from '../../../../lighthouse-core/gather/connections/cri.js';
import {LH_ROOT} from '../../../../root.js';

if (!isMainThread && parentPort) {
  parentPort.once('message', async (message) => {
    const {url, configJson, testRunnerOptions} = message;
    try {
      const result = await runBundledLighthouse(url, configJson, testRunnerOptions);
      parentPort?.postMessage({type: 'result', value: result});
    } catch (err) {
      console.error(err);
      parentPort?.postMessage({type: 'error', value: err});
    }
  });
}

/**
 * @param {string} url
 * @param {LH.Config.Json|undefined} configJson
 * @param {{isDebug?: boolean, useFraggleRock?: boolean}} testRunnerOptions
 * @return {Promise<{lhr: LH.Result, artifacts: LH.Artifacts}>}
 */
async function runBundledLighthouse(url, configJson, testRunnerOptions) {
  if (isMainThread || !parentPort) {
    throw new Error('must be called in worker');
  }

  const originalBuffer = global.Buffer;
  const originalRequire = global.require;
  if (typeof globalThis === 'undefined') {
    // @ts-expect-error - exposing for loading of dt-bundle.
    global.globalThis = global;
  }

  // Load bundle, which creates a `global.runBundledLighthouse`.
  eval(fs.readFileSync(LH_ROOT + '/dist/lighthouse-dt-bundle.js', 'utf-8'));

  global.require = originalRequire;
  global.Buffer = originalBuffer;

  /** @type {import('../../../../lighthouse-core/index.js')} */
  // @ts-expect-error - not worth giving test global an actual type.
  const lighthouse = global.runBundledLighthouse;

  // Launch and connect to Chrome.
  const launchedChrome = await ChromeLauncher.launch();
  const port = launchedChrome.port;

  // Run Lighthouse.
  try {
    const logLevel = testRunnerOptions.isDebug ? 'info' : undefined;
    let runnerResult;
    if (testRunnerOptions.useFraggleRock) {
      // Puppeteer is not included in the bundle, we must create the page here.
      const browser = await puppeteer.connect({browserURL: `http://localhost:${port}`});
      const page = await browser.newPage();
      runnerResult = await lighthouse(url, {port, logLevel}, configJson, page);
    } else {
      const connection = new ChromeProtocol(port);
      runnerResult =
        await lighthouse.legacyNavigation(url, {port, logLevel}, configJson, connection);
    }
    if (!runnerResult) throw new Error('No runnerResult');

    return {
      lhr: runnerResult.lhr,
      artifacts: runnerResult.artifacts,
    };
  } finally {
    // Clean up and return results.
    await launchedChrome.kill();
  }
}

/**
 * Launch Chrome and do a full Lighthouse run via the Lighthouse DevTools bundle.
 * @param {string} url
 * @param {LH.Config.Json=} configJson
 * @param {{isDebug?: boolean, useFraggleRock?: boolean}=} testRunnerOptions
 * @return {Promise<{lhr: LH.Result, artifacts: LH.Artifacts, log: string}>}
 */
async function runLighthouse(url, configJson, testRunnerOptions = {}) {
  /** @type {string[]} */
  const logs = [];
  const workerFilename = `${LH_ROOT}/lighthouse-cli/test/smokehouse/lighthouse-runners/bundle.js`;
  const worker = new Worker(workerFilename, {
    stdout: true,
    stderr: true,
  });
  worker.stdout.setEncoding('utf8');
  worker.stderr.setEncoding('utf8');
  worker.stdout.addListener('data', (data) => {
    process.stdout.write(data);
    logs.push(`STDOUT: ${data}`);
  });
  worker.stderr.addListener('data', (data) => {
    process.stderr.write(data);
    logs.push(`STDERR: ${data}`);
  });
  const promise = new Promise((resolve, reject) => {
    worker.on('message', (message) => {
      if (message.type === 'result') {
        resolve(message.value);
      } else if (message.type === 'error') {
        reject(message.value);
      }
    });
  });
  worker.postMessage({url, configJson, testRunnerOptions});

  const result = await promise;
  if (!result.lhr || !result.artifacts) {
    throw new Error(`invalid response from worker:\n${JSON.stringify(result, null, 2)}`);
  }

  const log = logs.join('') + '\n';
  return {
    lhr: result.lhr,
    artifacts: result.artifacts,
    log,
  };
}

export {
  runLighthouse,
};
