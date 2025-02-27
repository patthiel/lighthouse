/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import ServiceWorker from '../../audits/service-worker.js';
import URL from '../../lib/url-shim.js';
import manifestParser from '../../lib/manifest-parser.js';
import {strict as assert} from 'assert';

/* eslint-env jest */

function getBaseDirectory(urlStr) {
  const url = new URL(urlStr);
  return url.origin + url.pathname.substring(0, url.pathname.lastIndexOf('/') + 1);
}

/**
 * Create a ServiceWorker artifact from an array of SW config opts.
 * @param {Array<{scriptURL: string, status: string, scopeURL?: string}>} swOpts
 * @return {LH.Artifact['ServiceWorker']}
 */
function createSWArtifact(swOpts) {
  const artifact = {versions: [], registrations: []};
  swOpts.forEach((sw, index) => {
    artifact.versions.push({
      registrationId: `${index}`,
      status: sw.status,
      scriptURL: sw.scriptURL,
    });
    const scopeURL = sw.scopeURL || getBaseDirectory(sw.scriptURL);
    assert.ok(scopeURL.endsWith('/')); // required by SW spec.

    artifact.registrations.push({
      registrationId: `${index}`,
      scopeURL,
    });
  });

  return artifact;
}

/**
 * Create a set of artifacts for the ServiceWorker audit.
 * @param {Array<{scriptURL: string, status: string, scopeURL?: string}>} swOpts
 * @param {string} mainDocumentUrl
 * @param {{}|string|null} manifestJsonOrObject WebAppManifest object or string or null if no manifest desired.
 */
function createArtifacts(swOpts, mainDocumentUrl, manifestJsonOrObject) {
  const manifestUrl = getBaseDirectory(mainDocumentUrl) + 'manifest.json';
  let WebAppManifest;
  if (manifestJsonOrObject === null) {
    WebAppManifest = null;
  } else {
    const manifestJson = typeof manifestJsonOrObject === 'object' ?
      JSON.stringify(manifestJsonOrObject) : manifestJsonOrObject;
    WebAppManifest = manifestParser(manifestJson, manifestUrl, mainDocumentUrl);
  }

  return {
    ServiceWorker: createSWArtifact(swOpts),
    URL: {mainDocumentUrl},
    WebAppManifest,
  };
}

