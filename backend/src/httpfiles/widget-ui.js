"use strict";

var innovaphone = innovaphone || {};
innovaphone.widgets = innovaphone.widgets || {};
innovaphone.widgets.SidebarWidgetUi = innovaphone.widgets.SidebarWidgetUi || (function (license) {
    const agents = [], pictures = [];
    const InlineSvg = innovaphone.widgets.InlineSvg;
    const getSvgPath = innovaphone.widgets.getSvgPath;
    let displayedId = null, bubbleTimer = null, narrow = null, busy = false, telLink = null, equalPriority = false, showIfNoAgentAvailable = false, textBubble = null, bubbleTextIndex = 0;

    function createElement(tagName, className, title) {
        const element = document.createElement(tagName);
        if (className) element.setAttribute("class", className);
        if (title) element.setAttribute("title", title);
        return element;
    }

    const container = createElement("div", "innovaphone-widget-sidebar-container connected");
    document.body.appendChild(container);
    container.id = "innovaphone-widget-sidebar-container";
    container.addEventListener("click", onContainerClick);

    const main = container.appendChild(createElement("div", "innovaphone-widget-sidebar-horizontal"));
    main.addEventListener("click", onMainClick);
    main.addEventListener("keydown", onMainKeydown);
    main.addEventListener("mouseover", onMainHover);

    const avatar = main.appendChild(createElement("div", "innovaphone-widget-sidebar-avatar"));
    const picture = avatar.appendChild(createElement("img"));
    const status = avatar.appendChild(new InlineSvg("0 0 50 50", "M3.9,34v8H0L3.9,34z", "M0,42h42v8H0V42z"));
    const badge = avatar.appendChild(createElement("div", "badge"));
    const claimBubble = license ? null : avatar.appendChild(new innovaphone.widgets.ClaimBubble()); // claim-bubble (horizontal sidebar only)

    const infoContainer = main.appendChild(createElement("div", "innovaphone-widget-sidebar-info-container"));
    const info = infoContainer.appendChild(createElement("div", "innovaphone-widget-sidebar-info"));
    const infoClaim = license ? null : infoContainer.appendChild(new innovaphone.widgets.Claim()); // inner-claim  (horizontal sidebar only)
    const claim = license ? null : main.appendChild(new innovaphone.widgets.Claim()); // outer-claim (vertical sidebar only)
    const carousel = license ? null : main.appendChild(new innovaphone.widgets.Flip()); // outer-claim (vertical sidebar only)

    let line;
    line = info.appendChild(createElement("div", "innovaphone-widget-sidebar-info-line"));
    const infoName = line.appendChild(createElement("div", "innovaphone-widget-sidebar-info-name"));
    const infoSeparator = line.appendChild(createElement("div", "innovaphone-widget-sidebar-info-separator"));
    const infoDepartment = line.appendChild(createElement("div", "innovaphone-widget-sidebar-info-department"));
    line = info.appendChild(createElement("div", "innovaphone-widget-sidebar-info-line"));
    const infoPresence = line.appendChild(createElement("div", "innovaphone-widget-sidebar-info-presence"));
    const infoPresenceText = line.appendChild(createElement("div", "innovaphone-widget-sidebar-info-presence-text"));
    line = info.appendChild(createElement("div", "innovaphone-widget-sidebar-info-line"));
    const infoEmailAddress = line.appendChild(createElement("div", "innovaphone-widget-sidebar-info-email-address"));
    infoEmailAddress.addEventListener("click", onEmailClick);
    line = info.appendChild(createElement("div", "innovaphone-widget-sidebar-info-line"));
    line.style.marginTop = "15px";
    const infoCompany = line.appendChild(createElement("div", "innovaphone-widget-sidebar-info-company"));
    line = info.appendChild(createElement("div", "innovaphone-widget-sidebar-info-line"));
    const infoStreet = line.appendChild(createElement("div", "innovaphone-widget-sidebar-info-street"));
    line = info.appendChild(createElement("div", "innovaphone-widget-sidebar-info-line"));
    const infoCity = line.appendChild(createElement("div", "innovaphone-widget-sidebar-info-city"));
    line = info.appendChild(createElement("div", "innovaphone-widget-sidebar-info-line"));
    line.style.marginTop = "15px";
    const infoPhonenumber = line.appendChild(createElement("div", "innovaphone-widget-sidebar-info-phonenumber"));
    line = info.appendChild(createElement("div", "innovaphone-widget-sidebar-info-line"));
    const infoFaxnumber = line.appendChild(createElement("div", "innovaphone-widget-sidebar-info-faxnumber"));

    function createTooltip(textId) {
        const tooltip = createElement("div", "btnToolTip");
        if (textId) tooltip.innerText = innovaphone.widgets.widget.getString(textId);
        return tooltip;
    }

    const buttons = main.appendChild(createElement("div", "buttons"));
    const btnCall = buttons.appendChild(createElement("button", "innovaphone-widget-sidebar-btnCall"));
    btnCall.appendChild(new InlineSvg("0 0 20 20", getSvgPath("call")));
    btnCall.appendChild(createTooltip(null));
    btnCall.addEventListener("click", onCallClick);
    btnCall.setAttribute("name", "call");
    const btnVideo = buttons.appendChild(createElement("button", "innovaphone-widget-sidebar-btnVideo"));
    btnVideo.appendChild(new InlineSvg("0 0 20 20", getSvgPath("videocam")));
    btnVideo.appendChild(createTooltip(null));
    btnVideo.addEventListener("click", onVideoClick);
    btnVideo.setAttribute("name", "video");
    const btnChat = buttons.appendChild(createElement("button", "innovaphone-widget-sidebar-btnChat"));
    btnChat.appendChild(new InlineSvg("0 0 20 20", getSvgPath("chat")));
    btnChat.appendChild(createTooltip(null));
    btnChat.addEventListener("click", onChatClick);
    btnChat.setAttribute("name", "chat");
    const btnEmail = buttons.appendChild(createElement("button", "innovaphone-widget-sidebar-btnEmail"));
    btnEmail.appendChild(new InlineSvg("0 0 20 20", getSvgPath("email")));
    btnEmail.appendChild(createTooltip(null));
    btnEmail.addEventListener("click", onEmailClick);
    btnEmail.setAttribute("name", "email");
    const btnLink = buttons.appendChild(createElement("button", "innovaphone-widget-sidebar-btnLink"));
    btnLink.appendChild(new InlineSvg("0 0 20 20", getSvgPath("link")));
    btnLink.appendChild(createTooltip(null));
    btnLink.addEventListener("click", onLinkClick);
    btnLink.setAttribute("name", "link");
    const btnExpand = buttons.appendChild(createElement("button", "innovaphone-widget-sidebar-btnExpand"));
    btnExpand.appendChild(new InlineSvg("0 0 20 20", getSvgPath("up")));
    btnExpand.addEventListener("click", onExpandClick);
    btnExpand.setAttribute("name", "expand");

    const nameDialog = container.appendChild(new innovaphone.widgets.NameDialog());
    const chatDialog = container.appendChild(new innovaphone.widgets.ChatDialog());
    const callDialog = container.appendChild(new innovaphone.widgets.CallDialog());
    const exitDialog = container.appendChild(new innovaphone.widgets.ExitDialog());
    const errorDialog = container.appendChild(new innovaphone.widgets.ErrorDialog());

    setTimeout(function () {
        const avatarSize = 70, claimHeight = license ? 0 : 64, carouselHeight = license ? 0 : 64;
        main.style.setProperty("--avatar-size", avatarSize + "px");
        main.style.setProperty("--sidebar-height", avatarSize + claimHeight + "px");
        main.style.setProperty("--sidebar-padding-bottom", carouselHeight + "px");
    });

    function expand() {
        if (!main.classList.contains("open")) {
            main.classList.add("open");
            container.classList.add("shaded"), container.classList.add("clickable");
            if (claimBubble) claimBubble.classList.add("invisible");
            if (claimBubble) claimBubble.classList.remove("bottom");
            if (textBubble) textBubble.remove(), textBubble = null;
            badge.style.opacity = "0";
            return true;
        }
    }

    function collapse() {
        const avatarSize = 70, claimHeight = license ? 0 : 64, carouselHeight = license ? 0 : 64;
        if (main.classList.contains("open")) {
            main.classList.remove("open");
            main.classList.remove("expanded");
            main.style.setProperty("--sidebar-width", avatarSize + "px");
            main.style.setProperty("--sidebar-height", avatarSize + claimHeight + "px");
            main.style.setProperty("--sidebar-padding-bottom", carouselHeight + "px");
            if (nameDialog.classList.contains("visible")) {
                showElement(main);
            }
            const inChat = chatDialog.classList.contains("visible");
            const inCall = callDialog.classList.contains("visible");
            if (inChat || inCall) container.classList.add("clickable");
            else container.classList.remove("clickable");
            container.classList.remove("shaded");
            if (claimBubble) claimBubble.classList.remove("invisible");
            showTextBubble(10000);
            return true;
        }
    }

    function showTextBubble(delay) {
        if (bubbleTimer) clearTimeout(bubbleTimer);
        bubbleTimer = setTimeout(onBubbleTimer, delay);
        bubbleTextIndex = 0;
        function onBubbleTimer() {
            const bubbleText = innovaphone.widgets.widget.getBubbleText();
            console.debug("SidebarWidgetUi::onBubbleTimer() bubbleText=" + bubbleText);
            if (bubbleText) {
                if (textBubble) {
                    textBubble.classList.add("invisible"); // fade-out old text
                    const duration = parseFloat(getComputedStyle(textBubble)["transitionDuration"]) * 1000;
                    setTimeout(function (textBubble) { textBubble.remove() }, duration, textBubble);
                    textBubble = null;
                }
                if (bubbleText.strings && bubbleText.strings.length) {
                    if (bubbleTextIndex >= bubbleText.strings.length) bubbleTextIndex = 0;
                    const string = bubbleText.strings[bubbleTextIndex++];
                    const timeout = (bubbleText.timeout || 30) * 1000;
                    textBubble = avatar.appendChild(createElement("div", "textBubble invisible"));
                    textBubble.innerText = string;
                    if (bubbleText.strings.length > 1) {
                        bubbleTimer = setTimeout(onBubbleTimer, timeout);
                    }
                }
            }
            else {
                // old-style widget without bubbleText config
                textBubble = textBubble || avatar.appendChild(createElement("div", "textBubble invisible"));
                textBubble.innerText = innovaphone.widgets.widget.getString("needHelpQuestion");
            }
            if (!main.classList.contains("open")) {
                setTimeout(function () {
                    if (textBubble && claimBubble) textBubble.classList.add("top"), claimBubble.classList.add("bottom");
                    if (textBubble) textBubble.classList.remove("invisible");
                    badge.style.opacity = "1";
                }, 10);
            }
        }
    }

    function showElement(element) {
        // main | nameDialog | chatDialog | callDialog | exitDialog | errorDialog | none
        [main, nameDialog, chatDialog, callDialog, exitDialog, errorDialog].forEach(function (e) {
            if (e === element) e.classList.add("visible");
            else e.classList.remove("visible");
        });
        // set 'busy' if chatDialog, callDialog or exitDialog is displayed
        busy = [chatDialog, callDialog, exitDialog].includes(element);
        container.setAttribute("busy", busy);
    }

    function onContainerClick(ev) {
        if (ev.srcElement === container) {
            if (collapse()) ev.stopPropagation();
        }
    }

    function onMainClick(ev) {
        ev.stopPropagation();
        expand();
    }

    function onMainHover(ev) {
    }

    function onMainKeydown(ev) {
        if (ev.code === "Escape") {
            if (collapse()) ev.stopPropagation();
        }
    }

    function onCallClick(ev) {
        const fixedCallerName = innovaphone.widgets.widget.getOption("fixedCallerName");
        if (fixedCallerName) startCall(fixedCallerName);
        else {
            showElement(nameDialog);
            nameDialog.init(innovaphone.widgets.widget.getString("startCall"));
            nameDialog.onOkay = function (dn) { dn && displayedId ? startCall(dn) : showElement(main) }
            nameDialog.onCancel = function () { showElement(main) }
        }
        function startCall(dn) {
            const agent = agents[displayedId];
            const picture = pictures[displayedId];
            callDialog.init(agent.dn || agent.id, agent.department, agent.company, picture, false, license);
            callDialog.onInit = function (audioTrack, videoTrack) {
                innovaphone.widgets.widget.startCall(callDialog, dn, agent.id, audioTrack, videoTrack);
            }
            callDialog.onExit = function (state, cause) {
                if (state === "connected") {
                    exitDialog.init(innovaphone.widgets.widget.getString("wantEndCall"));
                    exitDialog.onCancel = function () { showElement(callDialog) }
                    exitDialog.onOkay = function () {
                        if (state !== "terminated") innovaphone.widgets.widget.clearCall();
                        showElement(main);
                    }
                    showElement(exitDialog);
                }
                else {
                    if (state !== "init" && state !== "terminated") innovaphone.widgets.widget.clearCall();
                    showElement(main);
                    if (typeof cause === "string") {
                        errorDialog.init(cause);
                        errorDialog.onOkay = function () { showElement(main) }
                        showElement(errorDialog);
                    }
                }
            }
            showElement(callDialog);
        }
        ev.stopPropagation();
    }

    function onVideoClick(ev) {
        const fixedCallerName = innovaphone.widgets.widget.getOption("fixedCallerName");
        if (fixedCallerName) startCall(fixedCallerName);
        else {
            showElement(nameDialog);
            nameDialog.init(innovaphone.widgets.widget.getString("startCall"));
            nameDialog.onOkay = function (dn) { dn && displayedId ? startCall(dn) : showElement(main) }
            nameDialog.onCancel = function () { showElement(main) }
        }
        function startCall(dn) {
            const agent = agents[displayedId];
            const picture = pictures[displayedId];
            callDialog.init(agent.dn || agent.id, agent.department, agent.company, picture, true, license);
            callDialog.onInit = function (audioTrack, videoTrack) {
                innovaphone.widgets.widget.startCall(callDialog, dn, agent.id, audioTrack, videoTrack);
            }
            callDialog.onExit = function (state, cause) {
                if (state === "connected") {
                    exitDialog.init(innovaphone.widgets.widget.getString("wantEndCall"));
                    exitDialog.onCancel = function () { showElement(callDialog) }
                    exitDialog.onOkay = function () {
                        if (state !== "terminated") innovaphone.widgets.widget.clearCall();
                        showElement(main);
                    }
                    showElement(exitDialog);
                }
                else {
                    if (state !== "init" && state !== "terminated") innovaphone.widgets.widget.clearCall();
                    showElement(main);
                    if (typeof cause === "string") {
                        errorDialog.init(cause);
                        errorDialog.onOkay = function () { showElement(main) }
                        showElement(errorDialog);
                    }
                }
            }
            showElement(callDialog);
        }
        ev.stopPropagation();
    }

    function onChatClick(ev) {
        const fixedCallerName = innovaphone.widgets.widget.getOption("fixedCallerName");
        if (fixedCallerName) startChat(fixedCallerName);
        else {
            showElement(nameDialog);
            nameDialog.init(innovaphone.widgets.widget.getString("startChat"));
            nameDialog.onOkay = function (dn) { dn && displayedId ? startChat(dn) : showElement(main) }
            nameDialog.onCancel = function () { showElement(main) }
        }
        function startChat(dn) {
            const agent = agents[displayedId];
            const picture = pictures[displayedId];
            chatDialog.init(agent.dn || agent.id, agent.department, agent.company, picture, license);
            chatDialog.onExit = function () {
                exitDialog.init(innovaphone.widgets.widget.getString("wantEndChat"));
                exitDialog.onCancel = function () { showElement(chatDialog) }
                exitDialog.onOkay = function () {
                    innovaphone.widgets.widget.chatClose();
                    showElement(main);
                }
                showElement(exitDialog);
            }
            showElement(chatDialog);
            innovaphone.widgets.widget.chatStart(chatDialog, dn, agent.id);
        }
        ev.stopPropagation();
    }

    function onEmailClick(ev) {
        const agent = agents[displayedId];
        innovaphone.widgets.widget.sendEmail(agent.email);
        ev.stopPropagation();
    }

    function onPhonenumberClick(ev) {
        const phoneNumber = ev.target.innerText;
        const iframe = createElement("iframe");
        iframe.style = "position:absolute;top:100%;left:100%;width:0;height:0;border:none;opacity:0;pointer-events:none";
        iframe.src = "tel:" + phoneNumber;
        if (telLink) telLink.remove();
        container.appendChild(telLink = iframe);
        ev.stopPropagation();
    }

    function onLinkClick(ev) {
        const agent = agents[displayedId];
        const link = createElement("a");
        link.target = "sidebar-widget-link-target";
        link.href = agent.customAction.url;
        link.click();
    }

    function onExpandClick(ev) {
        const avatarSize = 70, claimHeight = license ? 0 : 64, carouselHeight = license ? 0 : 64;
        if (main.classList.toggle("expanded")) {
            main.style.setProperty("--sidebar-width", avatarSize + info.clientWidth + "px");
            main.style.setProperty("--sidebar-height", avatarSize + info.clientHeight + claimHeight + "px");
            main.style.setProperty("--sidebar-padding-bottom", carouselHeight + "px");
        }
        else {
            main.style.setProperty("--sidebar-width", avatarSize + "px");
            main.style.setProperty("--sidebar-height", avatarSize + claimHeight + "px");
            main.style.setProperty("--sidebar-padding-bottom", carouselHeight + "px");
        }
        ev.stopPropagation();
    }

    function getPresenceColor(presence) {
        if (presence === "offline") return "rgb(102, 102, 102)";
        if (presence === "online") return "rgb(186, 219, 140)";
        if (presence === "away") return "rgb(255, 208, 99)";
        if (presence === "busy") return "rgb(255, 145, 143)";
        if (presence === "dnd") return "rgb(203, 140, 219)";
    }

    function onConnect() {
        container.classList.add("connected");
    }

    function onDisconnect() {
        showElement(null);
        Object.keys(agents).forEach(id => delete agents[id]);
        container.classList.remove("connected");
    }

    function onSession(id) {
        innovaphone.widgets.updateClaims();
    }

    function onInfo(obj) {
        console.debug("SidebarWidgetUi::onInfo() obj=" + JSON.stringify(obj));

        const fontFamily = innovaphone.widgets.widget.getOption("fontFamily") || "titillium";
        container.style.setProperty("--font-family", fontFamily);

        const primaryColor = innovaphone.widgets.widget.getOption("primaryColor") || "#006069";
        const primaryContrast = innovaphone.widgets.invertColor(primaryColor, true);
        container.style.setProperty("--primary-color", primaryColor);
        container.style.setProperty("--primary-color-opac", innovaphone.widgets.addOpacity(primaryColor, "20%"));
        container.style.setProperty("--primary-contrast", primaryContrast);

        const secondaryColor = innovaphone.widgets.widget.getOption("secondaryColor") || "#ffffff";
        const secondaryContrast = innovaphone.widgets.invertColor(secondaryColor, true);
        container.style.setProperty("--secondary-color", secondaryColor);
        container.style.setProperty("--secondary-contrast", secondaryContrast);

        const sidebarPosition = innovaphone.widgets.widget.getOption("sidebarPosition") || "bottom";
        const vertical = (sidebarPosition === "right") ? true : false;
        if (vertical) main.classList.replace("innovaphone-widget-sidebar-horizontal", "innovaphone-widget-sidebar-vertical");
        else main.classList.replace("innovaphone-widget-sidebar-vertical", "innovaphone-widget-sidebar-horizontal");
        equalPriority = innovaphone.widgets.widget.getOption("equalPriority") || false;
        showIfNoAgentAvailable = innovaphone.widgets.widget.getOption("showIfNoAgentAvailable") || false;

        const defaultMargin = "10px";
        const marginTop = innovaphone.widgets.widget.getOption("marginTop") || defaultMargin;
        const marginLeft = innovaphone.widgets.widget.getOption("marginLeft") || defaultMargin;
        const marginRight = innovaphone.widgets.widget.getOption("marginRight") || defaultMargin;
        const marginBottom = innovaphone.widgets.widget.getOption("marginBottom") || defaultMargin;
        container.style.setProperty("--margin", marginTop + " " + marginRight + " " + marginBottom + " " + marginLeft);
        container.style.setProperty("--margin-top", marginTop);
        container.style.setProperty("--margin-left", marginLeft);
        container.style.setProperty("--margin-right", marginRight);
        container.style.setProperty("--margin-bottom", marginBottom);

        const zIndex = innovaphone.widgets.widget.getOption("zIndex") || 1;
        container.style.setProperty("--z-index", zIndex);

        agents[obj.id] = obj;
        if (!pictures[obj.id]) {
            innovaphone.widgets.widget.getPicture(obj.id);
        }
        displayedId = selectAgent();
        showAgent(agents[displayedId]);
    }

    function selectAgent() {
        let agent = agents[displayedId];
        if (agent && agent.presence !== "online") agent = null;
        if (!agent) {
            if (equalPriority) {
                // do not search from top to bottom
                const online = [];
                Object.keys(agents).forEach(function (id) {
                    if (agents[id].presence === "online") online.push(agents[id]);
                });
                console.debug("SidebarWidgetUi::selectAgent() online.length=" + online.length);
                if (online.length) {
                    const index = Math.round(100 * Math.random()) % online.length;
                    agent = online[index];
                }
            }
            else {
                // search from top to bottom for an online agent
                Object.keys(agents).forEach(function (id) {
                    if (agents[id].presence === "online") {
                        if (!agent) agent = agents[id];
                    }
                });
            }
        }
        if (!agent && showIfNoAgentAvailable) {
            // select one agent even if not available
            const ids = Object.keys(agents);
            const id = ids.includes(displayedId) ? displayedId : ids[0];
            agent = agents[id];
        }
        console.debug("SidebarWidgetUi::selectAgent() equalPriority=" + equalPriority + " id=" + (agent ? agent.id : null));
        return agent ? agent.id : null;
    }

    function showAgent(agent) {
        console.debug("SidebarWidgetUi::showAgent() agent=" + JSON.stringify(agent));
        if (agent) {
            const avatarUrl = pictures[agent.id];

            infoName.innerText = agent.dn || agent.id;
            infoSeparator.innerText = agent.department ? "|" : "";
            infoDepartment.innerText = agent.department || "";
            infoPresence.setAttribute("available", agent.available);
            infoPresenceText.innerText = innovaphone.widgets.widget.getString(agent.available ? "available" : "unavailable");
            infoEmailAddress.innerText = agent.email || "";
            infoEmailAddress.setAttribute("title", agent.email ? ("mailto:" + agent.email) : "");
            infoCompany.innerText = agent.company || "";
            infoStreet.innerText = agent.street || "";
            infoCity.innerText = agent.city || "";

            const phonenumber = agent.phonenumber || "";
            infoPhonenumber.innerText = phonenumber || "";
            infoPhonenumber.style.display = phonenumber ? null : "none";
            infoPhonenumber.setAttribute("title", phonenumber ? ("tel:" + phonenumber) : "");
            infoPhonenumber.onclick = onPhonenumberClick;

            const faxnumber = agent.fax || "";
            infoFaxnumber.innerText = faxnumber || "";
            infoFaxnumber.style.display = faxnumber ? null : "none";

            if (avatarUrl) picture.src = avatarUrl;
            picture.style.opacity = avatarUrl ? null : "0";
            status.setAttribute("available", agent.available);

            showHideButtons(agent);
        }
        agent && !busy ? main.classList.add("visible") : main.classList.remove("visible");
        agent && !busy ? showTextBubble(5000) : collapse();
    }

    function showHideButtons(agent) {
        const voice = agent.media.includes("voice");
        const video = agent.media.includes("video");
        const chat = agent.media.includes("chat");
        const url = agent.customAction && agent.customAction.url;
        btnCall.style.display = voice ? null : "none";
        btnCall.childNodes[1].innerText = innovaphone.widgets.widget.getString("tooltipCall");
        btnVideo.style.display = video ? null : "none";
        btnVideo.childNodes[1].innerText = innovaphone.widgets.widget.getString("tooltipVideoCall");
        btnChat.style.display = chat ? null : "none";
        btnChat.childNodes[1].innerText = innovaphone.widgets.widget.getString("tooltipChat");
        btnEmail.style.display = agent.email ? null : "none";
        btnEmail.childNodes[1].innerText = innovaphone.widgets.widget.getString("email");
        btnLink.style.display = url ? null : "none";
        btnLink.childNodes[1].innerText = url ? (agent.customAction.title || url) : null;
        // enable/disable buttons
        btnCall.disabled = (agent.presence === "online") ? undefined : "true";
        btnVideo.disabled = (agent.presence === "online") ? undefined : "true";
        btnChat.disabled = (agent.presence === "online") ? undefined : "true";
        // max 4 buttons (hide btnEmail)
        if (voice && video && chat && url) btnEmail.style.display = "none";
        const buttons = [btnCall, btnVideo, btnChat, btnEmail, btnLink];
        const displayed = buttons.filter(button => button.style.display !== "none");
        const horizontal = main.classList.contains("innovaphone-widget-sidebar-horizontal");
        if (horizontal && narrow && (displayed.length > 3)) {
            // narrow buttons
            buttons.forEach(button => button.style.width = "45px"); // instead of 55px
            btnExpand.style.width = "30px"; // instead of 35px
        }
        else {
            // regular buttons
            buttons.forEach(button => button.style.width = null);
            btnExpand.style.width = null;
        }
    }

    function onPicture(obj) {
        pictures[obj.id] = obj.url;
        if (obj.id === displayedId) {
            picture.src = obj.url;
            picture.style.opacity = null;
        }
    }

    if (window.ResizeObserver) {
        const resizeObserver = new window.ResizeObserver(function (elements) {
            const agent = agents[displayedId];
            const style = window.getComputedStyle(main);
            const sidebarWidth = parseInt(style.getPropertyValue("--horizontal-sidebar-width"));
            const avatarSize = parseInt(style.getPropertyValue("--avatar-size"));
            const width = sidebarWidth + avatarSize + parseInt(style.marginLeft) + parseInt(style.marginRight);
            const rect = container.getBoundingClientRect();
            if (rect.width < width) {
                if (!narrow) {
                    narrow = true;
                    main.classList.add("narrow");
                    if (agent) showHideButtons(agent);
                }
            }
            else {
                if (narrow) {
                    narrow = false;
                    main.classList.remove("narrow");
                    if (agent) showHideButtons(agent);
                }
            }
        });
        resizeObserver.observe(container);
    }

    function onBeforeUnload(ev) {
        console.debug("SidebarWidgetUi::onBeforeUnload() busy=" + busy);
        if (busy) {
            ev.preventDefault();
            return (ev.returnValue = "");
        }
    }
    setTimeout(function () { window.addEventListener("beforeunload", onBeforeUnload) }, 1000);

    // export
    container.onConnect = onConnect;
    container.onDisconnect = onDisconnect;
    container.onSession = onSession;
    container.onInfo = onInfo;
    container.onPicture = onPicture;
    return container;
});

