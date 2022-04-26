/**
 * @license Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Fetcher is a utility for making requests within the context of the page.
 * Requests can circumvent CORS, and so are good for fetching source maps that may be hosted
 * on a different origin.
 */

/* global document */

/** @typedef {{content: string|null, status: number|null}} FetchResponse */

const log = require('lighthouse-logger');
const {getBrowserVersion} = require('./driver/environment.js');

class Fetcher {
  /**
   * @param {LH.Gatherer.FRProtocolSession} session
   * @param {import('./driver/execution-context.js')} executionContext
   */
  constructor(session, executionContext) {
    this.session = session;
    this.executionContext = executionContext;
    /** @type {Map<string, (event: LH.Crdp.Fetch.RequestPausedEvent) => void>} */
    this._onRequestPausedHandlers = new Map();
    this._onRequestPaused = this._onRequestPaused.bind(this);
    this._enabled = false;
    /** @type {string|null} */
    this._universalBrowserContextId = null;
  }

  /**
   * Chrome M92 and above:
   * We use `Network.loadNetworkResource` to fetch each resource.
   *
   * Chrome <M92:
   * The Fetch domain accepts patterns for controlling what requests are intercepted, but we
   * enable the domain for all patterns and filter events at a lower level to support multiple
   * concurrent usages. Reasons for this:
   *
   * 1) only one set of patterns may be applied for the entire domain.
   * 2) every request that matches the patterns are paused and only resumes when certain Fetch
   *    commands are sent. So a listener of the `Fetch.requestPaused` event must either handle
   *    the requests it cares about, or explicitly allow them to continue.
   * 3) if multiple commands to continue the same request are sent, protocol errors occur.
   *
   * So instead we have one global `Fetch.enable` / `Fetch.requestPaused` pair, and allow specific
   * urls to be intercepted via `fetcher._setOnRequestPausedHandler`.
   */
  async enable() {
    if (this._enabled) return;

    this._enabled = true;
    await this.session.sendCommand('Fetch.enable', {
      patterns: [{requestStage: 'Request'}, {requestStage: 'Response'}],
    });
    await this.session.on('Fetch.requestPaused', this._onRequestPaused);
  }

  async disable() {
    if (!this._enabled) return;

    this._enabled = false;
    await this.session.off('Fetch.requestPaused', this._onRequestPaused);
    await this.session.sendCommand('Fetch.disable');
    this._onRequestPausedHandlers.clear();
  }

  /**
   * @param {string} url
   * @param {(event: LH.Crdp.Fetch.RequestPausedEvent) => void} handler
   */
  async _setOnRequestPausedHandler(url, handler) {
    this._onRequestPausedHandlers.set(url, handler);
  }

  /**
   * @param {LH.Crdp.Fetch.RequestPausedEvent} event
   */
  _onRequestPaused(event) {
    const handler = this._onRequestPausedHandlers.get(event.request.url);
    if (handler) {
      handler(event);
    } else {
      // Nothing cares about this URL, so continue.
      this.session.sendCommand('Fetch.continueRequest', {requestId: event.requestId}).catch(err => {
        log.error('Fetcher', `Failed to continueRequest: ${err.message}`);
      });
    }
  }

  /**
   * `Network.loadNetworkResource` was introduced in M88.
   * The long timeout bug with `IO.read` was fixed in M92:
   * https://bugs.chromium.org/p/chromium/issues/detail?id=1191757
   * Lightrider has a bug forcing us to use the old version for now:
   * https://docs.google.com/document/d/1V-DxgsOFMPxUuFrdGPQpyiCqSljvgNlOqXCtqDtd0b8/edit?usp=sharing&resourcekey=0-aIaIqcHFKG-0dX4MAudBEw
   * @return {Promise<boolean>}
   */
  async shouldUseLegacyFetcher() {
    const {milestone} = await getBrowserVersion(this.session);
    return milestone < 92 || Boolean(global.isLightrider);
  }

  /**
   * Requires that `fetcher.enable` has been called.
   *
   * Fetches any resource in a way that circumvents CORS.
   *
   * @param {string} url
   * @param {{timeout: number}=} options timeout is in ms
   * @return {Promise<FetchResponse>}
   */
  async fetchResource(url, options = {timeout: 2_000}) {
    if (!this._enabled) {
      throw new Error('Must call `enable` before using fetchResource');
    }

    if (global.isLightrider) {
      // eslint-disable-next-line no-undef
      const response = await fetch(url);
      const content = await response.text();
      return {
        content,
        status: response.status,
      };
    }

    return this._fetchResourceOverProtocol(url, options);
  }

  /**
   * @param {string} handle
   * @param {{timeout: number}=} options,
   * @return {Promise<string>}
   */
  async _readIOStream(handle, options = {timeout: 2_000}) {
    const startTime = Date.now();

    let ioResponse;
    let data = '';
    while (!ioResponse || !ioResponse.eof) {
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime > options.timeout) {
        throw new Error('Waiting for the end of the IO stream exceeded the allotted time.');
      }
      ioResponse = await this.session.sendCommand('IO.read', {handle});
      const responseData = ioResponse.base64Encoded ?
        Buffer.from(ioResponse.data, 'base64').toString('utf-8') :
        ioResponse.data;
      data = data.concat(responseData);
    }

    return data;
  }

  /**
   * @param {string} url
   * @return {Promise<{stream: LH.Crdp.IO.StreamHandle|null, status: number|null}>}
   */
  async _loadNetworkResource(url) {
    const frameTreeResponse = await this.session.sendCommand('Page.getFrameTree');
    const networkResponse = await this.session.sendCommand('Network.loadNetworkResource', {
      frameId: frameTreeResponse.frameTree.frame.id,
      url,
      options: {
        disableCache: true,
        includeCredentials: true,
      },
    });

    return {
      stream: networkResponse.resource.success ? (networkResponse.resource.stream || null) : null,
      status: networkResponse.resource.httpStatusCode || null,
    };
  }

  /**
   * @param {string} url
   * @param {{timeout: number}} options timeout is in ms
   * @return {Promise<FetchResponse>}
   */
  async _fetchResourceOverProtocol(url, options) {
    if (global.isLightrider) {
      // eslint-disable-next-line no-undef
      const response = await fetch(url);
      const content = await response.text();
      return {
        content,
        status: response.status,
      };
    }
    // if (!this._universalBrowserContextId) {
    //   this._universalBrowserContextId =
    //     (await this.session.sendCommand('Target.createBrowserContext')).browserContextId;
    //   console.log('...', this._universalBrowserContextId);
    // }

    const startTime = Date.now();

    /** @type {NodeJS.Timeout} */
    let timeoutHandle;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutHandle = setTimeout(reject, options.timeout, new Error('Timed out fetching resource'));
    });

    const responsePromise = this._loadNetworkResource(url);

    /** @type {{stream: LH.Crdp.IO.StreamHandle|null, status: number|null}} */
    const response = await Promise.race([responsePromise, timeoutPromise])
      .finally(() => clearTimeout(timeoutHandle));

    const isOk = response.status && response.status >= 200 && response.status <= 299;
    if (!response.stream || !isOk) return {status: response.status, content: null};

    const timeout = options.timeout - (Date.now() - startTime);
    const content = await this._readIOStream(response.stream, {timeout});
    return {status: response.status, content};
  }
}

module.exports = Fetcher;