describe('Offline: service worker audit', () => {
  it('passes when given a controlling service worker', () => {
    const mainDocumentUrl = 'https://example.com';
    const swOpts = [{
      status: 'activated',
      scriptURL: 'https://example.com/sw.js',
    }];
    const manifest = {start_url: mainDocumentUrl};

    const output = ServiceWorker.audit(createArtifacts(swOpts, mainDocumentUrl, manifest));
    assert.deepStrictEqual(output.score, 1);
    assert.deepStrictEqual(output.details.scopeUrl, 'https://example.com/');
    assert.deepStrictEqual(output.details.scriptUrl, 'https://example.com/sw.js');
  });

  it('fails when controlling service worker is not activated', () => {
    const mainDocumentUrl = 'https://example.com';
    const swOpts = [{
      status: 'redundant',
      scriptURL: 'https://example.com/sw.js',
    }];
    const manifest = {start_url: mainDocumentUrl};

    const output = ServiceWorker.audit(createArtifacts(swOpts, mainDocumentUrl, manifest));
    assert.deepStrictEqual(output.score, 0);
  });

  it('discards service worker registrations for other origins', () => {
    const mainDocumentUrl = 'https://example.com';
    const swOpts = [{
      status: 'activated',
      scriptURL: 'https://other-example.com',
    }];
    const manifest = {start_url: mainDocumentUrl};

    const output = ServiceWorker.audit(createArtifacts(swOpts, mainDocumentUrl, manifest));
    assert.deepStrictEqual(output.score, 0);
  });

  it('fails when page URL is out of scope', () => {
    const mainDocumentUrl = 'https://example.com/index.html';
    const swOpts = [{
      status: 'activated',
      scriptURL: 'https://example.com/serviceworker/sw.js',
    }];
    const manifest = {start_url: mainDocumentUrl};

    const output = ServiceWorker.audit(createArtifacts(swOpts, mainDocumentUrl, manifest));
    assert.strictEqual(output.score, 0);
    assert.ok(output.details === undefined);
    expect(output.explanation).toBeDisplayString('This origin has one or more service workers, ' +
      'however the page (https://example.com/index.html) is not in scope.');
  });

  it('fails when start_url is out of scope', () => {
    const mainDocumentUrl = 'https://example.com/serviceworker/index.html';
    const scriptURL = 'https://example.com/serviceworker/sw.js';
    const swOpts = [{
      status: 'activated',
      scriptURL,
    }];
    const startUrl = 'https://example.com/';
    const manifest = {start_url: startUrl};

    const scopeURL = 'https://example.com/serviceworker/';

    const output = ServiceWorker.audit(createArtifacts(swOpts, mainDocumentUrl, manifest));
    assert.strictEqual(output.score, 0);
    assert.deepStrictEqual(output.details, {
      type: 'debugdata',
      scriptUrl: scriptURL,
      scopeUrl: scopeURL,
    });
    expect(output.explanation).toBeDisplayString('This page is controlled by a service worker, ' +
      `however the \`start_url\` (${startUrl}) is not in the service worker's scope (${scopeURL})`);
  });

  it('fails when explicit scopeURL puts the page URL out of scope', () => {
    const mainDocumentUrl = 'https://example.com/index.html';
    const swOpts = [{
      status: 'activated',
      scriptURL: 'https://example.com/sw.js',
      scopeURL: 'https://example.com/serviceworker/',
    }];
    const manifest = {start_url: mainDocumentUrl};

    const output = ServiceWorker.audit(createArtifacts(swOpts, mainDocumentUrl, manifest));
    assert.strictEqual(output.score, 0);
    assert.ok(output.details === undefined);
    expect(output.explanation).toBeDisplayString('This origin has one or more service workers, ' +
      `however the page (${mainDocumentUrl}) is not in scope.`);
  });

  it('fails when explicit scopeURL puts the start_url out of scope', () => {
    const mainDocumentUrl = 'https://example.com/serviceworker/index.html';
    const scopeURL = 'https://example.com/serviceworker/';
    const swOpts = [{
      status: 'activated',
      scriptURL: 'https://example.com/sw.js',
      scopeURL,
    }];
    const startUrl = 'https://example.com/';
    const manifest = {start_url: startUrl};

    const output = ServiceWorker.audit(createArtifacts(swOpts, mainDocumentUrl, manifest));
    assert.strictEqual(output.score, 0);
    expect(output.explanation).toBeDisplayString(
      /service worker,.*\(.*\) is not in the service worker's scope \(.*\)/);
  });

  it('passes when both outside default scope but explicit scopeURL puts it back in', () => {
    const mainDocumentUrl = 'https://example.com/index.html';
    const swOpts = [{
      status: 'activated',
      scriptURL: 'https://example.com/serviceworker/sw.js',
      // can happen when 'Service-Worker-Allowed' header widens max scope.
      scopeURL: 'https://example.com/',
    }];
    const manifest = {start_url: mainDocumentUrl};

    const output = ServiceWorker.audit(createArtifacts(swOpts, mainDocumentUrl, manifest));
    assert.deepStrictEqual(output.score, 1);
  });

  it('passes when multiple SWs control the scope', () => {
    const mainDocumentUrl = 'https://example.com/project/index.html';
    const swOpts = [{
      status: 'activated',
      scriptURL: 'https://example.com/sw.js',
    }, {
      status: 'activated',
      scriptURL: 'https://example.com/project/sw.js',
    }];
    const manifest = {start_url: mainDocumentUrl};

    const output = ServiceWorker.audit(createArtifacts(swOpts, mainDocumentUrl, manifest));
    assert.deepStrictEqual(output.score, 1);
    assert.deepStrictEqual(output.details.scopeUrl, 'https://example.com/project/');
    assert.deepStrictEqual(output.details.scriptUrl, 'https://example.com/project/sw.js');
  });

  it('passes when multiple SWs control the origin but only one is in scope', () => {
    const mainDocumentUrl = 'https://example.com/index.html';
    const swOpts = [{
      status: 'activated',
      scriptURL: 'https://example.com/sw.js',
      scopeURL: 'https://example.com/project/',
    }, {
      status: 'activated',
      scriptURL: 'https://example.com/project/sw.js',
      scopeURL: 'https://example.com/project/',
    }, {
      status: 'activated',
      scriptURL: 'https://example.com/project/subproject/sw.js',
      scopeURL: 'https://example.com/',
    }];
    const manifest = {start_url: mainDocumentUrl};

    const output = ServiceWorker.audit(createArtifacts(swOpts, mainDocumentUrl, manifest));
    assert.deepStrictEqual(output.score, 1);
    assert.deepStrictEqual(output.details.scopeUrl, 'https://example.com/');
    assert.deepStrictEqual(output.details.scriptUrl, 'https://example.com/project/subproject/sw.js');
  });

  it('fails when multiple SWs control the origin but are all out of scope', () => {
    const mainDocumentUrl = 'https://example.com/index.html';
    const swOpts = [{
      status: 'activated',
      scriptURL: 'https://example.com/sw.js',
      scopeURL: 'https://example.com/project/',
    }, {
      status: 'activated',
      scriptURL: 'https://example.com/project/sw.js',
      scopeURL: 'https://example.com/project/',
    }, {
      status: 'activated',
      scriptURL: 'https://example.com/project/subproject/sw.js',
      scopeURL: 'https://example.com/project/',
    }];
    const manifest = {start_url: mainDocumentUrl};

    const output = ServiceWorker.audit(createArtifacts(swOpts, mainDocumentUrl, manifest));
    assert.strictEqual(output.score, 0);
    assert.ok(output.details === undefined);
    expect(output.explanation).toBeDisplayString('This origin has one or more service workers, ' +
      `however the page (${mainDocumentUrl}) is not in scope.`);
  });

  it('fails when SW that controls start_url is different than SW that controls page', () => {
    // Tests that most specific SW found for page.
    const mainDocumentUrl = 'https://example.com/project/index.html';
    const swOpts = [{
      status: 'activated',
      scriptURL: 'https://example.com/sw.js',
    }, {
      status: 'activated',
      scriptURL: 'https://example.com/project/sw.js',
    }];
    const startUrl = 'https://example.com/index.html';
    const manifest = {start_url: startUrl};

    const scopeURL = 'https://example.com/project/';

    const output = ServiceWorker.audit(createArtifacts(swOpts, mainDocumentUrl, manifest));
    assert.strictEqual(output.score, 0);
    assert.deepStrictEqual(output.details, {
      type: 'debugdata',
      scriptUrl: 'https://example.com/project/sw.js',
      scopeUrl: scopeURL,
    });
    expect(output.explanation).toBeDisplayString('This page is controlled by a service worker, ' +
      `however the \`start_url\` (${startUrl}) is not in the service worker's scope (${scopeURL})`);
  });

  it('fails when a manifest was not found', () => {
    const mainDocumentUrl = 'https://example.com';
    const swOpts = [{
      status: 'activated',
      scriptURL: 'https://example.com/sw.js',
    }];
    const manifest = null;

    const output = ServiceWorker.audit(createArtifacts(swOpts, mainDocumentUrl, manifest));
    assert.strictEqual(output.score, 0);
    expect(output.explanation).toBeDisplayString('This page is controlled by a service worker, ' +
      'however no `start_url` was found because no manifest was fetched.');
  });

  it('fails when a manifest is invalid', () => {
    const mainDocumentUrl = 'https://example.com';
    const swOpts = [{
      status: 'activated',
      scriptURL: 'https://example.com/sw.js',
    }];
    const artifacts = createArtifacts(swOpts, mainDocumentUrl, '{,;}');

    const output = ServiceWorker.audit(artifacts);
    assert.strictEqual(output.score, 0);
    expect(output.explanation).toBeDisplayString('This page is controlled by a service worker, ' +
      'however no `start_url` was found because manifest failed to parse as valid JSON');
  });
});