innovaphone.widgets.CardsetWidgetUi = innovaphone.widgets.CardsetWidgetUi || (function (license) {
    const InlineSvg = innovaphone.widgets.InlineSvg;
    const getSvgPath = innovaphone.widgets.getSvgPath;
    let spacer = null, busy = false, telLink = null;

    function createElement(tagName, className, name) {
        const element = document.createElement(tagName);
        if (className) element.setAttribute("class", className);
        if (name) element.setAttribute("name", name);
        return element;
    }

    const container = document.getElementById("cardset-container");
    if (container) container.setAttribute("class", "innovaphone-widget-cardset");
    else {
        console.error("CardsetWidgetUi: container missing!");
        return;
    }

    const body = document.body;
    const shader = body.appendChild(createElement("div", "innovaphone-widget-shader"));

    const nameDialog = shader.appendChild(new innovaphone.widgets.NameDialog());
    const chatDialog = shader.appendChild(new innovaphone.widgets.ChatDialog());
    const callDialog = shader.appendChild(new innovaphone.widgets.CallDialog());
    const exitDialog = shader.appendChild(new innovaphone.widgets.ExitDialog());
    const errorDialog = shader.appendChild(new innovaphone.widgets.ErrorDialog());

    function showElement(element) {
        // nameDialog | chatDialog | callDialog | exitDialog | errorDialog | none
        [nameDialog, chatDialog, callDialog, exitDialog, errorDialog].forEach(function (e) {
            if (e === element) e.classList.add("visible");
            else e.classList.remove("visible");
        });
        shader.style.display = element ? "unset" : "none";
        const shaded = [nameDialog, exitDialog, errorDialog].includes(element);
        shaded ? shader.classList.add("shaded") : shader.classList.remove("shaded");
        // set 'busy' if chatDialog, callDialog or exitDialog is displayed
        busy = [chatDialog, callDialog, exitDialog].includes(element);
        container.setAttribute("busy", busy);
    }


    function addCard(id) {
        if (!id) return null;
        if (!spacer) {
            let count = 3;
            while (count--) container.appendChild(createElement("div", "innovaphone-widget-spacer"));
            spacer = container.firstChild;
        }
        const card = createElement("div", "innovaphone-widget-card");
        container.insertBefore(card, spacer);

        const fontFamily = innovaphone.widgets.widget.getOption("fontFamily") || "titillium";
        container.style.setProperty("--font-family", fontFamily);
        shader.style.setProperty("--font-family", fontFamily);

        const primaryColor = innovaphone.widgets.widget.getOption("primaryColor") || "#006069";
        const primaryContrast = innovaphone.widgets.invertColor(primaryColor, true);
        container.style.setProperty("--primary-color", primaryColor);
        container.style.setProperty("--primary-contrast", primaryContrast);
        shader.style.setProperty("--primary-color", primaryColor);
        shader.style.setProperty("--primary-color-opac", innovaphone.widgets.addOpacity(primaryColor, "20%"));
        shader.style.setProperty("--primary-contrast", primaryContrast);

        const secondaryColor = innovaphone.widgets.widget.getOption("secondaryColor") || "#ffffff";
        const secondaryContrast = innovaphone.widgets.invertColor(secondaryColor, true);
        container.style.setProperty("--secondary-color", secondaryColor);
        container.style.setProperty("--secondary-contrast", secondaryContrast);
        shader.style.setProperty("--secondary-color", secondaryColor);
        shader.style.setProperty("--secondary-contrast", secondaryContrast);

        const defaultMargin = "10px";
        const marginTop = innovaphone.widgets.widget.getOption("marginTop") || defaultMargin;
        const marginLeft = innovaphone.widgets.widget.getOption("marginLeft") || defaultMargin;
        const marginRight = innovaphone.widgets.widget.getOption("marginRight") || defaultMargin;
        const marginBottom = innovaphone.widgets.widget.getOption("marginBottom") || defaultMargin;
        shader.style.setProperty("--margin", marginTop + " " + marginRight + " " + marginBottom + " " + marginLeft);
        shader.style.setProperty("--margin-top", marginTop);
        shader.style.setProperty("--margin-left", marginLeft);
        shader.style.setProperty("--margin-right", marginRight);
        shader.style.setProperty("--margin-bottom", marginBottom);

        const zIndex = innovaphone.widgets.widget.getOption("zIndex") || 1;
        container.style.setProperty("--z-index", zIndex);
        shader.style.setProperty("--z-index", zIndex);

        const avatar = card.appendChild(createElement("div", "innovaphone-widget-card-avatar hidden"));
        const picture = avatar.appendChild(createElement("img"));
        const status = avatar.appendChild(new InlineSvg("0 0 50 50", "M3.9,34v8H0L3.9,34z", "M0,42h42v8H0V42z"));

        const body = card.appendChild(createElement("div", "innovaphone-widget-card-body"));
        const row1 = body.appendChild(createElement("div", "innovaphone-widget-card-row"));
        const row2 = body.appendChild(createElement("div", "innovaphone-widget-card-row"));
        const row3 = body.appendChild(createElement("div", "innovaphone-widget-card-row"));
        const row4 = body.appendChild(createElement("div", "innovaphone-widget-card-row"));

        if (!license) {
            body.appendChild(new innovaphone.widgets.Claim());
        }

        const displayname = row1.appendChild(createElement("div", null, "displayname"));
        const separator = row1.appendChild(createElement("div", null, "separator"));
        const department = row1.appendChild(createElement("div", null, "department"));
        const presenceLamp = row2.appendChild(createElement("div", null, "presenceLamp"));
        const presenceText = row2.appendChild(createElement("div", null, "presenceText"));

        const buttons = row3;

        const left = row4.appendChild(createElement("div", "innovaphone-widget-card-left"));
        const right = row4.appendChild(createElement("div", "innovaphone-widget-card-right"));
        const emailAddr = left.appendChild(createElement("div", null, "emailAddr"));
        const phoneNumber = left.appendChild(createElement("div", null, "phoneNumber"));
        const faxNumber = left.appendChild(createElement("div", null, "faxNumber"));
        const companyName = right.appendChild(createElement("div", null, "companyName"));
        const companyStreet = right.appendChild(createElement("div", null, "companyStreet"));
        const companyCity = right.appendChild(createElement("div", null, "companyCity"));

        function createTooltip(textId) {
            const tooltip = createElement("div", "btnToolTip");
            tooltip.innerText = innovaphone.widgets.widget.getString(textId);
            return tooltip;
        }

        // buttons
        const btnCall = buttons.appendChild(createElement("button", "innovaphone-widget-card-btnCall"));
        btnCall.appendChild(new InlineSvg("0 0 20 20", getSvgPath("call")));
        btnCall.appendChild(createTooltip("tooltipCall"));
        btnCall.addEventListener("click", onCallClick);
        btnCall.setAttribute("name", "call");
        const btnVideo = buttons.appendChild(createElement("button", "innovaphone-widget-card-btnVideo"));
        btnVideo.appendChild(new InlineSvg("0 0 20 20", getSvgPath("videocam")));
        btnVideo.appendChild(createTooltip("tooltipVideoCall"));
        btnVideo.addEventListener("click", onVideoClick);
        btnVideo.setAttribute("name", "video");
        const btnChat = buttons.appendChild(createElement("button", "innovaphone-widget-card-btnChat"));
        btnChat.appendChild(new InlineSvg("0 0 20 20", getSvgPath("chat")));
        btnChat.appendChild(createTooltip("tooltipChat"));
        btnChat.addEventListener("click", onChatClick);
        btnChat.setAttribute("name", "chat");
        const btnEmail = buttons.appendChild(createElement("button", "innovaphone-widget-card-btnEmail"));
        btnEmail.appendChild(new InlineSvg("0 0 20 20", getSvgPath("email")));
        btnEmail.appendChild(createElement("div", "btnToolTip")).innerText = innovaphone.widgets.widget.getString("email");
        btnEmail.addEventListener("click", onEmailClick);
        btnEmail.setAttribute("name", "email");
        const btnLink = buttons.appendChild(createElement("button", "innovaphone-widget-card-btnLink"));
        btnLink.appendChild(new InlineSvg("0 0 20 20", getSvgPath("link")));
        btnLink.addEventListener("click", onLinkClick);
        btnLink.setAttribute("name", "link");

        function showHideButtons() {
            const buttons = [btnCall, btnVideo, btnChat, btnEmail, btnLink];
            const available = buttons.filter(button => button.style.display !== "none");
            // max 4 buttons (hide btnEmail)
            if (available.length > 4) btnEmail.classList.add("hidden");
            else btnEmail.classList.remove("hidden");
        }

        function onCallClick(ev) {
            ev.stopPropagation();
            if (busy) return;
            const fixedCallerName = innovaphone.widgets.widget.getOption("fixedCallerName");
            if (fixedCallerName) startCall(fixedCallerName);
            else {
                showElement(nameDialog);
                nameDialog.init(innovaphone.widgets.widget.getString("startCall"));
                nameDialog.onOkay = function (dn) { dn ? startCall(dn) : showElement(null) }
                nameDialog.onCancel = function () { showElement(null) }
            }
            function startCall(dn) {
                callDialog.init(displayname.innerText || id, department.innerText, companyName.innerText, picture.src, false, license);
                callDialog.onInit = function (audioTrack, videoTrack) {
                    innovaphone.widgets.widget.startCall(callDialog, dn, id, audioTrack, videoTrack);
                }
                callDialog.onExit = function (state, cause) {
                    if (state === "connected") {
                        exitDialog.init(innovaphone.widgets.widget.getString("wantEndCall"));
                        exitDialog.onCancel = function () { showElement(callDialog) }
                        exitDialog.onOkay = function () {
                            if (state !== "terminated") innovaphone.widgets.widget.clearCall();
                            showElement(null);
                        }
                        showElement(exitDialog);
                    }
                    else {
                        if (state !== "init" && state !== "terminated") innovaphone.widgets.widget.clearCall();
                        showElement(null);
                        if (typeof cause === "string") {
                            errorDialog.init(cause);
                            errorDialog.onOkay = function () { showElement(null) }
                            showElement(errorDialog);
                        }
                    }
                }
                showElement(callDialog);
            }
        }

        function onVideoClick(ev) {
            ev.stopPropagation();
            if (busy) return;
            const fixedCallerName = innovaphone.widgets.widget.getOption("fixedCallerName");
            if (fixedCallerName) startCall(fixedCallerName);
            else {
                showElement(nameDialog);
                nameDialog.init(innovaphone.widgets.widget.getString("startCall"));
                nameDialog.onOkay = function (dn) { dn ? startCall(dn) : showElement(null) }
                nameDialog.onCancel = function () { showElement(null) }
            }
            function startCall(dn) {
                callDialog.init(displayname.innerText || id, department.innerText, companyName.innerText, picture.src, true, license);
                callDialog.onInit = function (audioTrack, videoTrack) {
                    innovaphone.widgets.widget.startCall(callDialog, dn, id, audioTrack, videoTrack);
                }
                callDialog.onExit = function (state, cause) {
                    if (state === "connected") {
                        exitDialog.init(innovaphone.widgets.widget.getString("wantEndCall"));
                        exitDialog.onCancel = function () { showElement(callDialog) }
                        exitDialog.onOkay = function () {
                            if (state !== "terminated") innovaphone.widgets.widget.clearCall();
                            showElement(null);
                        }
                        showElement(exitDialog);
                    }
                    else {
                        if (state !== "init" && state !== "terminated") innovaphone.widgets.widget.clearCall();
                        showElement(null);
                        if (typeof cause === "string") {
                            errorDialog.init(cause);
                            errorDialog.onOkay = function () { showElement(null) }
                            showElement(errorDialog);
                        }
                    }
                }
                showElement(callDialog);
            }
        }

        function onChatClick(ev) {
            ev.stopPropagation();
            if (busy) return;
            const fixedCallerName = innovaphone.widgets.widget.getOption("fixedCallerName");
            if (fixedCallerName) startChat(fixedCallerName);
            else {
                showElement(nameDialog);
                nameDialog.init(innovaphone.widgets.widget.getString("startChat"));
                nameDialog.onOkay = function (dn) { dn ? startChat(dn) : showElement(null) }
                nameDialog.onCancel = function () { showElement(null) }
            }
            function startChat(dn) {
                chatDialog.init(displayname.innerText || id, department.innerText, companyName.innerText, picture.src, license);
                chatDialog.onExit = function () {
                    exitDialog.init(innovaphone.widgets.widget.getString("wantEndChat"));
                    exitDialog.onCancel = function () { showElement(chatDialog) }
                    exitDialog.onOkay = function () {
                        innovaphone.widgets.widget.chatClose();
                        showElement(null);
                    }
                    showElement(exitDialog);
                }
                showElement(chatDialog);
                innovaphone.widgets.widget.chatStart(chatDialog, dn, id);
            }
        }

        function onEmailClick(ev) {
            innovaphone.widgets.widget.sendEmail(emailAddr.innerText);
            ev.stopPropagation();
        }

        function onPhonenumberClick(ev) {
            const phoneNumber = ev.target.innerText;
            const link = createElement("a");
            link.target = "cardset-widget-link-target";
            link.href = "tel:" + phoneNumber;
            link.click();
            ev.stopPropagation();
        }

        function onLinkClick(ev) {
            const link = createElement("a");
            link.target = "cardset-widget-link-target";
            link.href = btnLink.getAttribute("url");
            link.click();
            ev.stopPropagation();
        }

        // interface
        card.id = id;
        card.setOrder = function (order) {
            card.style.order = order;
            [...container.children]
                .sort((a, b) => getComputedStyle(a).order > getComputedStyle(b).order ? 1 : -1)
                .forEach(node => container.appendChild(node));
        }
        card.setDn = function (value) { displayname.innerText = value }
        card.getDn = function () { return displayname.innerText }
        card.setDepartment = function (value) {
            department.innerText = value;
            separator.innerText = value ? "|" : null;
        }
        card.setCompany = function (name, street, city, fax) {
            companyName.innerText = name || null;
            companyStreet.innerText = street || null;
            companyCity.innerText = city || null;
            faxNumber.innerText = fax || null;
            faxNumber.style.display = fax ? null : "none";
        }
        card.setPhonenumber = function (value) {
            phoneNumber.innerText = value;
            phoneNumber.onclick = onPhonenumberClick;
            phoneNumber.style.display = value ? null : "none";
            phoneNumber.setAttribute("title", value ? ("tel:" + value) : "");
        }
        card.setEmailAddr = function (value) {
            btnEmail.style.display = value ? null : "none";
            emailAddr.innerText = value;
            emailAddr.onclick = onEmailClick;
            emailAddr.setAttribute("title", value ? ("mailto:" + value) : "");
            showHideButtons();
        }
        card.setPicture = function (src) {
            if (src) {
                picture.src = src;
                picture.alt = displayname.innerText;
                avatar.classList.remove("hidden");
            }
            else {
                delete picture.src;
                delete picture.alt;
                avatar.classList.add("hidden");
            }
        }
        card.getPicture = function () {
            return picture.src;
        }
        card.setMediaTypes = function (types) {
            btnCall.style.display = types.includes("voice") ? null : "none";
            btnVideo.style.display = types.includes("video") ? null : "none";
            btnChat.style.display = types.includes("chat") ? null : "none";
            showHideButtons();
        }
        card.setCustomAction = function (customAction) {
            const url = customAction && customAction.url;
            btnLink.style.display = url ? null : "none";
            btnLink.setAttribute("url", url);
            if (url && customAction.title) {
                let toolTip = btnLink.getElementsByClassName("btnToolTip")[0];
                if (!toolTip) toolTip = btnLink.appendChild(createElement("div", "btnToolTip"));
                toolTip.innerText = customAction.title || url;
            }
            showHideButtons();
        }
        card.setStatus = function (available) {
            avatar.setAttribute("available", available);
            presenceLamp.setAttribute("available", available);
            presenceText.innerText = innovaphone.widgets.widget.getString(available ? "available" : "unavailable");
            btnCall.disabled = btnVideo.disabled = btnChat.disabled = !available;
        }
        return card;
    }

    function findCard(id) {
        for (let i = 0; i < container.children.length; i++) {
            if (container.children[i].id === id) return container.children[i];
        }
    }

    function onConnect() {
        container.innerHTML = "";
        spacer = null;
    }

    function onDisconnect() {
        for (let i = 0; i < container.children.length; i++) {
            const child = container.children[i];
            child.style.opacity = "40%";
            child.style.pointerEvents = "none";
        }
    }

    function onSession(id) {
        innovaphone.widgets.updateClaims();
    }

    function onInfo(obj) {
        console.debug("CardsetWidgetUi::onInfo() obj=" + JSON.stringify(obj));
        const card = findCard(obj.id) || addCard(obj.id);
        card.setOrder(obj.order);
        card.setDn(obj.dn || obj.id);
        card.setDepartment(obj.department || "");
        card.setCompany(obj.company, obj.street, obj.city, obj.fax);
        card.setPhonenumber(obj.phonenumber || "");
        card.setEmailAddr(obj.email || "");
        if (obj.avatarUrl) {
            card.setPicture(obj.avatarUrl);
        }
        else if (!card.getPicture()) {
            innovaphone.widgets.widget.getPicture(obj.id);
        }
        card.setStatus(obj.available ? true : false);
        card.setMediaTypes(obj.media);
        card.setCustomAction(obj.customAction);
        window.fetchData(obj);
    }

    function onPicture(obj) {
        let card = findCard(obj.id);
        if (card) card.setPicture(obj.url, obj.dn || obj.id);
    }

    function onBeforeUnload(ev) {
        console.debug("CardsetWidgetUi::onBeforeUnload() busy=" + busy);
        if (busy) {
            ev.preventDefault();
            return (ev.returnValue = "");
        }
    }
    setTimeout(function () { window.addEventListener("beforeunload", onBeforeUnload) }, 1000);

    // export
    container.onConnect = onConnect;
    container.onDisconnect = onDisconnect;
    container.onSession = onSession;
    container.onInfo = onInfo;
    container.onPicture = onPicture;
    return container;
});

