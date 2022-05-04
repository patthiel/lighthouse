/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Audits a page to determine if it is calling deprecated APIs.
 */

const Audit = require('./audit.js');
const JsBundles = require('../computed/js-bundles.js');
const i18n = require('../lib/i18n/i18n.js');

/* eslint-disable max-len */
const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the use of deprecated APIs. This descriptive title is shown to users when the page does not use deprecated APIs. */
  title: 'Avoids deprecated APIs',
  /** Title of a Lighthouse audit that provides detail on the use of deprecated APIs. This descriptive title is shown to users when the page uses deprecated APIs. */
  failureTitle: 'Uses deprecated APIs',
  /** Description of a Lighthouse audit that tells the user why they should not use deprecated APIs on their page. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Deprecated APIs will eventually be removed from the browser. ' +
      '[Learn more](https://web.dev/deprecations/).',
  /** [ICU Syntax] Label for the audit identifying the number of warnings generated by using deprecated APIs. */
  displayValue: `{itemCount, plural,
    =1 {1 warning found}
    other {# warnings found}
    }`,
  /** Header of the table column which displays the warning message describing use of a deprecated API by code running in the web page. */
  columnDeprecate: 'Deprecation / Warning',
  /** Table column header for line of code (eg. 432) that is using a deprecated API. */
  columnLine: 'Line',

  /** This links to the chrome feature status page when one exists. */
  feature: 'Check the feature status page for more details.',
  /**
   * @description This links to the chromium dash schedule when a milestone is set.
   * @example {100} milestone
   */
  milestone: 'This change will go into effect with milestone {milestone}.',

  /**
   * @description TODO(crbug.com/1318846): Description needed for translation
   */
  authorizationCoveredByWildcard:
  'Authorization will not be covered by the wildcard symbol (*) in CORS `Access-Control-Allow-Headers` handling.',
  /**
  *@description TODO(crbug.com/1320334): Description needed for translation
  */
  canRequestURLHTTPContainingNewline:
  'Resource requests whose URLs contained both removed whitespace `\\(n|r|t)` characters and less-than characters (`<`) are blocked. Please remove newlines and encode less-than characters from places like element attribute values in order to load these resources.',
  /**
  *@description TODO(crbug.com/1320335): Description needed for translation
  */
  chromeLoadTimesConnectionInfo:
  '`chrome.loadTimes()` is deprecated, instead use standardized API: Navigation Timing 2.',
  /**
  *@description TODO(crbug.com/1320336): Description needed for translation
  */
  chromeLoadTimesFirstPaintAfterLoadTime:
  '`chrome.loadTimes()` is deprecated, instead use standardized API: Paint Timing.',
  /**
  *@description TODO(crbug.com/1320337): Description needed for translation
  */
  chromeLoadTimesWasAlternateProtocolAvailable:
  '`chrome.loadTimes()` is deprecated, instead use standardized API: `nextHopProtocol` in Navigation Timing 2.',
  /**
  *@description TODO(crbug.com/1318847): Description needed for translation
  */
  cookieWithTruncatingChar: 'Cookies containing a `\\(0|r|n)` character will be rejected instead of truncated.',
  /**
  *@description This warning occurs when a frame accesses another frame's
  *    data after having set `document.domain` without having set the
  *    `Origin-Agent-Cluster` http header. This is a companion warning to
  *    `documentDomainSettingWithoutOriginAgentClusterHeader`, where that
  *    warning occurs when `document.domain` is set, and this warning
  *    occurs when an access has been made, based on that previous
  *    `document.domain` setting.
  */
  crossOriginAccessBasedOnDocumentDomain:
  'Relaxing the same-origin policy by setting `document.domain` is deprecated, and will be disabled by default. This deprecation warning is for a cross-origin access that was enabled by setting `document.domain`.',
  /**
  *@description TODO(crbug.com/1318850): Description needed for translation
  */
  crossOriginWindowAlert:
  'Triggering `window.alert` from cross origin iframes has been deprecated and will be removed in the future.',
  /**
  *@description TODO(crbug.com/1318851): Description needed for translation
  */
  crossOriginWindowConfirm:
  'Triggering `window.confirm` from cross origin iframes has been deprecated and will be removed in the future.',
  /**
  *@description TODO(crbug.com/1320339): Description needed for translation
  */
  cssSelectorInternalMediaControlsOverlayCastButton:
  'The `disableRemotePlayback` attribute should be used in order to disable the default Cast integration instead of using `-internal-media-controls-overlay-cast-button` selector.',
  /**
  *@description TODO(crbug.com/1320340): Description needed for translation
  */
  customCursorIntersectsViewport:
  'Custom cursors with size greater than 32x32 DIP intersecting native UI is deprecated and will be removed.',
  /**
  *@description This warning occurs when a script modifies `document.domain`
  *    without having set on `Origin-Agent-Cluster` http header. In other
  *    words, when a script relies on the default behaviour of
  *    `Origin-Agent-Cluster` when setting document.domain.
  */
  documentDomainSettingWithoutOriginAgentClusterHeader:
  'Relaxing the same-origin policy by setting `document.domain` is deprecated, and will be disabled by default. To continue using this feature, please opt-out of origin-keyed agent clusters by sending an `Origin-Agent-Cluster: ?0` header along with the HTTP response for the document and frames. See https://developer.chrome.com/blog/immutable-document-domain/ for more details.',
  /**
  *@description Warning displayed to developers when the non-standard `Event.path` API is used to notify them that this API is deprecated.
  */
  eventPath: '`Event.path` is deprecated and will be removed. Please use `Event.composedPath()` instead.',
  /**
  *@description Warning displayed to developers when the Geolocation API is used from an insecure origin (one that isn't localhost or doesn't use HTTPS) to notify them that this use is no longer supported.
  */
  geolocationInsecureOrigin:
  '`getCurrentPosition()` and `watchPosition()` no longer work on insecure origins. To use this feature, you should consider switching your application to a secure origin, such as HTTPS. See https://goo.gle/chrome-insecure-origins for more details.',
  /**
  *@description Warning displayed to developers when the Geolocation API is used from an insecure origin (one that isn't localhost or doesn't use HTTPS) to notify them that this use is deprecated.
  */
  geolocationInsecureOriginDeprecatedNotRemoved:
  '`getCurrentPosition()` and `watchPosition()` are deprecated on insecure origins. To use this feature, you should consider switching your application to a secure origin, such as HTTPS. See https://goo.gle/chrome-insecure-origins for more details.',
  /**
  *@description TODO(crbug.com/1318858): Description needed for translation
  */
  getUserMediaInsecureOrigin:
  '`getUserMedia()` no longer works on insecure origins. To use this feature, you should consider switching your application to a secure origin, such as HTTPS. See https://goo.gle/chrome-insecure-origins for more details.',
  /**
  *@description TODO(crbug.com/1320342): Description needed for translation
  */
  hostCandidateAttributeGetter:
  '`RTCPeerConnectionIceErrorEvent.hostCandidate` is deprecated. Please use `RTCPeerConnectionIceErrorEvent.address` or `RTCPeerConnectionIceErrorEvent.port` instead.',
  /**
  *@description TODO(crbug.com/1320343): Description needed for translation
  */
  insecurePrivateNetworkSubresourceRequest:
  'The website requested a subresource from a network that it could only access because of its users\' privileged network position. These requests expose non-public devices and servers to the internet, increasing the risk of a cross-site request forgery (CSRF) attack, and/or information leakage. To mitigate these risks, Chrome deprecates requests to non-public subresources when initiated from non-secure contexts, and will start blocking them.',
  /**
  *@description TODO(crbug.com/1318860): Description needed for translation
  */
  legacyConstraintGoogCpuOveruseDetection:
  'CPU overuse detection is enabled-by-default and the ability to disable it using `googCpuOveruseDetection` will soon be removed. Please stop using this legacy constraint.',
  /**
  *@description TODO(crbug.com/1318861): Description needed for translation
  */
  legacyConstraintGoogIPv6:
  'IPv6 is enabled-by-default and the ability to disable it using `googIPv6` will soon be removed. Please stop using this legacy constraint.',
  /**
  *@description TODO(crbug.com/1318863): Description needed for translation
  */
  legacyConstraintGoogScreencastMinBitrate:
  'Screencast min bitrate is now set to 100 kbps by default and `googScreencastMinBitrate` will soon be ignored in favor of this new default. Please stop using this legacy constraint.',
  /**
  *@description TODO(crbug.com/1318864): Description needed for translation
  */
  legacyConstraintGoogSuspendBelowMinBitrate:
  'Support for the `googSuspendBelowMinBitrate` constraint is about to be removed. Please stop using this legacy constraint.',
  /**
  *@description TODO(crbug.com/1318865): Description needed for translation
  */
  localCSSFileExtensionRejected:
  'CSS cannot be loaded from `file:` URLs unless they end in a `.css` file extension.',
  /**
  *@description TODO(crbug.com/1320344): Description needed for translation
  */
  mediaElementAudioSourceNode:
  'Creating a `MediaElementAudioSourceNode` on an `OfflineAudioContext` is deprecated and will be removed.',
  /**
  *@description TODO(crbug.com/1320345): Description needed for translation
  */
  mediaSourceAbortRemove:
  'Using `SourceBuffer.abort()` to abort `remove()`\'s asynchronous range removal is deprecated due to specification change. Support will be removed in the future. You should instead await `updateend`. `abort()` is intended to only abort an asynchronous media append or reset parser state.',
  /**
  *@description TODO(crbug.com/1320346): Description needed for translation
  */
  mediaSourceDurationTruncatingBuffered:
  'Setting `MediaSource.duration` below the highest presentation timestamp of any buffered coded frames is deprecated due to specification change. Support for implicit removal of truncated buffered media will be removed in the future. You should instead perform explicit `remove(newDuration, oldDuration)` on all `sourceBuffers`, where `newDuration < oldDuration`.',
  /**
  *@description TODO(crbug.com/1320347): Description needed for translation
  */
  noSysexWebMIDIWithoutPermission:
  'Web MIDI will ask a permission to use even if the sysex is not specified in the `MIDIOptions`.',
  /**
  *@description Warning displayed to developers when the Notification API is used from an insecure origin (one that isn't localhost or doesn't use HTTPS) to notify them that this use is no longer supported.
  */
  notificationInsecureOrigin:
  'The Notification API may no longer be used from insecure origins. You should consider switching your application to a secure origin, such as HTTPS. See https://goo.gle/chrome-insecure-origins for more details.',
  /**
  *@description Warning displayed to developers when permission to use notifications has been requested by a cross-origin iframe, to notify them that this use is no longer supported.
  */
  notificationPermissionRequestedIframe:
  'Permission for the Notification API may no longer be requested from a cross-origin iframe. You should consider requesting permission from a top-level frame or opening a new window instead.',
  /**
  *@description TODO(crbug.com/1318867): Description needed for translation
  */
  obsoleteWebRtcCipherSuite:
  'Your partner is negotiating an obsolete (D)TLS version. Please check with your partner to have this fixed.',
  /**
  *@description TODO(crbug.com/1320349): Description needed for translation
  */
  paymentRequestBasicCard: 'The `basic-card` payment method is deprecated and will be removed.',
  /**
  *@description TODO(crbug.com/1320350): Description needed for translation
  */
  paymentRequestShowWithoutGesture:
  'Calling `PaymentRequest.show()` without user activation is deprecated and will be removed.',
  /**
  *@description This issue indicates that a `<source>` element with a `<picture>` parent was using an `src` attribute, which is not valid and is ignored by the browser. The `srcset` attribute should be used instead.
  */
  pictureSourceSrc:
  '`<source src>` with a `<picture>` parent is invalid and therefore ignored. Please use `<source srcset>` instead.',
  /**
  *@description Warning displayed to developers when the vendor-prefixed method is used rather than the equivalent unprefixed method.
  */
  prefixedCancelAnimationFrame:
  '`webkitCancelAnimationFrame` is vendor-specific. Please use the standard `cancelAnimationFrame` instead.',
  /**
  *@description Warning displayed to developers when the vendor-prefixed method is used rather than the equivalent unprefixed method.
  */
  prefixedRequestAnimationFrame:
  '`webkitRequestAnimationFrame` is vendor-specific. Please use the standard `requestAnimationFrame` instead.',
  /**
  *@description TODO(crbug.com/1320351): Description needed for translation
  */
  prefixedStorageInfo:
  '`window.webkitStorageInfo` is deprecated. Please use `navigator.webkitTemporaryStorage` or `navigator.webkitPersistentStorage` instead.',
  /**
  *@description TODO(crbug.com/1320352): Description needed for translation
  */
  prefixedVideoDisplayingFullscreen:
  '`HTMLVideoElement.webkitDisplayingFullscreen` is deprecated. Please use `Document.fullscreenElement` instead.',
  /**
  *@description TODO(crbug.com/1320353): Description needed for translation
  */
  prefixedVideoEnterFullScreen:
  '`HTMLVideoElement.webkitEnterFullScreen()` is deprecated. Please use `Element.requestFullscreen()` instead.',
  /**
  *@description TODO(crbug.com/1320353): Description needed for translation
  */
  prefixedVideoEnterFullscreen:
  '`HTMLVideoElement.webkitEnterFullscreen()` is deprecated. Please use `Element.requestFullscreen()` instead.',
  /**
  *@description TODO(crbug.com/1320354): Description needed for translation
  */
  prefixedVideoExitFullScreen:
  '`HTMLVideoElement.webkitExitFullsSreen()` is deprecated. Please use `Document.exitFullscreen()` instead.',
  /**
  *@description TODO(crbug.com/1320354): Description needed for translation
  */
  prefixedVideoExitFullscreen:
  '`HTMLVideoElement.webkitExitFullscreen()` is deprecated. Please use `Document.exitFullscreen()` instead.',
  /**
  *@description TODO(crbug.com/1320355): Description needed for translation
  */
  prefixedVideoSupportsFullscreen:
  '`HTMLVideoElement.webkitSupportsFullscreen` is deprecated. Please use `Document.fullscreenEnabled` instead.',
  /**
  *@description TODO(crbug.com/1320356): Description needed for translation
  */
  rangeExpand: '`Range.expand()` is deprecated. Please use `Selection.modify()` instead.',
  /**
  *@description TODO(crbug.com/1320357): Description needed for translation
  */
  requestedSubresourceWithEmbeddedCredentials:
  'Subresource requests whose URLs contain embedded credentials (e.g. `https://user:pass@host/`) are blocked.',
  /**
  *@description TODO(crbug.com/1318872): Description needed for translation
  */
  rtcConstraintEnableDtlsSrtpFalse:
  'The constraint `DtlsSrtpKeyAgreement` is removed. You have specified a `false` value for this constraint, which is interpreted as an attempt to use the removed `SDES` key negotiation method. This functionality is removed; use a service that supports DTLS key negotiation instead.',
  /**
  *@description TODO(crbug.com/1318873): Description needed for translation
  */
  rtcConstraintEnableDtlsSrtpTrue:
  'The constraint `DtlsSrtpKeyAgreement` is removed. You have specified a `true` value for this constraint, which had no effect, but you can remove this constraint for tidiness.',
  /**
  *@description TODO(crbug.com/1318874): Description needed for translation
  */
  rtcPeerConnectionComplexPlanBSdpUsingDefaultSdpSemantics:
  'Complex Plan B SDP detected! Chrome will switch the default `sdpSemantics` from `plan-b` to the standardized `unified-plan` format and this peer connection is relying on the default `sdpSemantics`. This SDP is not compatible with Unified Plan and will be rejected by clients expecting Unified Plan. For more information about how to prepare for the switch, see https://webrtc.org/web-apis/chrome/unified-plan/.',
  /**
  *@description TODO(crbug.com/1318875): Description needed for translation
  */
  rtcPeerConnectionLegacyCreateWithMediaConstraints:
  'The `mediaConstraints` version of `RTCOfferOptions/RTCAnswerOptions` are deprecated and will soon be removed, please migrate to the promise-based `createOffer`/`createAnswer` instead.',
  /**
  *@description TODO(crbug.com/1320358): Description needed for translation
  */
  rtcPeerConnectionSdpSemanticsPlanB:
  'Plan B SDP semantics, which is used when constructing an `RTCPeerConnection` with `{sdpSemantics:\'plan-b\'}`, is a legacy non-standard version of the Session Description Protocol that has been permanently deleted from the Web Platform. It is still available when building with IS_FUCHSIA, but we intend to delete it as soon as possible. Stop depending on it. See https://crbug.com/1302249 for status.',
  /**
  *@description TODO(crbug.com/1320360): Description needed for translation
  */
  rtcpMuxPolicyNegotiate: 'The `rtcpMuxPolicy` option is deprecated and will be removed.',
  /**
  *@description TODO(crbug.com/1318876): Description needed for translation
  */
  rtpDataChannel:
  'RTP data channels are no longer supported. The `RtpDataChannels` constraint is currently ignored, and may cause an error at a later date.',
  /**
  *@description TODO(crbug.com/1320361): Description needed for translation
  */
  selectionAddRangeIntersect:
  'The behavior that `Selection.addRange()` merges existing Range and the specified Range was removed.',
  /**
  *@description TODO(crbug.com/1318878): Description needed for translation
  */
  sharedArrayBufferConstructedWithoutIsolation:
  '`SharedArrayBuffer` will require cross-origin isolation. See https://developer.chrome.com/blog/enabling-shared-array-buffer/ for more details.',
  /**
  *@description TODO(crbug.com/1320363): Description needed for translation
  */
  textToSpeech_DisallowedByAutoplay:
  '`speechSynthesis.speak()` without user activation is deprecated and will be removed.',
  /**
  *@description TODO(crbug.com/1318879): Description needed for translation
  */
  v8SharedArrayBufferConstructedInExtensionWithoutIsolation:
  'Extensions should opt into cross-origin isolation to continue using `SharedArrayBuffer`. See https://developer.chrome.com/docs/extensions/mv3/cross-origin-isolation/.',
  /**
  *@description TODO(crbug.com/1318880): Description needed for translation
  */
  webCodecsVideoFrameDefaultTimestamp:
  'Constructing a `VideoFrame` without a timestamp is deprecated and support will be removed. Please provide a timestamp via `VideoFrameInit`.',
  /**
  *@description TODO(crbug.com/1318881): Description needed for translation
  */
  xhrJSONEncodingDetection: 'UTF-16 is not supported by response json in `XMLHttpRequest`',
  /**
  *@description TODO(crbug.com/1318882): Description needed for translation
  */
  xmlHttpRequestSynchronousInNonWorkerOutsideBeforeUnload:
  'Synchronous `XMLHttpRequest` on the main thread is deprecated because of its detrimental effects to the end user\u2019s experience. For more help, check https://xhr.spec.whatwg.org/.',
  /**
  *@description TODO(crbug.com/1320365): Description needed for translation
  */
  xrSupportsSession:
  '`supportsSession()` is deprecated. Please use `isSessionSupported()` and check the resolved boolean value instead.',
  /** ... */
  unknownDeprecation: '...',
};
/* eslint-enable max-len */

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/**
 * @param {LH.Crdp.Audits.DeprecationIssueDetails} deprecation
 */
