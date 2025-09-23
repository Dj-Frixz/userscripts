// ==UserScript==
// @name         TikTok Viewer
// @namespace    Dj Frixz
// @source       https://github.com/Dj-Frixz/userscripts
// @downloadURL  https://raw.githubusercontent.com/Dj-Frixz/userscripts/refs/heads/main/TikTok%20Viewer/TikTokViewer.js
// @updateURL    https://raw.githubusercontent.com/Dj-Frixz/userscripts/refs/heads/main/TikTok%20Viewer/TikTokViewer.js
// @version      1.3.2 pre-release
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
                .comment-panel-container {
                    user-select: none; -webkit-user-select: none; pointer-events: none;
                    inset: 0; position: fixed; z-index: 3001; overflow: hidden;
                }
                .comment-backdrop {
                    inset: 0; position: absolute; opacity: 0;
                    transition: opacity 0.3s; background: rgba(0, 0, 0, 0.5);
                    box-shadow: rgba(0, 0, 0, 0.06) 0px 2px 8px;
                } .darkened {pointer-events: auto; -webkit-user-select: auto; opacity: 1;}
                .comment-panel {
                    pointer-events: auto; -webkit-user-select: none; position: absolute;
                    left: 0px; bottom: 0px; width: 100%; max-height: 73vh; background: #fff;
                    transform: none; border-radius: 12px 12px 0px 0px; transition: transform 0.3s;
                    display: flex; flex-direction: column; transform: translateY(100%);
                } .opened {transform: translateY(0);}
                .comment-header {
                    padding: 16px 20px; border-bottom: medium; font-weight: 500;
                    line-height: 24px; display: flex; -moz-box-pack: center;
                    justify-content: center; -moz-box-align: center; align-items: center;
                }
                .button-close {
                    position: absolute; top: 16px; width: 24px; height: 24px; z-index: 2;
                    display: flex; -moz-box-pack: center; justify-content: center;
                    -moz-box-align: center; align-items: center; right: 16px;
                }
                .comment-list {
                    flex: 1; overflow-y: auto; padding: 0px; overflow: auto;
                    max-height: calc(-53px + 73vh); scrollbar-width: thin;
                    scrollbar-color: #ccc transparent;
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
                const container = document.createElement("div");
                container.className = "comment-panel-container";

                const backdrop = document.createElement("div");
                backdrop.className = "comment-backdrop";

                const panel = document.createElement("div");
                panel.className = "comment-panel";

                const header = document.createElement("div");
                header.className = "comment-header";
                header.innerText = "Comments";

                const closeBtn = document.createElement("div");
                closeBtn.innerHTML = "&#10005;"; // simpler instead of an svg
                closeBtn.className = "button-close";

                const list = document.createElement("div");
                list.className = "comment-list";

                // constructing the panel
                container.appendChild(backdrop);
                container.appendChild(panel);
                panel.appendChild(header);
                header.appendChild(closeBtn);
                panel.appendChild(list);
                document.body.appendChild(container);

                
                function openPanel() {
                    backdrop.classList.add("darkened");
                    panel.classList.add("opened");
                }
                
                function closePanel() {
                    panel.classList.remove("opened");
                    backdrop.classList.remove("darkened");
                }
                
                backdrop.addEventListener("click", closePanel);
                closeBtn.addEventListener("click", closePanel);
                
                // panel drag to close functionality
                let startY = 0, currentY = 0, dragging = false;
                
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
                    let tries = 1;
                    while (!svg && tries < 10) { // wait until the button is loaded
                        tries++;
                        console.log("TikTok Viewer: waiting for the comment button to load...",tries);
                        await new Promise(r => setTimeout(r, 300)); // retry every ~1/3 second
                        svg = document.querySelector('svg[aria-label="Comment this post on TikTok"]');
                    }
                    if (!svg) {
                        console.warn("TikTok Viewer: comment button not found.");
                        return;
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