innovaphone.widgets.Claims = [];
innovaphone.widgets.Claims.remove = function (element) {
    const index = this.indexOf(element);
    return (index >= 0) ? this.splice(index, 1)[0] : null;
};

innovaphone.widgets.Claim = function () {
    function createElement(tagName, className) {
        const element = document.createElement(tagName);
        if (className) element.setAttribute("class", className);
        return element;
    }
    const claim = createElement("div", "innovaphone-widget-claim");
    const spacer1 = claim.appendChild(createElement("div", "innovaphone-widget-claim-spacer"));
    const container = claim.appendChild(createElement("div", "innovaphone-widget-claim-container"));
    const spacer2 = claim.appendChild(createElement("div", "innovaphone-widget-claim-spacer"));
    const line1 = container.appendChild(createElement("div", "innovaphone-widget-claim-head"));
    const line2 = container.appendChild(createElement("div", "innovaphone-widget-claim-body"));
    const theApp = line2.appendChild(createElement("div"));
    const separator = line2.appendChild(createElement("div"));
    const myApps = line2.appendChild(createElement("div"));
    theApp.addEventListener("click", onClick);
    theApp.setAttribute("name", "innovaphone-widget-claim-appLink");
    theApp.innerHTML = '<img name="innovaphone-widget-appLogo" loading="lazy" fetchpriority="low"><div>Contact Widgets App</div>';
    myApps.addEventListener("click", onClick);
    myApps.setAttribute("name", "innovaphone-widget-claim-mainLink");
    myApps.innerHTML = '<img name="innovaphone-widget-myAppsLogo" loading="lazy" fetchpriority="low"><div>innovaphone myApps</div>';
    claim.update = function () {
        const baseUrl = innovaphone.widgets.widget.baseUrl();
        const sessionID = innovaphone.widgets.widget.getSessionID();
        const lang = innovaphone.widgets.widget.getLanguage();
        const weblang = innovaphone.widgets.websiteLanguage(lang);
        console.debug("Claim::update() lang=" + lang + " weblang=" + weblang);
        line1.innerText = innovaphone.widgets.widget.getString("createdUsing");
        theApp.childNodes[0].src = baseUrl + "app-logo.png?" + sessionID;
        theApp.setAttribute("title", `https://www.innovaphone.com/${weblang}/resolve-widgets.html`);
        myApps.childNodes[0].src = baseUrl + "myapps-logo.svg?" + sessionID;
        myApps.setAttribute("title", `https://www.innovaphone.com/${weblang}/resolve-widgets.html`);
    }
    setTimeout(claim.update);
    function onClick(ev) {
        const link = createElement("a");
        const url = ev.currentTarget.getAttribute("title");
        if (url) link.href = url, link.target = "innovaphone", link.click();
        ev.stopPropagation();
    }
    function adjust(elements) {
        if (claim.clientWidth >= 340) {
            theApp.childNodes[1].innerHTML = "Contact Widgets App";
            myApps.childNodes[1].innerHTML = "innovaphone myApps";
        }
        else if (claim.clientWidth >= 290) {
            theApp.childNodes[1].innerHTML = "Contact Widgets App";
            myApps.childNodes[1].innerHTML = "innovaphone<br>myApps";
        }
        else if (claim.clientWidth >= 265) {
            theApp.childNodes[1].innerHTML = "Contact Widgets App";
            myApps.childNodes[1].innerHTML = "myApps";
        }
        else {
            theApp.childNodes[1].innerHTML = "Contact Widgets";
            myApps.childNodes[1].innerHTML = "myApps";
        }
    }
    if (window.ResizeObserver) {
        const resizeObserver = new window.ResizeObserver(adjust);
        resizeObserver.observe(claim);
    }
    else {
        setTimeout(adjust, 100);
    }
    innovaphone.widgets.Claims.push(claim);
    return claim;
}