function getMeta(deprecation) {
  let message;
  let feature = 0;
  let milestone = 0;
  // @ts-expect-error
  const legacyMessage = /** @type {string=} */ (deprecation.message);

  switch (deprecation.type) {
    case 'AuthorizationCoveredByWildcard':
      message = str_(UIStrings.authorizationCoveredByWildcard);
      milestone = 97;
      break;
    case 'CanRequestURLHTTPContainingNewline':
      message = str_(UIStrings.canRequestURLHTTPContainingNewline);
      feature = 5735596811091968;
      break;
    case 'ChromeLoadTimesConnectionInfo':
      message = str_(UIStrings.chromeLoadTimesConnectionInfo);
      feature = 5637885046816768;
      break;
    case 'ChromeLoadTimesFirstPaintAfterLoadTime':
      message = str_(UIStrings.chromeLoadTimesFirstPaintAfterLoadTime);
      feature = 5637885046816768;
      break;
    case 'ChromeLoadTimesWasAlternateProtocolAvailable':
      message = str_(UIStrings.chromeLoadTimesWasAlternateProtocolAvailable);
      feature = 5637885046816768;
      break;
    case 'CookieWithTruncatingChar':
      message = str_(UIStrings.cookieWithTruncatingChar);
      milestone = 103;
      break;
    case 'CrossOriginAccessBasedOnDocumentDomain':
      message = str_(UIStrings.crossOriginAccessBasedOnDocumentDomain);
      milestone = 106;
      break;
    case 'CrossOriginWindowAlert':
      message = str_(UIStrings.crossOriginWindowAlert);
      break;
    case 'CrossOriginWindowConfirm':
      message = str_(UIStrings.crossOriginWindowConfirm);
      break;
    case 'CSSSelectorInternalMediaControlsOverlayCastButton':
      message = str_(UIStrings.cssSelectorInternalMediaControlsOverlayCastButton);
      feature = 5714245488476160;
      break;
    case 'CustomCursorIntersectsViewport':
      message = str_(UIStrings.customCursorIntersectsViewport);
      feature = 5825971391299584;
      milestone = 75;
      break;
    case 'DocumentDomainSettingWithoutOriginAgentClusterHeader':
      message = str_(UIStrings.documentDomainSettingWithoutOriginAgentClusterHeader);
      milestone = 106;
      break;
    case 'EventPath':
      message = str_(UIStrings.eventPath);
      feature = 5726124632965120;
      milestone = 109;
      break;
    case 'GeolocationInsecureOrigin':
      message = str_(UIStrings.geolocationInsecureOrigin);
      break;
    case 'GeolocationInsecureOriginDeprecatedNotRemoved':
      message = str_(UIStrings.geolocationInsecureOriginDeprecatedNotRemoved);
      break;
    case 'GetUserMediaInsecureOrigin':
      message = str_(UIStrings.getUserMediaInsecureOrigin);
      break;
    case 'HostCandidateAttributeGetter':
      message = str_(UIStrings.hostCandidateAttributeGetter);
      break;
    case 'InsecurePrivateNetworkSubresourceRequest':
      message = str_(UIStrings.insecurePrivateNetworkSubresourceRequest);
      feature = 5436853517811712;
      milestone = 92;
      break;
    case 'LegacyConstraintGoogCpuOveruseDetection':
      message = str_(UIStrings.legacyConstraintGoogCpuOveruseDetection);
      milestone = 103;
      break;
    case 'LegacyConstraintGoogIPv6':
      message = str_(UIStrings.legacyConstraintGoogIPv6);
      milestone = 103;
      break;
    case 'LegacyConstraintGoogScreencastMinBitrate':
      message = str_(UIStrings.legacyConstraintGoogScreencastMinBitrate);
      milestone = 103;
      break;
    case 'LegacyConstraintGoogSuspendBelowMinBitrate':
      message = str_(UIStrings.legacyConstraintGoogSuspendBelowMinBitrate);
      milestone = 103;
      break;
    case 'LocalCSSFileExtensionRejected':
      message = str_(UIStrings.localCSSFileExtensionRejected);
      milestone = 64;
      break;
    case 'MediaElementAudioSourceNode':
      message = str_(UIStrings.mediaElementAudioSourceNode);
      feature = 5258622686724096;
      milestone = 71;
      break;
    case 'MediaSourceAbortRemove':
      message = str_(UIStrings.mediaSourceAbortRemove);
      feature = 6107495151960064;
      break;
    case 'MediaSourceDurationTruncatingBuffered':
      message = str_(UIStrings.mediaSourceDurationTruncatingBuffered);
      feature = 6107495151960064;
      break;
    case 'NoSysexWebMIDIWithoutPermission':
      message = str_(UIStrings.noSysexWebMIDIWithoutPermission);
      feature = 5138066234671104;
      milestone = 82;
      break;
    case 'NotificationInsecureOrigin':
      message = str_(UIStrings.notificationInsecureOrigin);
      break;
    case 'NotificationPermissionRequestedIframe':
      message = str_(UIStrings.notificationPermissionRequestedIframe);
      feature = 6451284559265792;
      break;
    case 'ObsoleteWebRtcCipherSuite':
      message = str_(UIStrings.obsoleteWebRtcCipherSuite);
      milestone = 81;
      break;
    case 'PaymentRequestBasicCard':
      message = str_(UIStrings.paymentRequestBasicCard);
      feature = 5730051011117056;
      milestone = 100;
      break;
    case 'PaymentRequestShowWithoutGesture':
      message = str_(UIStrings.paymentRequestShowWithoutGesture);
      feature = 5948593429020672;
      milestone = 102;
      break;
    case 'PictureSourceSrc':
      message = str_(UIStrings.pictureSourceSrc);
      break;
    case 'PrefixedCancelAnimationFrame':
      message = str_(UIStrings.prefixedCancelAnimationFrame);
      break;
    case 'PrefixedRequestAnimationFrame':
      message = str_(UIStrings.prefixedRequestAnimationFrame);
      break;
    case 'PrefixedStorageInfo':
      message = str_(UIStrings.prefixedStorageInfo);
      break;
    case 'PrefixedVideoDisplayingFullscreen':
      message = str_(UIStrings.prefixedVideoDisplayingFullscreen);
      break;
    case 'PrefixedVideoEnterFullScreen':
      message = str_(UIStrings.prefixedVideoEnterFullScreen);
      break;
    case 'PrefixedVideoEnterFullscreen':
      message = str_(UIStrings.prefixedVideoEnterFullscreen);
      break;
    case 'PrefixedVideoExitFullScreen':
      message = str_(UIStrings.prefixedVideoExitFullScreen);
      break;
    case 'PrefixedVideoExitFullscreen':
      message = str_(UIStrings.prefixedVideoExitFullscreen);
      break;
    case 'PrefixedVideoSupportsFullscreen':
      message = str_(UIStrings.prefixedVideoSupportsFullscreen);
      break;
    case 'RangeExpand':
      message = str_(UIStrings.rangeExpand);
      break;
    case 'RequestedSubresourceWithEmbeddedCredentials':
      message = str_(UIStrings.requestedSubresourceWithEmbeddedCredentials);
      feature = 5669008342777856;
      break;
    case 'RTCConstraintEnableDtlsSrtpFalse':
      message = str_(UIStrings.rtcConstraintEnableDtlsSrtpFalse);
      milestone = 97;
      break;
    case 'RTCConstraintEnableDtlsSrtpTrue':
      message = str_(UIStrings.rtcConstraintEnableDtlsSrtpTrue);
      milestone = 97;
      break;
    case 'RTCPeerConnectionComplexPlanBSdpUsingDefaultSdpSemantics':
      message = str_(UIStrings.rtcPeerConnectionComplexPlanBSdpUsingDefaultSdpSemantics);
      milestone = 72;
      break;
    case 'RTCPeerConnectionLegacyCreateWithMediaConstraints':
      message = str_(UIStrings.rtcPeerConnectionLegacyCreateWithMediaConstraints);
      milestone = 103;
      break;
    case 'RTCPeerConnectionSdpSemanticsPlanB':
      message = str_(UIStrings.rtcPeerConnectionSdpSemanticsPlanB);
      feature = 5823036655665152;
      milestone = 93;
      break;
    case 'RtcpMuxPolicyNegotiate':
      message = str_(UIStrings.rtcpMuxPolicyNegotiate);
      feature = 5654810086866944;
      milestone = 62;
      break;
    case 'RTPDataChannel':
      message = str_(UIStrings.rtpDataChannel);
      milestone = 88;
      break;
    case 'SelectionAddRangeIntersect':
      message = str_(UIStrings.selectionAddRangeIntersect);
      feature = 6680566019653632;
      break;
    case 'SharedArrayBufferConstructedWithoutIsolation':
      message = str_(UIStrings.sharedArrayBufferConstructedWithoutIsolation);
      milestone = 106;
      break;
    case 'TextToSpeech_DisallowedByAutoplay':
      message = str_(UIStrings.textToSpeech_DisallowedByAutoplay);
      feature = 5687444770914304;
      milestone = 71;
      break;
    case 'V8SharedArrayBufferConstructedInExtensionWithoutIsolation':
      message = str_(UIStrings.v8SharedArrayBufferConstructedInExtensionWithoutIsolation);
      milestone = 96;
      break;
    case 'WebCodecsVideoFrameDefaultTimestamp':
      message = str_(UIStrings.webCodecsVideoFrameDefaultTimestamp);
      feature = 5667793157488640;
      milestone = 99;
      break;
    case 'XHRJSONEncodingDetection':
      message = str_(UIStrings.xhrJSONEncodingDetection);
      milestone = 93;
      break;
    case 'XMLHttpRequestSynchronousInNonWorkerOutsideBeforeUnload':
      message = str_(UIStrings.xmlHttpRequestSynchronousInNonWorkerOutsideBeforeUnload);
      break;
    case 'XRSupportsSession':
      message = str_(UIStrings.xrSupportsSession);
      milestone = 80;
      break;
    default:
      message = legacyMessage || str_(UIStrings.unknownDeprecation);
      break;
  }

  return {
    message,
    milestone,
    feature,
  };
}

