// ==UserScript==
// @name         TikTok Viewer
// @namespace    Dj Frixz
// @source       https://github.com/Dj-Frixz/userscripts
// @downloadURL  https://raw.githubusercontent.com/Dj-Frixz/userscripts/refs/heads/main/TikTokViewer.js
// @updateURL    https://raw.githubusercontent.com/Dj-Frixz/userscripts/refs/heads/main/TikTokViewer.js
// @version      1.3 pre-release
// @description  Lets you open tiktok links on the browser without an account.
// @author       Dj Frixz
// @match        https://www.tiktok.com/login?redirect_url=*
// @match        https://www.tiktok.com/embed/v3/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @connect      tiktok.com
// ==/UserScript==

(function() {
    'use strict';
    const match = location.href.match(/[%v][23][F\/](\d{15,})/); // looking for a video id

    if (!match) {
        console.warn("TikTok Viewer: no video ID found.")
    }

    // REDIRECTION --- tiktok login page => content
    else if (location.pathname === '/login') { // location.hostname === 'www.tiktok.com'
        console.log("TikTok Viewer is redirecting...");
        const newUrl = "https://www.tiktok.com/embed/v3/" + match[1]; // the video ID (why [1]? read below)
        window.location.replace(newUrl);
    }

    // INTEGRATIONS
    else if (location.pathname.startsWith("/embed/v3/")) { // for now restricted to v3 only
        // retrieve comments
        console.log("TikTok Viewer is getting the comments...");
        const videoID = match[1] // [0] returns the full match, instead [1] gives the 1st capturing group
        let comments = [];

        // adding comments to the page when the html has loaded (interactive state)
        document.onreadystatechange = function () {
            console.log("TikTok Viewer: document readyState is", document.readyState);
            if (document.readyState == "complete") {
                console.log("TikTok Viewer: html has loaded.");
                const style = document.createElement("style");
                style.textContent = `
                .comment-backdrop {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
                    display: none; z-index: 9998;
                }
                .comment-panel {
                    position: fixed; left: 0; right: 0; bottom: 0;
                    height: 60%; background: #fff; border-radius: 16px 16px 0 0;
                    box-shadow: 0 -2px 10px rgba(0,0,0,0.2);
                    transition: transform 0.3s ease;
                    transform: translateY(100%);
                    z-index: 9999; display: flex; flex-direction: column;
                }
                .comment-header {
                    padding: 8px; border-bottom: 1px solid #ddd;
                    display: flex; justify-content: space-between; align-items: center;
                }
                .comment-list {
                    flex: 1; overflow-y: auto; padding: 8px;
                }
                .comment {
                    display: flex; align-items: flex-start; margin-bottom: 12px;
                }
                .comment img {
                    width: 36px; height: 36px; border-radius: 50%; margin-right: 8px;
                }
                .comment-body {
                    flex: 1;
                }
                .comment-name {
                    font-weight: bold; font-size: 14px;
                }
                .comment-text {
                    font-size: 13px; margin: 2px 0;
                }
                `;
                document.head.appendChild(style); // adding styles for the comments panel

                // creating the comments panel elements
                const backdrop = document.createElement("div");
                backdrop.className = "comment-backdrop";

                const panel = document.createElement("div");
                panel.className = "comment-panel";

                const header = document.createElement("div");
                header.className = "comment-header";
                header.innerHTML = `<span>Commenti</span><span id="closeComments">✕</span>`;

                const list = document.createElement("div");
                list.className = "comment-list";

                // constructing the panel
                panel.appendChild(header);
                panel.appendChild(list);
                document.body.appendChild(backdrop);
                document.body.appendChild(panel);

                let startY = 0, currentY = 0, dragging = false;

                function openPanel() {
                    backdrop.style.display = "block";
                    panel.style.transform = "translateY(0)";
                }

                function closePanel() {
                    panel.removeAttribute("style");
                    setTimeout(() => {backdrop.style.display = "none"}, 300);
                }

                function addComment(name, text, likes, time, avatar) {
                    const c = document.createElement("div");
                    c.className = "comment";
                    c.innerHTML = `
                    <img src="${avatar}" alt="Avatar">
                    <div class="comment-body">
                    <div class="comment-name">${name} <small>${time}</small></div>
                    <div class="comment-text">${text}</div>
                    <div style="font-size:12px;color:#888">${likes} ♥</div>
                    </div>`;
                    list.appendChild(c);
                }

                backdrop.addEventListener("click", closePanel);
                header.querySelector("#closeComments").addEventListener("click", closePanel);

                panel.addEventListener("touchstart", e => {
                    if (e.touches.length !== 1) return;
                    dragging = true;
                    startY = e.touches[0].clientY;
                    currentY = startY;
                    panel.style.transition = "none";
                });
                panel.addEventListener("touchmove", e => {
                    if (!dragging) return;
                    currentY = e.touches[0].clientY;
                    let delta = currentY - startY;
                    if (delta > 0) panel.style.transform = `translateY(${delta}px)`;
                });
                panel.addEventListener("touchend", () => {
                    if (!dragging) return;
                    dragging = false;
                    panel.style.transition = "transform 0.3s ease";
                    if (currentY - startY > 100) closePanel();
                    else panel.style.transform = "translateY(0)";
                });

                GM_xmlhttpRequest({ // getting comments from TikTok API
                    method: "GET",
                    url: `https://www.tiktok.com/api/comment/list/?aid=1988&aweme_id=${videoID}&count=100`,
                    onload: function(response) {
                        console.log("Response status:", response.status, "(while retrieving comments).")
                        try {
                            const json = JSON.parse(response.responseText);
                            comments = json.comments || [];
                            console.log(`Found ${comments.length} comments.`);
                            comments.forEach(c =>
                                addComment(
                                    c.user?.nickname || "Unknown",
                                    c.text || "",
                                    c.digg_count || 0,
                                    new Date(c.create_time * 1000).toLocaleString(),
                                    c.user?.avatar_thumb?.url_list?.[0] || 'https://www.tiktok.com/favicon.ico'
                                )
                            );
                        } catch(e) {
                            console.error('Parsing (of comments) failed:', e);
                        }
                    },
                    onerror: function(e) {
                        console.error("Request failed:", e);
                    },
                    onabort: function(e) {
                        console.error("Request aborted:", e);
                    },
                    ontimeout: function(e) {
                        console.error("Request timed out:", e);
                    }
                });

                (async () => {
                    // modifying the comment button to open the custom panel
                    let svg = document.querySelector('svg[aria-label="Comment this post on TikTok"]');
                    while (!svg) { // wait until the button is loaded
                        console.log("TikTok Viewer: waiting for the comment button to load...",svg);
                        await new Promise(r => setTimeout(r, 1000));
                        svg = document.querySelector('svg[aria-label="Comment this post on TikTok"]');
                    }
                    console.log("TikTok Viewer: comment button found, modifying it.");
                    const btn = svg.parentNode;
                    console.log("TikTok Viewer: button is", btn);
                    btn.removeAttribute("href");
                    btn.onclick = e => {
                        e.preventDefault();
                        e.stopPropagation();
                        openPanel();
                    }
                    console.log("TikTok Viewer: new button is", btn);
                })();
            }
        }
    }
})();