innovaphone.widgets.updateClaims = function () {
    const garbage = [];
    innovaphone.widgets.Claims.forEach(function (claim) {
        document.body.contains(claim) ? claim.update() : garbage.push(claim);
    });
    garbage.forEach(function (claim) {
        innovaphone.widgets.Claims.remove(claim);
    });
}

innovaphone.widgets.Carousel = function () {
    let interval = null;
    function createElement(tagName, className) {
        const element = document.createElement(tagName);
        if (className) element.setAttribute("class", className);
        return element;
    }
    const carousel = createElement("div", "innovaphone-widget-carousel");
    const theApp = carousel.appendChild(createElement("a"));
    const theAppImg = theApp.appendChild(createElement("img"));
    const myApps = carousel.appendChild(createElement("a"));
    const myAppsImg = myApps.appendChild(createElement("img"));
    const baseUrl = innovaphone.widgets.widget.baseUrl();
    const sessionID = innovaphone.widgets.widget.getSessionID();
    const lang = innovaphone.widgets.widget.getLanguage();
    const weblang = innovaphone.widgets.websiteLanguage(lang);
    theApp.href = theApp.title = `https://www.innovaphone.com/${weblang}/resolve-widgets.html`;
    theAppImg.src = theAppImg.alt = baseUrl + "app-logo.png?" + sessionID, theAppImg.loading = "lazy", theAppImg.fetchpriority = "low";
    myApps.href = myApps.title = `https://www.innovaphone.com/${weblang}/resolve-widgets.html`;
    myAppsImg.src = myAppsImg.alt = baseUrl + "myapps-logo.svg?" + sessionID, myAppsImg.loading = "lazy", myAppsImg.fetchpriority = "low";
    function onInterval() {
        console.log("onInterval() carousel.index=" + carousel.index);
        if (carousel.children.length) {
            if (carousel.index === undefined) {
                carousel.index = 0;
                carousel.appendChild(carousel.children[0].cloneNode(true));
            }
            if (carousel.index === (carousel.children.length - 1)) {
                carousel.index = 0;
                carousel.children[0].scrollIntoView({ behavior: "instant" });
            }
            carousel.children[carousel.index + 1].scrollIntoView({ behavior: "smooth" });
            carousel.index = carousel.index + 1;
        }
    }
    setInterval(onInterval, 10000);
    return carousel;
}

innovaphone.widgets.Flip = function () {
    let interval = null;
    function createElement(tagName, className) {
        const element = document.createElement(tagName);
        if (className) element.setAttribute("class", className);
        return element;
    }
    const flip = createElement("div", "innovaphone-widget-flip");
    const inner = flip.appendChild(createElement("div", "innovaphone-widget-flip-inner"));
    const theApp = inner.appendChild(createElement("a", "innovaphone-widget-flip-inner-frontside"));
    const theAppImg = theApp.appendChild(createElement("img"));
    const myApps = inner.appendChild(createElement("a", "innovaphone-widget-flip-inner-backside"));
    const myAppsImg = myApps.appendChild(createElement("img"));
    const baseUrl = innovaphone.widgets.widget.baseUrl();
    const sessionID = innovaphone.widgets.widget.getSessionID();
    const lang = innovaphone.widgets.widget.getLanguage();
    const weblang = innovaphone.widgets.websiteLanguage(lang);
    theApp.href = `https://www.innovaphone.com/${weblang}/resolve-widgets.html`;
    theApp.title = innovaphone.widgets.widget.getString("createdUsing") + " " + "Contact Widgets App";
    theApp.target = "innovaphone";
    theAppImg.src = theAppImg.alt = baseUrl + "app-logo.png?" + sessionID, theAppImg.loading = "lazy", theAppImg.fetchpriority = "low";
    myApps.href = `https://www.innovaphone.com/${weblang}/resolve-widgets.html`;
    myApps.title = "innovaphone myApps";
    myApps.target = "innovaphone";
    myAppsImg.src = myAppsImg.alt = baseUrl + "myapps-logo.svg?" + sessionID, myAppsImg.loading = "lazy", myAppsImg.fetchpriority = "low";
    setInterval(function () { inner.classList.toggle("flipped") }, 10000);
    return flip;
}

innovaphone.widgets.ClaimBubble = function () {
    function createElement(tagName, className) {
        const element = document.createElement(tagName);
        if (className) element.setAttribute("class", className);
        return element;
    }
    const claimBubble = createElement("div", "claimBubble");
    const theApp = claimBubble.appendChild(createElement("a"));
    const theAppImg = theApp.appendChild(createElement("img"));
    const theAppText = theApp.appendChild(createElement("div"));
    const myApps = claimBubble.appendChild(createElement("a"));
    const myAppsImg = myApps.appendChild(createElement("img"));
    const myAppsText = myApps.appendChild(createElement("div"));
    const baseUrl = innovaphone.widgets.widget.baseUrl();
    const sessionID = innovaphone.widgets.widget.getSessionID();
    const lang = innovaphone.widgets.widget.getLanguage();
    const weblang = innovaphone.widgets.websiteLanguage(lang);
    theApp.href = `https://www.innovaphone.com/${weblang}/resolve-widgets.html`;
    theApp.title = innovaphone.widgets.widget.getString("createdUsing") + " " + "Contact Widgets App";
    theApp.target = "innovaphone";
    theAppImg.src = theAppImg.alt = baseUrl + "app-logo.png?" + sessionID, theAppImg.loading = "lazy", theAppImg.fetchpriority = "low";
    theAppText.innerText = "Contact Widgets App";
    myApps.href = `https://www.innovaphone.com/${weblang}/resolve-widgets.html`;
    myApps.title = "innovaphone myApps";
    myApps.target = "innovaphone";
    myAppsImg.src = myAppsImg.alt = baseUrl + "myapps-logo.svg?" + sessionID, myAppsImg.loading = "lazy", myAppsImg.fetchpriority = "low";
    myAppsText.innerText = "myApps";
    function isVisible(e) { return e.offsetWidth > 0 || e.offsetHeight > 0 }
    function show(index) {
        const visible = claimBubble.checkVisibility ? claimBubble.checkVisibility() : isVisible(claimBubble);
        console.log("ClaimBubble::show() index=" + index);
        [theApp, myApps].forEach(function (a, idx) {
            if (idx === index) {
                a.style.display = null;
                const width = visible ? (5 + a.scrollWidth + 5) : 0;
                claimBubble.style.width = width + "px";
            }
            else a.style.display = "none";
        });
    }
    let index = 0;
    setTimeout(function () { show(index = 0) });
    setInterval(function () { show(index = index ? 0 : 1) }, 5000);
    claimBubble.addEventListener("click", ev => ev.stopPropagation());
    return claimBubble;
}

