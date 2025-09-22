// ==UserScript==
// @name         TikTok Viewer
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Lets you open tiktok links on the browser without an account.
// @author       Dj Frixz
// @match        https://www.tiktok.com/login?redirect_url=*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    const match = window.location.href.match(/(?<=F)\d+/);
    if (match) {
        const videoId = match[0];
        const newUrl = "https://www.tiktok.com/embed/v3/" + videoId;
        window.location.replace(newUrl);
    }
})();