class Deprecations extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'deprecations',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['InspectorIssues', 'SourceMaps', 'Scripts'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const bundles = await JsBundles.request(artifacts, context);

    const deprecations = artifacts.InspectorIssues.deprecationIssue
      .map(deprecation => {
        const {scriptId, url, lineNumber, columnNumber} = deprecation.sourceCodeLocation;
        const bundle = bundles.find(bundle => bundle.script.scriptId === scriptId);
        const deprecationMeta = getMeta(deprecation);

        const links = [];
        if (deprecationMeta.feature) {
          links.push({
            type: 'link',
            url: `https://chromestatus.com/feature/${deprecationMeta.feature}`,
            text: str_(UIStrings.feature),
          });
        }
        if (deprecationMeta.milestone) {
          links.push({
            type: 'link',
            url: 'https://chromiumdash.appspot.com/schedule',
            text: str_(UIStrings.milestone, {milestone: deprecationMeta.milestone}),
          });
        }

        /** @type {LH.Audit.Details.TableSubItems=} */
        let subItems = undefined;
        if (links.length) {
          subItems = {
            type: 'subitems',
            items: links,
          };
        }

        /** @type {LH.Audit.Details.TableItem} */
        const item = {
          value: deprecationMeta.message || '',
          // Protocol.Audits.SourceCodeLocation.columnNumber is 1-indexed, but we use 0-indexed.
          source: Audit.makeSourceLocation(url, lineNumber, columnNumber - 1, bundle),
          subItems,
        };
        return item;
      });

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'value', itemType: 'text', text: str_(UIStrings.columnDeprecate)},
      {key: 'source', itemType: 'source-location', text: str_(i18n.UIStrings.columnSource)},
    ];
    const details = Audit.makeTableDetails(headings, deprecations);

    let displayValue;
    if (deprecations.length > 0) {
      displayValue = str_(UIStrings.displayValue, {itemCount: deprecations.length});
    }

    return {
      score: Number(deprecations.length === 0),
      displayValue,
      details,
    };
  }
}

module.exports = Deprecations;
module.exports.UIStrings = UIStrings;