innovaphone.widgets.NameDialog = function () {
    function createElement(tagName, className) {
        const element = document.createElement(tagName);
        if (className) element.setAttribute("class", className);
        return element;
    }
    const dialog = createElement("div", "innovaphone-widget-dialog");
    const head = dialog.appendChild(createElement("div", "innovaphone-widget-dialog-head"));
    const body = dialog.appendChild(createElement("div", "innovaphone-widget-dialog-body"));
    const text = body.appendChild(createElement("div", "innovaphone-widget-dialog-body-text"));
    const input = body.appendChild(createElement("input", "innovaphone-widget-dialog-body-input"));
    const buttons = dialog.appendChild(createElement("div", "innovaphone-widget-dialog-buttons"));
    const okay = buttons.appendChild(createElement("button", "innovaphone-widget-dialog-button-okay"));
    const cancel = buttons.appendChild(createElement("button", "innovaphone-widget-dialog-button-cancel"));
    input.setAttribute("maxlength", "64");
    input.oninput = function (ev) { okay.disabled = input.value.trim() ? false : true }
    okay.onclick = function (ev) { if (dialog.onOkay) dialog.onOkay(input.value.trim()); localStorage.setItem("innovaphone-widget-dialog-display-name", input.value.trim()) }
    cancel.onclick = function (ev) { if (dialog.onCancel) dialog.onCancel() }
    dialog.init = function (okayButtonText) {
        const touchDevice = innovaphone.widgets.isTouchDevice();
        head.innerText = innovaphone.widgets.widget.getString("hello");
        text.innerText = innovaphone.widgets.widget.getString("enterDisplayName");
        input.value = localStorage.getItem("innovaphone-widget-dialog-display-name");
        input.placeholder = innovaphone.widgets.widget.getString("myName");
        setTimeout(function () { input.value || touchDevice ? okay.focus() : input.focus() }, 100);
        okay.disabled = input.value ? false : true;
        okay.innerText = okayButtonText;
        cancel.innerText = innovaphone.widgets.widget.getString("cancel");
    }
    dialog.onkeydown = function (ev) {
        if (ev.code === "Enter") okay.click(), ev.stopPropagation();
        if (ev.code === "Escape") cancel.click(), ev.stopPropagation();
    }
    dialog.setAttribute("name", "NameDialog");
    return dialog;
}

innovaphone.widgets.ChatDialog = function () {
    function createElement(tagName, className) {
        const element = document.createElement(tagName);
        if (className) element.setAttribute("class", className);
        return element;
    }
    function getBaseURL() {
        const src = innovaphone.widgets.SidebarWidgetUi.src;
        const index = src ? src.lastIndexOf("/") : -1;
        if (index > 0) return src.substring(0, index + 1);
    }
    const InlineSvg = innovaphone.widgets.InlineSvg;
    const getSvgPath = innovaphone.widgets.getSvgPath;
    const baseURL = getBaseURL();
    const audio = new Audio(baseURL + "innovaphone-widget-chat.mp3");
    const div = createElement("div", "innovaphone-widget-chat");
    const head = div.appendChild(createElement("div", "innovaphone-widget-chat-head"));
    const body = div.appendChild(createElement("div", "innovaphone-widget-chat-body"));
    const claim = div.appendChild(new innovaphone.widgets.Claim());
    const foot = div.appendChild(createElement("div", "innovaphone-widget-chat-foot"));
    const input = foot.appendChild(createElement("input", "innovaphone-widget-chat-foot-input"));
    const headText = head.appendChild(createElement("div", "innovaphone-widget-chat-head-text"));
    const badgeCount = createElement("div", "innovaphone-widget-chat-badge-count");
    const peer = body.appendChild(createElement("div", "innovaphone-widget-chat-body-peer"));
    const avatar = peer.appendChild(createElement("img", "innovaphone-widget-chat-body-peer-avatar"));
    const info = peer.appendChild(createElement("div", "innovaphone-widget-chat-body-peer-info"));
    const span = info.appendChild(createElement("span", "innovaphone-widget-chat-body-peer-info-span"));
    const name = span.appendChild(createElement("div", "innovaphone-widget-chat-body-peer-info-name"));
    const department = span.appendChild(createElement("div", "innovaphone-widget-chat-body-peer-info-department"));
    const company = info.appendChild(createElement("div", "innovaphone-widget-chat-body-peer-info-company"));
    const status = info.appendChild(createElement("div", "innovaphone-widget-chat-body-peer-info-status"));
    const list = body.appendChild(createElement("div", "innovaphone-widget-chat-body-list"));
    const minimizeButton = head.appendChild(createElement("button", "innovaphone-widget-chat-head-button"));
    const exitButton = body.appendChild(createElement("button", "innovaphone-widget-chat-exit-button"));
    const sendButton = foot.appendChild(createElement("button", "innovaphone-widget-chat-foot-send-button"));
    const scrollIntoViewOptions = { behavior: "smooth", block: "end", inline: "nearest" };
    minimizeButton.appendChild(new InlineSvg("0 0 20 20", getSvgPath("down")));
    minimizeButton.addEventListener("click", onMinimizeButton);
    exitButton.addEventListener("click", onExitButton);
    sendButton.appendChild(new InlineSvg("0 0 26 26", getSvgPath("send")));
    sendButton.addEventListener("keypress", function (ev) { input.focus() });
    sendButton.addEventListener("click", onSendButton);
    let state = null;
    div.init = function (_name, _department, _company, picture, license) {
        headText.innerText = "Chat";
        avatar.src = picture;
        avatar.style.visibility = picture ? "visible" : "hidden";
        name.innerText = _name;
        department.innerText = _department ? ("| " + _department) : "";
        company.innerText = _company;
        list.innerHTML = "";
        exitButton.innerText = innovaphone.widgets.widget.getString("exitChat");
        input.placeholder = innovaphone.widgets.widget.getString("writeYourMessage");
        setTimeout(function () { input.focus() }, 100);
        div.classList.remove("minimized");
        body.appendChild(exitButton);
        claim.style.display = license ? "none" : null;
    }
    div.onChatInfo = function (obj) {
        let statusText = null;
        console.log("ChatDialog::onChatInfo() state=" + obj.state);
        switch (obj.state) {
            case "alerting":
                statusText = "isBeingNotified";
                break;
            case "connected":
                if (obj.text || obj.html || obj.attach) {
                    const chatItem = new innovaphone.widgets.ChatItem(obj.text, obj.html, obj.attach, "innovaphone-widget-chat-item inbound");
                    list.appendChild(chatItem).scrollIntoView(scrollIntoViewOptions);
                    div.scrollTop = 0; // hack for minimized view
                    if (audio.readyState) audio.play();
                    const minimized = div.classList.contains("minimized");
                    if (minimized) badgeCount.innerText = Number(badgeCount.innerText) + 1;
                    headText.appendChild(badgeCount);
                }
                if (obj.typing) statusText = "isWriting";
                else if (state !== "connected") statusText = "hasJoinedTheChat";
                break;
            case "terminated":
                statusText = "hasLeftTheChat";
                break;
        }
        state = obj.state;
        status.innerText = statusText ? innovaphone.widgets.widget.getString(statusText) : "";
        company.style.display = statusText ? "none" : null;
    }
    function onMinimizeButton(ev) {
        const minimized = div.classList.toggle("minimized");
        if (minimized) head.insertBefore(exitButton, minimizeButton);
        else body.appendChild(exitButton), badgeCount.innerText = "";
    }
    function onExitButton(ev) {
        console.debug("ChatDialog::onExitButton()");
        if (div.onExit) div.onExit();
    }
    function onSendButton(ev) {
        if (input.value) {
            const chatItem = new innovaphone.widgets.ChatItem(input.value, null, null, "innovaphone-widget-chat-item outbound");
            list.appendChild(chatItem).scrollIntoView(scrollIntoViewOptions);
            innovaphone.widgets.widget.chatSend(input.value);
            input.value = "";
        }
    }
    input.onkeydown = function (ev) {
        const text = input.value;
        if (ev.code === "Enter") {
            sendButton.click();
            innovaphone.widgets.widget.chatTyping(false);
        }
        else {
            innovaphone.widgets.widget.chatTyping(text ? true : false);
        }
    }
    div.setAttribute("name", "ChatDialog");
    return div;
}

innovaphone.widgets.ChatItem = function (text, html, attach, className) {
    function createElement(tagName, className) {
        const element = document.createElement(tagName);
        if (className) element.setAttribute("class", className);
        return element;
    }
    const InlineSvg = innovaphone.widgets.InlineSvg;
    const getSvgPath = innovaphone.widgets.getSvgPath;
    const now = new Date();
    const time = innovaphone.widgets.printTime(now);
    const div = createElement("div", className);
    const angle = div.appendChild(new InlineSvg("0 0 20 20", getSvgPath("dropdown")));
    const textDiv = div.appendChild(createElement("div", "innovaphone-widget-chat-item-text"));
    const timeDiv = div.appendChild(createElement("div", "innovaphone-widget-chat-item-time"));
    if (text) textDiv.innerText = text;
    if (html) textDiv.innerHTML = html;
    if (attach) {
        const index = attach.lastIndexOf("/");
        const fileName = attach.substring(index + 1);
        const a = textDiv.appendChild(createElement("a", "innovaphone-widget-chat-item-attach"));
        a.href = attach, a.target = "_blank", a.innerText = fileName;
        a.appendChild(new InlineSvg("0 0 20 20", getSvgPath("chatAttach")));
    }
    timeDiv.innerText = time;
    div.setAttribute("name", "ChatItem");
    return div;
}

