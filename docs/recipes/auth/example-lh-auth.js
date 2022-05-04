/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Example script for running Lighthouse on an authenticated page.
 * See docs/recipes/auth/README.md for more.
 */

const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');

// This port will be used by Lighthouse later. The specific port is arbitrary.
const PORT = 8041;

/**
 * @param {import('puppeteer').Browser} browser
 * @param {string} origin
 */
async function login(browser, origin) {
  const page = await browser.newPage();
  await page.goto(origin);
  await page.waitForSelector('#username', {visible: true});

  // Fill in and submit login form.
  const emailInput = await page.$('#username');
  await emailInput.type('test-account');
  const passwordInput = await page.$('#password');
  await passwordInput.type('some_test_password');
  const submit = await page.$('#submit');
  await submit.click();
  await page.waitForSelector('[data-qa-add-new-menu-button]', {visible: true});
  await page.close();
}

/**
 * @param {puppeteer.Browser} browser
 * @param {string} origin
 */
// async function logout(browser, origin) {
//   const page = await browser.newPage();
//   await page.goto(`${origin}/logout`);
//   await page.close();
// }

async function main() {
  // Direct Puppeteer to open Chrome with a specific debugging port.
  const browser = await puppeteer.launch({
    // we can pass other options in here, like disabling cert verification
    args: [`--remote-debugging-port=${PORT}`],
    // Optional, if you want to see the tests in action.
    headless: false,
  });

  // Setup the browser session to be logged into our site.
  await login(browser, 'https://cloud.linode.com/');

  // The local server is running on port 10632.
  const url = 'https://cloud.linode.com/linodes';
  // Direct Lighthouse to use the same port.
  const result = await lighthouse(url, {
    port: PORT,
    disableStorageReset: true,
    onlyCategories: ['accessibility'],
  });
  // Direct Puppeteer to close the browser as we're done with it.
  await browser.close();

  // Output the result.
  console.log(JSON.stringify(result.lhr, null, 2));
}

if (require.main === module) {
  main();
} else {
  module.exports = {
    login,
    // logout,
  };
}
