// ==UserScript==
// @name         TikTok Viewer
// @namespace    Dj Frixz
// @source       https://github.com/Dj-Frixz/userscripts
// @downloadURL  https://raw.githubusercontent.com/Dj-Frixz/userscripts/refs/heads/main/TikTok%20Viewer/TikTokViewer.js
// @updateURL    https://raw.githubusercontent.com/Dj-Frixz/userscripts/refs/heads/main/TikTok%20Viewer/TikTokViewer.js
// @version      1.3.7-prerelease
// @description  Lets you open tiktok links on the browser without an account.
// @author       Dj Frixz
// @match        https://www.tiktok.com/login?redirect_url=*
// @match        https://www.tiktok.com/@*/video/*
// @match        https://www.tiktok.com/@*/photo/*
// @match        https://www.tiktok.com/embed/v3/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @connect      tiktok.com
// ==/UserScript==

(function() {
    'use strict';
    // looking for a video id in the url
    const match = location.href.match(/(?:video|photo|embed\/v3)(?:\/|%2F)(\d{15,})/); // id is the 1st capturing group, so it's [1]

    if (!match) {
        console.warn("TikTok Viewer: no video ID found.");
    }

    // REDIRECTION --- tiktok login page | tiktok mobile preview => content
    // second condition is to redirect while in mobile preview. 768px for phones only, 1024px includes tablets
    else if (location.pathname === '/login' || (window.matchMedia('(max-width: 1024px)').matches && !location.pathname.startsWith("/embed/v3/"))) {
        console.log("TikTok Viewer is redirecting...");
        const newUrl = "https://www.tiktok.com/embed/v3/" + match[1]; // the video ID (why [1]? read above or below)
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
                body {font-size: 14px; color: rgb(22, 24, 35); direction: ltr;}
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
                    transform: translateY(100%); border-radius: 12px 12px 0px 0px; display: flex;
                    flex-direction: column; transition: transform 0.3s;
                } .opened {transform: translateY(0);}
                .comment-header {
                    padding: 16px 20px; border-bottom: medium; font-weight: 500;
                    line-height: 24px; display: flex; -moz-box-pack: center;
                    justify-content: center; -moz-box-align: center; align-items: center;
                }
                .button-close {
                    position: absolute; top: 16px; width: 24px; height: 24px; z-index: 2;
                    display: flex; -moz-box-pack: center; justify-content: center; font-weight: bold;
                    -moz-box-align: center; align-items: center; right: 16px; font-size: large;
                }
                .comment-list {
                    flex: 1; overflow-y: auto; padding: 0px; overflow: auto;
                    max-height: calc(-53px + 73vh); scrollbar-width: thin;
                    scrollbar-color: #ccc transparent;
                }
                .comment {
                    display: flex; align-items: flex-start; margin-bottom: 12px; line-height: 17px;
                    padding: 8px; padding-inline-start: 12px;
                }
                .comment img {
                    width: 36px; height: 36px; border-radius: 50%; margin-right: 12px; flex: 0 0 32px;
                }
                .comment-body {
                    flex: 1;
                }
                .comment-name {
                    color: rgba(22, 24, 35, 0.5); font-size: 13px; font-weight: 700;
                }
                .comment-text {font-size: 15px; line-height: 18px; padding-top: 2px;}
                .comment-time {margin-top: 4px; font-size: 13px; color: #16182380;}
                .comment-likes {
                    width: 40px; height: 40px; flex: 0 0 40px; display: flex; flex-direction: column;
                    -moz-box-pack: center; justify-content: center; -moz-box-align: center;
                    align-items: center; top: 0px; right: -16px; color: #16182380; font-size: 13px;
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
                panel.appendChild(closeBtn);
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

                header.addEventListener("touchstart", e => {
                    if (e.touches.length !== 1) return;
                    dragging = true;
                    startY = e.touches[0].clientY;
                    currentY = startY;
                    panel.style.transition = "none";
                });
                header.addEventListener("touchmove", e => {
                    if (!dragging) return;
                    currentY = e.touches[0].clientY;
                    let delta = currentY - startY;
                    if (delta > 0) panel.style.transform = `translateY(${delta}px)`;
                });
                header.addEventListener("touchend", () => {
                    if (!dragging) return;
                    dragging = false;
                    panel.removeAttribute("style");
                    if (currentY - startY > 100) closePanel();
                });

                const timeAgo = (ts, now) => {
                    const s = Math.floor(now - ts);
                    const today = new Date(now * 1000);
                    const day = new Date(ts * 1000);
                    if (s < 5) return "just now";
                    return s < 60 ? `${s}s` :
                           s < 3600 ? `${Math.floor(s / 60)}m` :
                           s < 86400 ? `${Math.floor(s / 3600)}h` :
                           s < 2592000 ? `${Math.floor(s / 86400)}d` :
                           s < 31536000 ? `${today.getUTCMonth() - day.getUTCMonth()}mo` :
                           `${today.getUTCFullYear() - day.getUTCFullYear()}y`;
                }
                function addComment(c, now) { // c is the comment object
                    now = now / 1000;
                    const comment = document.createElement("div");
                    const creatorLike = c.is_author_digged ? `&emsp;&#183;&emsp;<span style="color:#000">&#10084;&#65039;</span> by creator` : '';
                    comment.className = "comment";
                    comment.innerHTML = `
                    <img src="${c.user?.avatar_thumb?.url_list?.[0] || 'https://www.tiktok.com/favicon.ico'}" alt="Avatar">
                    <div class="comment-body">
                        <div class="comment-name">${(c.user?.nickname || "Unknown")}</div>
                        <p class="comment-text">${c.text || "<br>"}</p>
                        <div class=comment-time>${timeAgo(c.create_time || now, now) + creatorLike}</div>
                    </div>
                    <div class="comment-likes"><svg width="20" data-e2e="" height="20" viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M24 9.01703C19.0025 3.74266 11.4674 3.736 6.67302 8.56049C1.77566 13.4886 1.77566 21.4735 6.67302 26.4016L22.5814 42.4098C22.9568 42.7876 23.4674 43 24 43C24.5326 43 25.0432 42.7876 25.4186 42.4098L41.327 26.4016C46.2243 21.4735 46.2243 13.4886 41.327 8.56049C36.5326 3.736 28.9975 3.74266 24 9.01703ZM21.4938 12.2118C17.9849 8.07195 12.7825 8.08727 9.51028 11.3801C6.16324 14.7481 6.16324 20.214 9.51028 23.582L24 38.1627L38.4897 23.582C41.8368 20.214 41.8368 14.7481 38.4897 11.3801C35.2175 8.08727 30.0151 8.07195 26.5062 12.2118L26.455 12.2722L25.4186 13.3151C25.0432 13.6929 24.5326 13.9053 24 13.9053C23.4674 13.9053 22.9568 13.6929 22.5814 13.3151L21.545 12.2722L21.4938 12.2118Z"></path></svg>
                    ${c.digg_count || "&emsp;"}</div>`;
                    
                    list.appendChild(comment);
                }

                let hasMore = false; // if more comments are available
                let cursor = 0; // pagination cursor
                let isLoading = false; // to prevent multiple simultaneous requests
                const KNumbering = n => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : n;

                function getComments() {
                    isLoading = true;
                    GM_xmlhttpRequest({ // getting comments from TikTok API
                        method: "GET",
                        url: `https://www.tiktok.com/api/comment/list/?aid=1988&aweme_id=${videoID}&count=40&cursor=${cursor}`,
                        onload: function(response) {
                            console.log("Response status:", response.status, "(while retrieving comments).")
                            try {
                                const json = JSON.parse(response.responseText);
                                hasMore = json.has_more;
                                comments = json.comments || [];
                                console.log(`Found a total of ${cursor + comments.length} comments.`);
                                header.innerText = `${KNumbering(json.total || 0)} Comments (${cursor + comments.length} loaded)`;
                                cursor = json.cursor || 0;
                                comments.forEach(c => addComment(c, comments?.extra?.now || Date.now()));
                            } catch(e) {
                                console.error('Parsing (of comments) failed:', e);
                            } finally {isLoading = false;}
                        },
                        onerror: function(e) {
                            console.error("Request failed:", e); isLoading = false;
                        },
                        onabort: function(e) {
                            console.error("Request aborted:", e); isLoading = false;
                        },
                        ontimeout: function(e) {
                            console.error("Request timed out:", e); isLoading = false;
                        }
                    });
                }
                getComments();
                list.addEventListener("scroll", () => {
                    if (!isLoading && list.scrollTop + list.clientHeight >= list.scrollHeight - 10) {
                        if (hasMore) { // more comments available
                            console.log("Fetching more comments...");
                            getComments();
                        }
                    }
                });

                (async () => {
                    // modifying the comment button to open the custom panel
                    let svg = document.querySelector('svg[aria-label="Comment this post on TikTok"]');
                    let tries = 1;
                    while (!svg && tries < 30) { // wait 9s or until the button is loaded
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