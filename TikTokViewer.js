// ==UserScript==
// @name         TikTok Viewer
// @namespace    Dj Frixz
// @source       https://github.com/Dj-Frixz/userscripts
// @downloadURL  https://raw.githubusercontent.com/Dj-Frixz/userscripts/refs/heads/main/TikTokViewer.js
// @updateURL    https://raw.githubusercontent.com/Dj-Frixz/userscripts/refs/heads/main/TikTokViewer.js
// @version      1.2
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