innovaphone.widgets.CallDialog = function () {
    function createElement(tagName, className) {
        const element = document.createElement(tagName);
        if (className) element.setAttribute("class", className);
        return element;
    }
    function createVideoPlayer(className) {
        const player = document.createElement("video");
        player.setAttribute("muted", "muted");
        player.setAttribute("autoplay", "autoplay");
        player.setAttribute("playsinline", "playsinline");
        player.setAttribute("webkit-playsinline", "webkit-playsinline");
        player.setAttribute("disablePictureInPicture", "disablePictureInPicture");
        if (className) player.setAttribute("class", className);
        return player;
    }
    function createTooltip(textId) {
        const tooltip = createElement("div", "btnToolTip");
        setTimeout(function () {
            tooltip.innerText = innovaphone.widgets.widget.getString(textId);
        });
        return tooltip;
    }
    const constraints = { audio: { echoCancellation: true } };
    const InlineSvg = innovaphone.widgets.InlineSvg;
    const getSvgPath = innovaphone.widgets.getSvgPath;
    const div = createElement("div", "innovaphone-widget-call");
    const head = div.appendChild(createElement("div", "innovaphone-widget-call-head"));
    const body = div.appendChild(createElement("div", "innovaphone-widget-call-body"));
    const claim = div.appendChild(new innovaphone.widgets.Claim());
    const foot = div.appendChild(createElement("div", "innovaphone-widget-call-foot"));
    const headText = head.appendChild(createElement("div", "innovaphone-widget-call-head-text"));
    const headTime = head.appendChild(createElement("div", "innovaphone-widget-call-head-time"));
    const headSpacer = head.appendChild(createElement("div", "innovaphone-widget-call-head-spacer"));
    const maximizeButton = head.appendChild(createElement("button", "innovaphone-widget-call-head-maximize"));
    const minimizeButton = head.appendChild(createElement("button", "innovaphone-widget-call-head-button"));
    const peer = body.appendChild(createElement("div", "innovaphone-widget-call-body-peer"));
    const videos = body.appendChild(createElement("div", "innovaphone-widget-call-body-videos"));
    const localVideo = videos.appendChild(createVideoPlayer("innovaphone-widget-call-body-local-video"));
    const remoteVideo = videos.appendChild(createVideoPlayer("innovaphone-widget-call-body-remote-video"));
    const spinner = videos.appendChild(createElement("div", "innovaphone-ring-spinner"));
    const avatar = peer.appendChild(createElement("img", "innovaphone-widget-call-body-peer-avatar"));
    const info = peer.appendChild(createElement("div", "innovaphone-widget-call-body-peer-info"));
    const name = info.appendChild(createElement("div"));
    const department = info.appendChild(createElement("div"));
    const company = info.appendChild(createElement("div"));
    const badgeCount = createElement("div", "innovaphone-widget-call-badge-count");
    const chatButton = foot.appendChild(createElement("button", "innovaphone-widget-call-chat-button"));
    const configButton = foot.appendChild(createElement("button", "innovaphone-widget-call-config-button"));
    const shareButton = foot.appendChild(createElement("button", "innovaphone-widget-call-share-button"));
    const muteButton = foot.appendChild(createElement("button", "innovaphone-widget-call-mute-button"));
    const cameraButton = foot.appendChild(createElement("button", "innovaphone-widget-call-camera-button"));
    const exitButton = foot.appendChild(createElement("button", "innovaphone-widget-call-exit-button"));
    maximizeButton.appendChild(new InlineSvg("0 0 20 20", getSvgPath("fullsizeOn")));
    maximizeButton.addEventListener("click", onMaximizeButton);
    minimizeButton.appendChild(new InlineSvg("0 0 20 20", getSvgPath("down")));
    minimizeButton.addEventListener("click", onMinimizeButton);
    localVideo.addEventListener("click", onVideoClick), localVideo.addEventListener("loadedmetadata", onLoadedMetaData);
    remoteVideo.addEventListener("click", onVideoClick), remoteVideo.addEventListener("loadedmetadata", onLoadedMetaData);
    chatButton.appendChild(new InlineSvg("0 0 20 20", getSvgPath("chat")));
    chatButton.appendChild(createTooltip("chat"));
    chatButton.addEventListener("click", onChatButton);
    configButton.appendChild(new InlineSvg("0 0 20 20", getSvgPath("config")));
    configButton.appendChild(createTooltip("settings"));
    configButton.addEventListener("click", onConfigButton);
    shareButton.appendChild(new InlineSvg("0 0 20 20", getSvgPath("shareScreen")));
    shareButton.appendChild(createTooltip("shareScreen"));
    shareButton.addEventListener("click", onShareButton);
    muteButton.appendChild(new InlineSvg("0 0 20 20", getSvgPath("microphone")));
    muteButton.appendChild(createTooltip("microphoneOnOff"));
    muteButton.addEventListener("click", onMuteButton);
    cameraButton.appendChild(new InlineSvg("0 0 20 20", getSvgPath("videocam")));
    cameraButton.appendChild(createTooltip("cameraOnOff"));
    cameraButton.addEventListener("click", onCameraButton);
    exitButton.appendChild(new InlineSvg("0 0 20 20", getSvgPath("hangup")));
    exitButton.appendChild(createTooltip("quit"));
    exitButton.addEventListener("click", onExitButton);
    let chat = null, config = null, connectTime = null, interval = null, getUserMediaPromise = null, localStream = null, codecAudio = null, codecVideo = null, displayMediaPromise = null, displayMediaStream = null;
    function localStorageSet(name, value) { localStorage.setItem("innovaphone-widget-" + name, value) }
    function localStorageGet(name) { return localStorage.getItem("innovaphone-widget-" + name) }
    function localStorageDel(name) { return localStorage.removeItem("innovaphone-widget-" + name) }
    div.init = function (_name, _department, _company, picture, video, license) {
        const fullScreenVideo = innovaphone.widgets.widget.getOption("fullScreenVideo");
        headText.innerText = innovaphone.widgets.widget.getString("call");
        avatar.src = picture;
        avatar.style.visibility = picture ? "visible" : "hidden";
        name.innerText = _name;
        department.innerText = _department;
        company.innerText = _company;
        localVideo.muted = true;
        localVideo.srcObject = null;
        remoteVideo.srcObject = null;
        div.classList.remove("minimized");
        spinner.classList.remove("hidden");
        video ? div.classList.add("maxWidth420px") : div.classList.remove("maxWidth420px");
        video ? videos.classList.remove("hidden") : videos.classList.add("hidden");
        video ? cameraButton.classList.remove("hidden") : cameraButton.classList.add("hidden");
        video ? maximizeButton.classList.remove("hidden") : maximizeButton.classList.add("hidden");
        video && fullScreenVideo ? remoteVideo.classList.add("innovaphone-full-screen") : remoteVideo.classList.remove("innovaphone-full-screen")
        if (div.classList.contains("maximized")) onMaximizeButton();
        shareButton.classList.add("hidden");
        chat = chat || div.appendChild(new Chat(div));
        chat.hide(), chat.clear();
        chatButton.removeAttribute("active");
        config = config || div.appendChild(new DeviceConfig(div));
        config.hide();
        configButton.removeAttribute("active");
        foot.appendChild(exitButton);
        claim.style.display = license ? "none" : null;
        div.setAttribute("state", "init");
        div.onCallInfo("init", "startingDevices");
        if (!navigator.mediaDevices) {
            let error = "API MediaDevices not available";
            if (document.location.protocol === "http:") error = "Secure context (HTTPS) required";
            setTimeout(function () { div.onExit("terminated", error) });
            return;
        }
        if (!getUserMediaPromise) {
            const supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
            const audioinput = localStorageGet("audioinput"), videoinput = localStorageGet("videoinput");
            if (audioinput) {
                constraints.audio.deviceId = { ideal: audioinput };
            }
            if (video) {
                constraints.video = videoinput ? constraints.video = { deviceId: { ideal: videoinput } } : {};
                if (!videoinput && supportedConstraints.facingMode) constraints.video.facingMode = "user";
                if (supportedConstraints.width) constraints.video.width = { ideal: 1280 };
                if (supportedConstraints.aspectRatio) constraints.video.aspectRatio = { ideal: 16 / 9 };
            }
            else {
                delete constraints.video;
            }
            console.debug("constraints: " + JSON.stringify(constraints));
            getUserMediaPromise = navigator.mediaDevices.getUserMedia(constraints);
            getUserMediaPromise.then(function (stream) { onComplete(stream, null) });
            getUserMediaPromise.catch(function (error) { onComplete(null, error) });
            function onComplete(stream, error) {
                getUserMediaPromise = null;
                spinner.classList.add("hidden");
                if (div.getAttribute("state") === "init") {
                    localStream = localVideo.srcObject = stream;
                    if (stream) {
                        const audioTrack = stream.getAudioTracks()[0];
                        const videoTrack = stream.getVideoTracks()[0];
                        div.onInit(audioTrack, videoTrack);
                        if (navigator.platform.includes("Mac")) {
                            localVideo.play().catch(function(error) {});
                        }
                    }
                    else if (video) {
                        if (videoinput) localStorageDel("videoinput"); // try with 'any' camera
                        else video = false; // re-try without video
                        setTimeout(function () { div.init(_name, _department, _company, picture, video, license) });
                    }
                    else {
                        div.onExit("terminated", error.toString());
                    }
                }
                else if (stream) stream.getTracks().forEach(track => track.stop());
                setAudioOutput(localStorageGet("audiooutput"));
            }
        }
    }
    div.onCallInfo = function (state, cause) {
        div.setAttribute("state", state);
        cause = innovaphone.widgets.causeCodeToText(cause);
        console.debug("CallDialog::onCallInfo() state=" + state + " cause=" + cause);
        if (state === "connected") {
            updateStatus("start-call-btn", "Falando", "#9c031d")
            if (!interval) {
                connectTime = new Date();
                headTime.innerText = "00:00";
                interval = setInterval(onTick, 1000);
            }
        }
        else {
            headTime.innerText = "";
            interval = clearInterval(interval);
            if (state === "alerting") {
                updateStatus("start-call-btn", "Chamando", "#afaa10")
                headTime.innerText = innovaphone.widgets.widget.getString("alerting");
            }
            if (state === "terminated") {
                div.removeAttribute("audio-codec"), codecAudio = null;
                div.removeAttribute("video-codec"), codecVideo = null;
                if (localStream) localStream.getTracks().forEach(track => track.stop());
                localStream = null;
                localVideo.removeAttribute("format");
                remoteVideo.removeAttribute("format");
                if (displayMediaStream) onShareButton();
                div.removeAttribute("muted");
                div.onExit(state, cause);
                updateStatus("start-call-btn", "Disponível", "#00a000")
            }
        }
        // Função para alterar o valor do status
        function updateStatus(buttonId, newStatus, color) {
            const buttonElement = document.getElementById(buttonId);
            if (buttonElement) {
                const statusElement = buttonElement.querySelector(".status"); // Localiza o elemento dentro do botão pai
                if (statusElement) {
                    statusElement.textContent = newStatus; // Altera o texto do status
                    statusElement.style.backgroundColor = color; // Altera a cor do fundo do status
                }
            }
        }
    }
    div.imMessage = function (text) {
        chat.imMessage(text);
        if (!chat.visible()) {
            badgeCount.innerText = Number(badgeCount.innerText) + 1;
            const minimized = div.classList.contains("minimized");
            if (minimized) headText.appendChild(badgeCount);
            else chatButton.appendChild(badgeCount);
        }
    }
    div.onRtpStats = function (rtpStats) {
        if (codecAudio !== rtpStats.codecAudio || codecVideo !== rtpStats.codecVideo) {
            codecAudio = rtpStats.codecAudio, codecVideo = rtpStats.codecVideo;
            codecAudio ? div.setAttribute("audio-codec", codecAudio) : div.removeAttribute("audio-codec");
            codecVideo ? div.setAttribute("video-codec", codecVideo) : div.removeAttribute("video-codec");
            console.debug("CallDialog::onRtpStats() codecAudio=" + rtpStats.codecAudio + " codecVideo=" + rtpStats.codecVideo)
            const canShareScreen = codecVideo && navigator.mediaDevices.getDisplayMedia;
            canShareScreen ? shareButton.classList.remove("hidden") : shareButton.classList.add("hidden");
        }
    }
    div.onRemoteVideo = function (stream) {
        remoteVideo.srcObject = stream;
        if (navigator.platform.includes("Mac")) {
            remoteVideo.play().catch(function(error) {});
        }
    }
    function setAudioOutput(deviceId) {
        innovaphone.widgets.widget.setAudioOutput(deviceId);
    }
    function onMinimizeButton(ev) {
        const minimized = div.classList.toggle("minimized");
        if (minimized) {
            head.insertBefore(exitButton, minimizeButton);
            headText.appendChild(badgeCount);
            if (div.classList.contains("maximized")) onMaximizeButton();
            chat.hide();
        }
        else {
            foot.appendChild(exitButton);
            chatButton.appendChild(badgeCount);
        }
    }
    function onMaximizeButton(ev) {
        const maximized = div.classList.toggle("maximized");
        const path = getSvgPath(maximized ? "fullsizeOff" : "fullsizeOn");
        maximizeButton.firstChild.firstChild.setAttribute("d", path);
        if (!maximized) videos.style.flexDirection = null;
    }
    function onExitButton(ev) {
        const state = div.getAttribute("state");
        console.debug("CallDialog::onExitButton(" + state + ")");
        if (div.onExit) div.onExit(state);
        div.onCallInfo("aborted");
    }
    function onMuteButton(ev) {
        if (localStream) {
            const track = localStream.getAudioTracks()[0];
            track.enabled = !track.enabled;
            const path = getSvgPath(track.enabled ? "microphone" : "microphoneOff");
            muteButton.firstChild.firstChild.setAttribute("d", path);
            div.setAttribute("muted", !track.enabled);
            onTick(); // update header text
        }
    }
    function onCameraButton(ev) {
        if (localStream) {
            const track = localStream.getVideoTracks()[0];
            track.enabled = !track.enabled;
            const path = getSvgPath(track.enabled ? "videocam" : "videocamOff");
            cameraButton.firstChild.firstChild.setAttribute("d", path);
            div.setAttribute("cameraOff", !track.enabled);
            onTick(); // update header text
        }
    }
    function initializeVideoMode(width, height) {
        if (width && height) {
            const mode = (width >= height) ? "flat" : "overlay";
            if (mode === "flat") {
                remoteVideo.classList.remove("overlay");
                localVideo.classList.remove("overlay");
                videos.appendChild(remoteVideo);
            }
            else if (mode === "overlay") {
                remoteVideo.classList.remove("overlay");
                localVideo.classList.add("overlay");
                videos.appendChild(localVideo);
            }
            videos.setAttribute("mode", mode);
        }
    }
    function onLoadedMetaData(ev) {
        const player = (ev.srcElement === localVideo) ? localVideo : remoteVideo;
        player.setAttribute("format", player.videoWidth + "x" + player.videoHeight);
        if (ev.srcElement === localVideo) initializeVideoMode(player.videoWidth, player.videoHeight);
    }
    function onVideoClick(ev) {
        const clicked = (ev.srcElement === localVideo) ? localVideo : remoteVideo;
        const other = (ev.srcElement === localVideo) ? remoteVideo : localVideo;
        if (clicked.style.flexShrink === "1") clicked.style.flexShrink = null;
        else clicked.style.flexShrink = "1", other.style.flexShrink = null;
        // check video-mode ('flat' or 'overlay')
        const mode = videos.getAttribute("mode");
        if (mode === "overlay") {
            clicked.classList.remove("overlay");
            other.classList.add("overlay");
            videos.appendChild(other);
        }
    }
    function onChatButton(ev) {
        chat.visible() ? hideChat() : showChat();
        hideConfig();
    }
    function onConfigButton(ev) {
        config.visible() ? hideConfig() : showConfig();
        hideChat();
    }
    function onShareButton(ev) {
        if (displayMediaStream) {
            displayMediaStream.getTracks().forEach(track => track.stop());
            displayMediaStream = null;
            shareButton.setAttribute("active", false);
            innovaphone.widgets.widget.shareScreen(null);
        }
        else if (!displayMediaPromise && navigator.mediaDevices.getDisplayMedia) {
            displayMediaPromise = navigator.mediaDevices.getDisplayMedia({});
            displayMediaPromise.then(function (stream) { onDisplayMedia(stream, null) });
            displayMediaPromise.catch(function (error) { onDisplayMedia(null, error) });
            function onDisplayMedia(stream, error) {
                displayMediaPromise = null;
                console.debug("CallDialog::onDisplayMedia() " + stream || error);
                if (stream) stream.getVideoTracks()[0].onended = function (ev) {
                    displayMediaStream = null;
                    shareButton.setAttribute("active", false);
                    innovaphone.widgets.widget.shareScreen(null);
                };
                displayMediaStream = stream;
                shareButton.setAttribute("active", displayMediaStream ? true : false);
                innovaphone.widgets.widget.shareScreen(stream);
            }
        }
    }
    function showChat() {
        chat.show(), chat.setFocus();
        chatButton.setAttribute("active", true);
        badgeCount.innerText = "";
    }
    function hideChat() {
        chat.hide();
        chatButton.setAttribute("active", false);
    }
    function showConfig() {
        config.show();
        configButton.setAttribute("active", true);
    }
    function hideConfig() {
        config.hide();
        configButton.setAttribute("active", false);
    }
    function onTick() {
        const now = new Date();
        const muted = div.getAttribute("muted") === "true";
        if (muted) headTime.innerText = innovaphone.widgets.widget.getString("muted");
        else headTime.innerText = innovaphone.widgets.printDuration(now - connectTime);
    }
    if (window.ResizeObserver) {
        const resizeObserver = new window.ResizeObserver(function (elements) {
            elements.forEach(function (element) {
                if (element.target === videos) {
                    const maximized = div.classList.contains("maximized");
                    const rect = videos.getBoundingClientRect();
                    const ratio = rect.width / rect.height;
                    videos.style.flexDirection = (maximized && ratio > 1.5) ? "row" : "column";
                }
                if (element.target === document.body) {
                    if (chat && chat.visible()) chat.setPosition();
                    if (config && config.visible()) config.setPosition();
                }
            });
        });
        resizeObserver.observe(videos);
        resizeObserver.observe(document.body);
    }
    function Chat(parent) {
        const chat = createElement("div", "innovaphone-widget-call-chat")
        const head = chat.appendChild(createElement("div", "innovaphone-widget-call-chat-head"));
        const body = chat.appendChild(createElement("div", "innovaphone-widget-call-chat-body"));
        const foot = chat.appendChild(createElement("div", "innovaphone-widget-call-chat-foot"));
        head.innerText = "Chat";
        const closeX = head.appendChild(createElement("button"));
        closeX.appendChild(new InlineSvg("0 0 32 32", getSvgPath("close32")));
        closeX.addEventListener("click", onChatButton);
        const list = body.appendChild(createElement("div", "innovaphone-widget-call-chat-list"));
        const input = foot.appendChild(createElement("input"));
        input.placeholder = innovaphone.widgets.widget.getString("writeYourMessage");
        input.onkeydown = function (ev) { if (ev.code === "Enter") sendButton.click() }
        const sendButton = foot.appendChild(createElement("button"));
        sendButton.appendChild(new InlineSvg("0 0 26 26", getSvgPath("send")));
        sendButton.addEventListener("keypress", function (ev) { input.focus() });
        sendButton.addEventListener("click", onSendButton);
        const scrollIntoViewOptions = { behavior: "smooth", block: "end", inline: "nearest" };
        function onSendButton(ev) {
            if (input.value) {
                const chatItem = new innovaphone.widgets.ChatItem(input.value, null, null, "innovaphone-widget-chat-item outbound");
                list.appendChild(chatItem).scrollIntoView(scrollIntoViewOptions);
                innovaphone.widgets.widget.chatSend(input.value);
                input.value = "";
            }
        }
        function setPosition() {
            const video = parent.getAttribute("video-codec");
            const width = 2 * parent.clientWidth + parseInt(getComputedStyle(parent).marginRight);
            const position = video ? ((window.innerWidth < width) ? "above" : "left") : "top";
            ["top", "left", "above"].forEach(function (className) {
                if (className === position) chat.classList.add(className);
                else chat.classList.remove(className);
            });
        }
        chat.imMessage = function (text) {
            console.debug("CallDialog::Chat::imMessage() text=" + text);
            const html = null, attach = null;
            const chatItem = new innovaphone.widgets.ChatItem(text, html, attach, "innovaphone-widget-chat-item inbound");
            list.appendChild(chatItem).scrollIntoView(scrollIntoViewOptions);
        }
        chat.setPosition = setPosition;
        chat.setFocus = function () { input.focus() }
        chat.show = function () { setPosition(), chat.classList.add("visible") };
        chat.hide = function () { chat.classList.remove("visible") }
        chat.visible = function () { return chat.classList.contains("visible") }
        chat.clear = function () { list.innerText = "" }
        return chat;
    }
    function DeviceConfig(parent) {
        const self = createElement("div", "innovaphone-widget-call-config")
        const head = self.appendChild(createElement("div", "innovaphone-widget-call-config-head"));
        const body = self.appendChild(createElement("div", "innovaphone-widget-call-config-body"));
        const foot = self.appendChild(createElement("div", "innovaphone-widget-call-config-foot"));
        head.innerText = innovaphone.widgets.widget.getString("settings");
        const closeX = head.appendChild(createElement("button"));
        closeX.appendChild(new InlineSvg("0 0 32 32", getSvgPath("close32")));
        closeX.addEventListener("click", onConfigButton);
        const audioOutputHead = body.appendChild(createElement("div", "innovaphone-widget-call-config-body-head"));
        const audioOutputList = body.appendChild(createElement("div", "innovaphone-widget-call-config-body-list"));
        audioOutputHead.appendChild(new InlineSvg("0 0 20 20", getSvgPath("speaker")));
        audioOutputHead.appendChild(createElement("div")).innerText = innovaphone.widgets.widget.getString("outputDevice");
        const audioInputHead = body.appendChild(createElement("div", "innovaphone-widget-call-config-body-head"));
        const audioInputList = body.appendChild(createElement("div", "innovaphone-widget-call-config-body-list"));
        audioInputHead.appendChild(new InlineSvg("0 0 20 20", getSvgPath("microphone")));
        audioInputHead.appendChild(createElement("div")).innerText = innovaphone.widgets.widget.getString("inputDevice");
        const videoInputHead = body.appendChild(createElement("div", "innovaphone-widget-call-config-body-head"));
        const videoInputList = body.appendChild(createElement("div", "innovaphone-widget-call-config-body-list"));
        videoInputHead.appendChild(new InlineSvg("0 0 20 20", getSvgPath("videocam")));
        videoInputHead.appendChild(createElement("div")).innerText = innovaphone.widgets.widget.getString("camera");
        const applyButton = foot.appendChild(createElement("button"));
        applyButton.innerText = innovaphone.widgets.widget.getString("apply");
        applyButton.addEventListener("click", onApplyButton);
        const selected = {};
        function enumerate() {
            if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                const promise = navigator.mediaDevices.enumerateDevices();
                promise.then(function (devices) {
                    console.debug("devices=" + JSON.stringify(devices));
                    audioOutputList.innerText = "";
                    const audioOutput = devices.filter(dev => dev.kind === "audiooutput" && dev.label && dev.deviceId !== "default" && dev.deviceId !== "communications");
                    audioOutput.forEach(function (dev) {
                        const option = audioOutputList.appendChild(new Device(dev.kind, dev.deviceId, dev.label));
                        option.onclick = function (ev) { localStorageSet(dev.kind, dev.deviceId), setAudioOutput(dev.deviceId) }
                        if (localStorageGet(dev.kind) === dev.deviceId) option.setChecked(true);
                    });
                    audioInputList.innerText = "";
                    const audioInput = devices.filter(dev => dev.kind === "audioinput" && dev.label && dev.deviceId !== "default" && dev.deviceId !== "communications");
                    const localAudioTrack = localStream ? localStream.getAudioTracks()[0] : null;
                    const currentAudioInput = localAudioTrack ? localAudioTrack.label : null;
                    const selectedAudioInput = localStorageGet("audioinput");
                    audioInput.forEach(function (dev) {
                        const option = audioInputList.appendChild(new Device(dev.kind, dev.deviceId, dev.label));
                        option.onclick = function (ev) { localStorageSet(dev.kind, dev.deviceId) }
                        if (dev.label === currentAudioInput) option.setChecked(true);
                        if (currentAudioInput.includes(dev.label)) option.setChecked(true);
                        if (dev.deviceId === localStorageGet(dev.kind)) option.setChecked(true);
                    });
                    videoInputList.innerText = "";
                    const videoInput = devices.filter(dev => dev.kind === "videoinput" && dev.label && dev.deviceId !== "default" && dev.deviceId !== "communications");
                    const localVideoTrack = localStream ? localStream.getVideoTracks()[0] : null;
                    const currentVideoInput = localVideoTrack ? localVideoTrack.label : null;
                    videoInput.forEach(function (dev) {
                        const option = videoInputList.appendChild(new Device(dev.kind, dev.deviceId, dev.label));
                        option.onclick = function (ev) { localStorageSet(dev.kind, dev.deviceId) }
                        if (dev.label === currentVideoInput) option.setChecked(true);
                        if (dev.deviceId === localStorageGet(dev.kind)) option.setChecked(true);
                    });
                    const defaultAudio = devices.filter(dev => dev.deviceId === "communications");
                });
                promise.catch(function (error) { });
            }
            if (constraints.video) videoInputHead.classList.remove("hidden"), videoInputList.classList.remove("hidden");
            else videoInputHead.classList.add("hidden"), videoInputList.classList.add("hidden");
        }
        function Device(group, id, name) {
            const device = createElement("div");
            const input = device.appendChild(createElement("input"));
            const label = device.appendChild(createElement("label"));
            input.setAttribute("type", "radio"), input.setAttribute("name", group), input.setAttribute("id", id);
            label.setAttribute("for", id), label.innerText = name;
            device.setChecked = function (checked) { input.checked = checked }
            return device;
        }
        function onApplyButton(ev) {
            const selectedAudioInput = localStorageGet("audioinput");
            const selectedVideoInput = localStorageGet("videoinput");
            let changed = false;
            if (constraints.audio && selectedAudioInput) {
                if (constraints.audio === true) constraints.audio = {};
                constraints.audio.deviceId = constraints.audio.deviceId || {};
                if (constraints.audio.deviceId.ideal !== selectedAudioInput) {
                    constraints.audio.deviceId.ideal = selectedAudioInput, changed = true;
                }
            }
            if (constraints.video && selectedVideoInput) {
                constraints.video.deviceId = constraints.video.deviceId || {};
                if (constraints.video.deviceId.ideal !== selectedVideoInput) {
                    constraints.video.deviceId.ideal = selectedVideoInput, changed = true;
                }
            }
            console.debug("DeviceConfig::onApplyButton() localStream=" + localStream + " changed=" + changed);
            if (localStream && changed) {
                // apply selected devices to ongoing call
                const promise = navigator.mediaDevices.getUserMedia(constraints);
                promise.then(function (stream) { onComplete(stream, null) });
                promise.catch(function (error) { onComplete(null, error) });
                function onComplete(stream, error) {
                    if (stream) {
                        const muted = localStream.getAudioTracks()[0].enabled ? false : true;
                        const audioTrack = stream.getAudioTracks()[0];
                        const videoTrack = stream.getVideoTracks()[0];
                        if (audioTrack) innovaphone.widgets.widget.addTrack(audioTrack);
                        if (videoTrack) innovaphone.widgets.widget.addTrack(videoTrack);
                        if (localStream) localStream.getTracks().forEach(track => track.stop());
                        localStream = localVideo.srcObject = stream;
                        localStream.getAudioTracks()[0].enabled = !muted;
                    }
                    else {
                        console.warn("DeviceConfig::onApplyButton() error=" + error);
                    }
                }
            }
        }
        function setPosition() {
            const video = parent.getAttribute("video-codec");
            const width = 2 * parent.clientWidth + parseInt(getComputedStyle(parent).marginRight);
            const position = video ? ((window.innerWidth < width) ? "above" : "left") : "top";
            ["top", "left", "above"].forEach(function (className) {
                if (className === position) self.classList.add(className);
                else self.classList.remove(className);
            });
        }
        self.setPosition = setPosition;
        self.show = function () { setPosition(), self.classList.add("visible"), enumerate() };
        self.hide = function () { self.classList.remove("visible") }
        self.visible = function () { return self.classList.contains("visible") }
        return self;
    }
    div.setAttribute("name", "DeviceConfig");
    return div;
}

innovaphone.widgets.ExitDialog = function () {
    function createElement(tagName, className) {
        const element = document.createElement(tagName);
        if (className) element.setAttribute("class", className);
        return element;
    }
    const dialog = createElement("div", "innovaphone-widget-dialog");
    const body = dialog.appendChild(createElement("div", "innovaphone-widget-dialog-body"));
    const text = body.appendChild(createElement("div", "innovaphone-widget-dialog-body-text"));
    const buttons = dialog.appendChild(createElement("div", "innovaphone-widget-dialog-buttons"));
    const okay = buttons.appendChild(createElement("button", "innovaphone-widget-dialog-button-okay"));
    const cancel = buttons.appendChild(createElement("button", "innovaphone-widget-dialog-button-cancel"));
    okay.onclick = function (ev) { if (dialog.onOkay) dialog.onOkay() }
    cancel.onclick = function (ev) { if (dialog.onCancel) dialog.onCancel() }
    dialog.init = function (innerText) {
        text.innerText = innerText;
        okay.innerText = innovaphone.widgets.widget.getString("quit");
        cancel.innerText = innovaphone.widgets.widget.getString("cancel");
    }
    dialog.setAttribute("name", "ExitDialog");
    return dialog;
}

innovaphone.widgets.ErrorDialog = function () {
    function createElement(tagName, className) {
        const element = document.createElement(tagName);
        if (className) element.setAttribute("class", className);
        return element;
    }
    const dialog = createElement("div", "innovaphone-widget-dialog error");
    const body = dialog.appendChild(createElement("div", "innovaphone-widget-dialog-body"));
    const text = body.appendChild(createElement("div", "innovaphone-widget-dialog-body-text"));
    const buttons = dialog.appendChild(createElement("div", "innovaphone-widget-dialog-buttons"));
    const okay = buttons.appendChild(createElement("button", "innovaphone-widget-dialog-button-okay"));
    okay.onclick = function (ev) { if (dialog.onOkay) dialog.onOkay() }
    dialog.init = function (innerText) {
        text.innerText = innerText;
        okay.innerText = innovaphone.widgets.widget.getString("ok");
    }
    dialog.setAttribute("name", "ErrorDialog");
    return dialog;
}

innovaphone.widgets.getSvgPath = function (name) {
    switch (name) {
        case "dropdown": return "M5,8H15l-5,6Z";
        case "up": return "M18,16,10,9,2,16,0,14,10,5l10,9Z";
        case "call": return "M9.21,0A.35.35,0,0,0,8.8.2,27.38,27.38,0,0,0,7,6.5c0,.44,2.08,11.08,2.75,13.23a.41.41,0,0,0,.48.26c.49-.1,1.69-.4,2.33-.56a.55.55,0,0,0,.43-.5c0-.82-.12-3.87-.18-4.87a.42.42,0,0,0-.35-.42,5.62,5.62,0,0,1-2.58-1s-1.27-5.34-1-5.69c.43-.5,2.54-1,2.87-1.31.12-.1.28-3.33.44-4.18a.35.35,0,0,0-.17-.38A14.59,14.59,0,0,0,9.21,0Z";
        case "chat": return "M19,0H1.05C.63,0,0,.72,0,1.21V13.27c0,.48.63,1.2,1.05,1.2H9.56S14.2,18.9,15.47,20a.2.2,0,0,0,.32-.18V14.47h2.62A1.63,1.63,0,0,0,20,12.79V1.21C20,.72,19.37,0,19,0ZM15.79,11.13H4.21V8.91H15.79Zm0-5.56H4.21V3.34H15.79Z";
        case "chatAttach": return "M15.92,9.12l-4.83,6.53a4.44,4.44,0,0,1-4.66,1.76,3.84,3.84,0,0,1-2.21-6l3-4a2.24,2.24,0,0,1,3.14-.47l.5.37a2.17,2.17,0,0,1,.45,3L9,13.42s-1.2,1.62-2,1L10.27,10a1.51,1.51,0,1,0-2.42-1.8L5.27,11.67a3.16,3.16,0,0,0,.4,4.3A3,3,0,0,0,10,15.42l5-6.71a2.71,2.71,0,0,0-.57-3.79l-1.05-.78a2.08,2.08,0,0,0-2.82.42l-.3.4a.5.5,0,0,1-.7.1.51.51,0,0,1-.11-.7L10,3.58A2.54,2.54,0,0,1,13.57,3L15.2,4.25A3.48,3.48,0,0,1,15.92,9.12Z";
        case "close": return "M7.5,10,1.68,4.18l2.5-2.5L10,7.5l5.82-5.82,2.5,2.5L12.5,10l5.82,5.82-2.5,2.5L10,12.5,4.18,18.32l-2.5-2.5Z";
        case "close32": return "M28,7.4,18.4,17,28,26.6,25.6,29,16,19.4,6.4,29,4,26.6,13.6,17,4,7.4,6.4,5,16,14.6,25.6,5Z";
        case "config": return "M17,10a7.78,7.78,0,0,0-.19-1.6l2.6-1.78-1-2.06s-3,1-3,1a7.43,7.43,0,0,0-1.83-1.57s.55-3.1.54-3.1L12,.1s-1.39,2.84-1.39,2.83a6.87,6.87,0,0,0-2.39.21S6.31.6,6.31.59s-2,1.07-2,1.07l1.06,3A7,7,0,0,0,3.82,6.49L.7,6S.06,8.25.06,8.24,2.92,9.57,2.93,9.55a6.87,6.87,0,0,0,.26,2.39S.69,13.87.7,13.87s1.15,2,1.13,2l2.94-1.14a7.17,7.17,0,0,0,1.9,1.47s-.37,3.14-.36,3.13l2.22.58L9.76,17a7.7,7.7,0,0,0,2.38-.34s2,2.44,2,2.43,2-1.18,2-1.18L14.87,15a14,14,0,0,0,1.41-1.95l3.14.27.52-2.23Zm-4.26,2.79A3.95,3.95,0,1,1,13.91,10,3.94,3.94,0,0,1,12.75,12.75Z";
        case "down": return "M2,4.5l8,7,8-7,2,2-10,9L0,6.5Z";
        case "email": return "M20,5.34a.43.43,0,0,0,0,0V16.86a.68.68,0,0,1-.69.64H.69A.71.71,0,0,1,0,16.75V5.39s0,0,0-.07L9.6,14.05a.72.72,0,0,0,.4.24c.2,0,.3,0,.4-.12ZM20,2.5H0l9.52,9a.75.75,0,0,0,1,0Z";
        case "fullsizeOn": return "M12,2h6V8H16V4H12ZM4,8V4H8V2H2V8Zm4,8H4V12H2v6H8Zm8-4v4H12v2h6V12Z";
        case "fullsizeOff": return "M18, 8H12V2h2V6h4ZM6, 2V6H2V8H8V2ZM2, 14H6v4H8V12H2Zm12, 4V14h4V12H12v6Z";
        case "hangup": return "M18.55,7.87a.35.35,0,0,1-.38.16c-.84-.21-4.06-.54-4.15-.66-.26-.35-.86-2.87-1.12-3.1s-5.54.64-5.54.64a11.15,11.15,0,0,0-1.08,3,.45.45,0,0,1-.44.33c-1,0-3.41.11-4.23,0-.23,0-.32-.23-.45-.45A9.39,9.39,0,0,1,0,5.37a.4.4,0,0,1,.28-.46c2.18-.56,12.9-2.11,13.34-2.06a27.25,27.25,0,0,1,6.19,2.23A.36.36,0,0,1,20,5.5,12.05,12.05,0,0,1,18.55,7.87Zm-7.76,7v-4.6H9.28v4.6L7.76,13.36,6.63,14.51,10,18l3.4-3.45-1.13-1.15Z";
        case "link": return "M17.51,6.66l-3.08,3.89a4.7,4.7,0,0,0-.62-2.44l2.13-2.69a1.83,1.83,0,0,0-.3-2.56,1.84,1.84,0,0,0-2.57.3L8.93,8.4a1.88,1.88,0,0,0-.29.54,2,2,0,0,0-.09.8A1.79,1.79,0,0,0,9.24,11a1.67,1.67,0,0,0,.78.35L8.71,13A3.49,3.49,0,0,1,8,12.53a3.8,3.8,0,0,1-1.31-2A3.5,3.5,0,0,1,6.57,10a3.75,3.75,0,0,1,0-.67c0-.09,0-.18,0-.28a2.25,2.25,0,0,1,.06-.36c0-.11.06-.23.1-.34l.09-.24a4,4,0,0,1,.52-.92L11.5,1.92a3.83,3.83,0,0,1,6,4.74ZM13.43,10.2a1.53,1.53,0,0,0,0-.3c0-.13-.05-.26-.08-.38s-.05-.2-.08-.3L13.14,9h0l-.06-.12A2.06,2.06,0,0,0,13,8.59,3.12,3.12,0,0,0,12.57,8h0A2.75,2.75,0,0,0,12,7.47,3.49,3.49,0,0,0,11.29,7L10,8.68a1.8,1.8,0,0,1,.78.36,1.71,1.71,0,0,1,.51.63,2,2,0,0,1,.15.47v0a2.68,2.68,0,0,1,0,.49v0a1.83,1.83,0,0,1-.09.39h0a1.42,1.42,0,0,1-.08.18,1.82,1.82,0,0,1-.2.36h0L6.93,16.84a1.84,1.84,0,0,1-1.22.68H5.39l-.31-.05h0a1.82,1.82,0,0,1-1-2.91l2.11-2.66a5,5,0,0,1-.6-1.82c0-.21,0-.43,0-.64L2.49,13.33a3.85,3.85,0,0,0,.63,5.38h0a3.94,3.94,0,0,0,1.41.69l.14,0a3.75,3.75,0,0,0,.82.1h0a3.39,3.39,0,0,0,.45,0A3.83,3.83,0,0,0,8.5,18.08l4.14-5.24a3.94,3.94,0,0,0,.39-.61l.09-.22c.06-.15.12-.29.17-.44a2.61,2.61,0,0,0,.06-.27,2.93,2.93,0,0,0,.07-.41,2.29,2.29,0,0,0,0-.25s0,0,0-.06A2.38,2.38,0,0,0,13.43,10.2Z";
        case "microphone": return "M7,10.71V1.79C7,.89,7.64,0,8.31,0h3.4C12.36,0,13,.89,13,1.79v8.92c0,.9-.67,1.79-1.34,1.79H8.31C7.64,12.5,7,11.61,7,10.71Zm8.66-2.38a.83.83,0,0,0-.86.84v5H5.23v-5a.83.83,0,0,0-.86-.84.83.83,0,0,0-.87.84v5a2.07,2.07,0,0,0,1.73,1.66H8.7v2.5H7a.85.85,0,0,0-.87.84h0A.84.84,0,0,0,7,20H13a.84.84,0,0,0,.87-.83h0a.85.85,0,0,0-.87-.84H11.3v-2.5h3.47a2.07,2.07,0,0,0,1.73-1.66v-5A.83.83,0,0,0,15.63,8.33Z";
        case "microphoneOff": return "M7,10.71V9.49l3,3H8.36C7.7,12.5,7,11.61,7,10.71ZM13,18.33H11.27v-2.5h2.11l-1.66-1.66H5.36v-5a.82.82,0,0,0-.85-.84.81.81,0,0,0-.84.84v5a2,2,0,0,0,1.69,1.66H8.73v2.5H7A.84.84,0,1,0,7,20H13a.84.84,0,1,0,0-1.67Zm6.25-1.26-2.88-2.89h0v-5a.81.81,0,0,0-.84-.84.82.82,0,0,0-.85.84V12.5L13,10.8s0-.06,0-.09V1.79C13,.89,12.3,0,11.67,0H8.36C7.7,0,7,.89,7,1.79V4.9L2.69.54a.6.6,0,0,0-.84,0L1.5.9a.6.6,0,0,0,0,.84L7,7.28H7l5.07,5.06h0l1.82,1.82h0l1.42,1.42h0L18,18.26a.6.6,0,0,0,.84,0l.35-.36A.59.59,0,0,0,19.21,17.07Z";
        case "shareScreen": return "M19,0H6.06A1.06,1.06,0,0,0,5,1.05V8H1.06A1.06,1.06,0,0,0,0,9.05V19A1.06,1.06,0,0,0,1.06,20H14A1,1,0,0,0,15,19V12H19A1,1,0,0,0,20,11V1.05A1,1,0,0,0,19,0ZM13,18H2V10H13Zm5-8H15V9.05A1,1,0,0,0,14,8H7V2H18Z";
        case "send": return "M1,23L25,13L1,3L1,10.5L18,13L1,15.5Z";
        case "send2": return "M20,9.8,1.54,19.88a1,1,0,0,1-1.4-1.1l1.74-7.06,14-1.72L2,8.29.14,1.21A1,1,0,0,1,1.54.12Z";
        case "shareArrow": return "M11.27,16V12.06a9.8,9.8,0,0,0-1.91-.15A9.69,9.69,0,0,0,7,12.29a6.54,6.54,0,0,0-2.18,1.15,6.7,6.7,0,0,0-1.67,2A7.34,7.34,0,0,1,4,12.79a8.34,8.34,0,0,1,2-2.27A11.86,11.86,0,0,1,8.65,9a13.14,13.14,0,0,1,2.64-.82V4l5.56,6.73Z";
        case "speaker": return "M1.8,12.25H.9a.9.9,0,0,1-.9-.9V8.64a.9.9,0,0,1,.9-.9H5.21A24.54,24.54,0,0,0,10,3.59a.45.45,0,0,1,.64,0,.52.52,0,0,1,.14.32V16.09a.46.46,0,0,1-.45.46.46.46,0,0,1-.32-.13l-.35-.36a25.58,25.58,0,0,0-4.5-3.81H4.51M15,12.91a12.19,12.19,0,0,0,0-5.82,1,1,0,1,0-1.94.49,10.16,10.16,0,0,1,0,4.84,1,1,0,0,0,.72,1.22l.25,0A1,1,0,0,0,15,12.91Zm3.83,1.33.33-1.33a11.94,11.94,0,0,0,0-5.82l-.33-1.33A1,1,0,0,0,17.65,5a1,1,0,0,0-.73,1.21l.33,1.33a10,10,0,0,1,0,4.85l-.33,1.34A1,1,0,0,0,17.65,15l.24,0A1,1,0,0,0,18.86,14.24Z";
        case "videocam": return "M13,3.3c0-.46-.26-.8-.6-.8H.6c-.34,0-.6.34-.6.8V16.7c0,.46.26.8.6.8H12.37c.29,0,.58-.33.67-.66M20,5.47c0-.18-.1-.32-.24-.32L15,6.91c-.13,0-.24.14-.24.33v5.52c0,.19.11.33.24.33l4.71,1.76c.12,0,.23-.13.27-.27";
        case "videocamOff": return "M13,3.3c0-.46-.26-.8-.6-.8H.6c-.34,0-.6.34-.6.8V16.7c0,.46.26.8.6.8H12.37c.29,0,.58-.33.67-.66m-3-4.76a.24.24,0,0,1,0,.33L9,13.49a.22.22,0,0,1-.33,0L6.52,11.3,4.35,13.49a.21.21,0,0,1-.32,0L3,12.41a.24.24,0,0,1,0-.33l2.16-2.2L3,7.69a.24.24,0,0,1,0-.33L4,6.27a.22.22,0,0,1,.32,0l2.17,2.2,2.16-2.2a.24.24,0,0,1,.33,0l1.07,1.09a.24.24,0,0,1,0,.33L7.91,9.88ZM20,5.47c0-.18-.1-.32-.24-.32L15,6.91c-.13,0-.24.14-.24.33v5.52c0,.19.11.33.24.33l4.71,1.76c.12,0,.23-.13.27-.27";
    }
}

innovaphone.widgets.InlineSvg = function (viewBox, pathData, pathData2) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", viewBox);
    svg.innerHTML = "<path d='" + pathData + "'></path>";
    if (pathData2) svg.innerHTML += "<path d='" + pathData2 + "'></path>";
    return svg;
}

innovaphone.widgets.printDuration = function (milliseconds) {
    var secs = milliseconds / 1000;
    var hours = Math.floor(secs / 3600);
    var minutes = Math.floor((secs - (hours * 3600)) / 60);
    var seconds = Math.floor(secs - (hours * 3600) - (minutes * 60));
    if (seconds < 10) { seconds = "0" + seconds; }
    if (minutes < 10) { minutes = "0" + minutes; }
    if (hours < 10) { hours = "0" + hours; }
    // auto-format
    if (Number(hours)) return hours + ":" + minutes + ":" + seconds;
    return minutes + ":" + seconds;
}

innovaphone.widgets.printTime = function (time) {
    let hours = time.getHours();
    if (hours < 10) hours = "0" + hours;
    let minutes = time.getMinutes();
    if (minutes < 10) minutes = "0" + minutes;
    return hours + ":" + minutes;
}

innovaphone.widgets.websiteLanguage = function (lang) {
    // widget lang can be one of ["ca", "cs", "de", "en", "es", "eu", "fr", "it", "nl", "pl", "pt", "ru", "si"]
    const languages = ["en", "de", "it", "nl", "fr", "es", "pl", "br"];
    let index = languages.indexOf(lang);
    if (index >= 0) return languages[index];
    if (lang === "ca" || lang === "eu") return "es";
    if (lang === "pt") return "br";
    return "en";
}

innovaphone.widgets.makeCall = function (dn, to) {
    const callDialog = document.body.appendChild(new innovaphone.widgets.CallDialog());
    callDialog.init(to, dn, 'wecom', '', false, '');
    callDialog.onInit = function (audioTrack, videoTrack) {
        innovaphone.widgets.widget.startCall(callDialog, dn, to, audioTrack, videoTrack);
    }
    callDialog.onExit = function (state, cause) {
        if (state === "connected") {
            exitDialog.init(innovaphone.widgets.widget.getString("wantEndCall"));
            exitDialog.onCancel = function () { 
                //showElement(callDialog) 
                }
            exitDialog.onOkay = function () {
                if (state !== "terminated") innovaphone.widgets.widget.clearCall();
                //showElement(null);
            }
            //showElement(exitDialog);
        }
        else {
            if (state !== "init" && state !== "terminated") innovaphone.widgets.widget.clearCall();
            //showElement(null);
            if (typeof cause === "string") {
                errorDialog.init(cause);
                errorDialog.onOkay = function () { showElement(null) }
                //showElement(errorDialog);
            }
        }
    }
    //showElement(callDialog);
}

innovaphone.widgets.SidebarWidgetUi.src = document.currentScript.src;