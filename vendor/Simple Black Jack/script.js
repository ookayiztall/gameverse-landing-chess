// app state
// ===================
// These variables represent the state of our application, they tell us at
// any given moment the state of our blackjack game. You might find it useful
// to use these to debug issues by console logging them in the functions below.
"use strict";
var deckID = "";
var dealerCards = [];
var playerCards = [];
var playerScore = 0;
var dealerScore = 0;
var roundLost = false;
var roundWon = false;
var roundTied = false;
var balance = 1000;
var bet = 25;
var lockedBet = 0;
var betLocked = false;
var handBets = [];
var handDoubled = [];
var splitActive = false;
var playerHands = [];
var currentHandIndex = 0;
var handFinished = [];
var handsPlayed = 0;
var wins = 0;
var losses = 0;
var ties = 0;
var winStreak = 0;
var bestStreak = 0;
var dailyDate = "";
var dailyWins = 0;
var dailyTarget = 3;
var roundSettled = false;
var hideDealerHoleCard = true;
var toolbarNode = null;
var betMinusNode = null;
var betPlusNode = null;
var betValueNode = null;
var balanceValueNode = null;
var statsValueNode = null;
var challengeValueNode = null;
var handsBadgeValueNode = null;
var winRateBadgeValueNode = null;
var streakBadgeValueNode = null;
var dailyBadgeValueNode = null;
var gameAreaNode = null;
var doubleDownNode = null;
var splitNode = null;


// game play nodes:
// ===================
// These nodes will be used often to update the UI of the game.

// assign this variable to the DOM node which has id="dealer-number"
var dealerScoreNode = document.getElementById("dealer-number");

// select the DOM node which has id="player-number"
var playerScoreNode = document.getElementById("player-number");

// select the DOM node which has id="dealer-cards"
var dealerCardsNode = document.getElementById("dealer-cards");

// select the DOM node which has id="player-cards"
var playerCardsNode = document.getElementById("player-cards");

// select the DOM node which has id="announcement"
var announcementNode = document.getElementById("announcement");

// select the DOM node which has id=new-game"
var newDeckNode = document.getElementById("new-game");

// select the DOM node which has id="next-hand"
var nextHandNode = document.getElementById("next-hand");

// select the DOM node which has id=""hit-me""
var hitMeNode = document.getElementById("hit-me");

// select the DOM node which has id="stay"
var stayNode = document.getElementById("stay");


// On click events
// ==================
// These events define the actions to occur when a button is clicked.
// These are provided for you and serve as examples for creating further
// possible actions of your own choosing.
setupMeta();
setupToolbar();
setupActionButtons();
updateHud();

newDeckNode.onclick = () => {
    playClick();
    getNewDeck();
};
nextHandNode.onclick = () => {
    playClick();
    newHand();
};
hitMeNode.onclick = () => {
    playClick();
    hitMe("player");
};
stayNode.onclick = () => {
    playClick();
    onStay();
};
// ==================


// Game mechanics functions
// ========================

function loadNumber(key, fallback) {
    try {
        var raw = localStorage.getItem(key);
        if (raw == null) return fallback;
        var value = Number(raw);
        return Number.isFinite(value) ? value : fallback;
    } catch {
        return fallback;
    }
}

function saveNumber(key, value) {
    try {
        localStorage.setItem(key, String(value));
    } catch { }
}

function setupMeta() {
    balance = loadNumber("gv_blackjack_balance", 1000);
    bet = loadNumber("gv_blackjack_bet", 25);
    handsPlayed = loadNumber("gv_blackjack_handsPlayed", 0);
    wins = loadNumber("gv_blackjack_wins", 0);
    losses = loadNumber("gv_blackjack_losses", 0);
    ties = loadNumber("gv_blackjack_ties", 0);
    winStreak = loadNumber("gv_blackjack_winStreak", 0);
    bestStreak = loadNumber("gv_blackjack_bestStreak", 0);
    dailyDate = "";
    dailyWins = 0;
    ensureDaily();
}

function ensureDaily() {
    var today = new Date().toISOString().slice(0, 10);
    try {
        dailyDate = localStorage.getItem("gv_blackjack_daily_date") || "";
        dailyWins = loadNumber("gv_blackjack_daily_wins", 0);
    } catch { }
    if (dailyDate !== today) {
        dailyDate = today;
        dailyWins = 0;
        try {
            localStorage.setItem("gv_blackjack_daily_date", dailyDate);
            localStorage.setItem("gv_blackjack_daily_wins", "0");
        } catch { }
    }
}

function saveMeta() {
    saveNumber("gv_blackjack_balance", balance);
    saveNumber("gv_blackjack_bet", bet);
    saveNumber("gv_blackjack_handsPlayed", handsPlayed);
    saveNumber("gv_blackjack_wins", wins);
    saveNumber("gv_blackjack_losses", losses);
    saveNumber("gv_blackjack_ties", ties);
    saveNumber("gv_blackjack_winStreak", winStreak);
    saveNumber("gv_blackjack_bestStreak", bestStreak);
    try {
        localStorage.setItem("gv_blackjack_daily_date", dailyDate);
        localStorage.setItem("gv_blackjack_daily_wins", String(dailyWins));
    } catch { }
}

function setupToolbar() {
    gameAreaNode = document.getElementById("game-area");
    if (!gameAreaNode) return;

    var dealerArea = document.getElementById("dealer-area");
    toolbarNode = document.createElement("div");
    toolbarNode.id = "game-toolbar";

    var left = document.createElement("div");
    left.className = "left";
    var center = document.createElement("div");
    var right = document.createElement("div");
    right.className = "right";

    var betWrap = document.createElement("div");
    betWrap.style.display = "flex";
    betWrap.style.alignItems = "center";
    betWrap.style.gap = "8px";

    var betLabel = document.createElement("span");
    betLabel.textContent = "Bet";
    betLabel.style.opacity = "0.85";
    betLabel.style.fontSize = "12px";

    betMinusNode = document.createElement("button");
    betMinusNode.type = "button";
    betMinusNode.textContent = "−";
    betMinusNode.onclick = () => adjustBet(-10);

    betValueNode = document.createElement("span");
    betValueNode.style.minWidth = "54px";
    betValueNode.style.textAlign = "center";
    betValueNode.style.fontWeight = "700";

    betPlusNode = document.createElement("button");
    betPlusNode.type = "button";
    betPlusNode.textContent = "+";
    betPlusNode.onclick = () => adjustBet(10);

    betWrap.appendChild(betLabel);
    betWrap.appendChild(betMinusNode);
    betWrap.appendChild(betValueNode);
    betWrap.appendChild(betPlusNode);

    var balWrap = document.createElement("div");
    balWrap.style.display = "flex";
    balWrap.style.alignItems = "center";
    balWrap.style.gap = "8px";
    var balLabel = document.createElement("span");
    balLabel.textContent = "Chips";
    balLabel.style.opacity = "0.85";
    balLabel.style.fontSize = "12px";
    balanceValueNode = document.createElement("span");
    balanceValueNode.style.fontWeight = "700";
    balWrap.appendChild(balLabel);
    balWrap.appendChild(balanceValueNode);

    left.appendChild(betWrap);
    left.appendChild(balWrap);

    center.appendChild(newDeckNode);

    var badges = document.createElement("div");
    badges.className = "gv-badges";

    var makeBadge = (labelText) => {
        var badge = document.createElement("div");
        badge.className = "gv-badge";
        var label = document.createElement("span");
        label.className = "gv-badge-label";
        label.textContent = labelText;
        var value = document.createElement("span");
        value.className = "gv-badge-value";
        badge.appendChild(label);
        badge.appendChild(value);
        return { badge, value };
    };

    var handsBadge = makeBadge("Hands");
    handsBadgeValueNode = handsBadge.value;
    badges.appendChild(handsBadge.badge);

    var wrBadge = makeBadge("WR");
    winRateBadgeValueNode = wrBadge.value;
    badges.appendChild(wrBadge.badge);

    var streakBadge = makeBadge("Streak");
    streakBadgeValueNode = streakBadge.value;
    badges.appendChild(streakBadge.badge);

    var dailyBadge = makeBadge("Daily");
    dailyBadgeValueNode = dailyBadge.value;
    badges.appendChild(dailyBadge.badge);

    right.appendChild(badges);

    toolbarNode.appendChild(left);
    toolbarNode.appendChild(center);
    toolbarNode.appendChild(right);

    if (dealerArea && dealerArea.parentNode) {
        dealerArea.parentNode.insertBefore(toolbarNode, dealerArea);
    } else {
        gameAreaNode.insertBefore(toolbarNode, gameAreaNode.firstChild);
    }
}

function setupActionButtons() {
    doubleDownNode = document.createElement("button");
    doubleDownNode.id = "double-down";
    doubleDownNode.type = "button";
    doubleDownNode.textContent = "Double Down";
    doubleDownNode.style.display = "none";
    doubleDownNode.onclick = () => {
        playClick();
        onDoubleDown();
    };

    splitNode = document.createElement("button");
    splitNode.id = "split-hand";
    splitNode.type = "button";
    splitNode.textContent = "Split";
    splitNode.style.display = "none";
    splitNode.onclick = () => {
        playClick();
        onSplit();
    };

    if (stayNode && stayNode.parentNode) {
        stayNode.parentNode.insertBefore(doubleDownNode, stayNode.nextSibling);
        stayNode.parentNode.insertBefore(splitNode, doubleDownNode.nextSibling);
    }
}

function updateHud() {
    ensureDaily();

    if (betValueNode) betValueNode.textContent = String(bet);
    if (balanceValueNode) balanceValueNode.textContent = String(balance);

    var total = Math.max(1, wins + losses + ties);
    var winRate = Math.round((wins / total) * 100);
    if (handsBadgeValueNode) handsBadgeValueNode.textContent = String(handsPlayed);
    if (winRateBadgeValueNode) winRateBadgeValueNode.textContent = `${winRate}%`;
    if (streakBadgeValueNode) streakBadgeValueNode.textContent = String(winStreak);
    if (dailyBadgeValueNode) dailyBadgeValueNode.textContent = `${dailyWins}/${dailyTarget}`;

    var canAdjust = !betLocked;
    if (betMinusNode) betMinusNode.disabled = !canAdjust;
    if (betPlusNode) betPlusNode.disabled = !canAdjust;
}

function adjustBet(delta) {
    if (betLocked) return;
    var next = bet + delta;
    if (next < 0) next = 0;
    if (next > balance) next = balance;
    bet = next;
    saveMeta();
    updateHud();
}

function flashOutcome(kind) {
    try {
        if (!gameAreaNode) gameAreaNode = document.getElementById("game-area");
        if (!gameAreaNode) return;
        var cls = kind === "win" ? "gv-win" : kind === "loss" ? "gv-loss" : "gv-tie";
        gameAreaNode.classList.remove("gv-win", "gv-loss", "gv-tie");
        gameAreaNode.classList.add(cls);
        setTimeout(() => {
            gameAreaNode && gameAreaNode.classList.remove(cls);
        }, 600);
    } catch { }
}

function vibrate(kind) {
    try {
        if (!navigator.vibrate) return;
        if (kind === "win") navigator.vibrate([20, 40, 20]);
        else if (kind === "loss") navigator.vibrate([60]);
        else navigator.vibrate([15, 25, 15]);
    } catch { }
}

function beep(freq, duration) {
    try {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        var ctx = new Ctx();
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        gain.gain.value = 0.04;
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        setTimeout(() => {
            try {
                osc.stop();
                ctx.close();
            } catch { }
        }, duration);
    } catch { }
}

function playClick() {
    beep(520, 40);
}

function playOutcomeSound(kind) {
    if (kind === "win") beep(880, 140);
    else if (kind === "loss") beep(220, 160);
    else beep(440, 120);
}

function renderDealerCards() {
    while (dealerCardsNode.firstChild) dealerCardsNode.removeChild(dealerCardsNode.firstChild);
    dealerCards.forEach((card, i) => {
        var img = document.createElement("img");
        if (i === 0 && hideDealerHoleCard) img.src = "./card.png";
        else img.src = card.image;
        dealerCardsNode.appendChild(img);
    });
}

function renderPlayerArea() {
    while (playerCardsNode.firstChild) playerCardsNode.removeChild(playerCardsNode.firstChild);
    if (!splitActive) {
        playerCards.forEach((card) => {
            var img = document.createElement("img");
            img.src = card.image;
            playerCardsNode.appendChild(img);
        });
        return;
    }

    var wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.gap = "12px";
    wrap.style.alignItems = "center";
    wrap.style.justifyContent = "center";
    wrap.style.width = "100%";

    playerHands.forEach((hand, idx) => {
        var handNode = document.createElement("div");
        handNode.className = "gv-hand";
        handNode.setAttribute("data-active", idx === currentHandIndex ? "true" : "false");
        hand.forEach((card) => {
            var img = document.createElement("img");
            img.src = card.image;
            handNode.appendChild(img);
        });
        wrap.appendChild(handNode);
    });

    playerCardsNode.appendChild(wrap);
}

function updateActionButtons() {
    var showDouble = false;
    var showSplit = false;

    if (!roundWon && !roundLost && !roundTied && betLocked) {
        if (!splitActive) {
            showDouble = playerCards.length === 2 && balance >= lockedBet;
            showSplit = playerCards.length === 2 && playerCards[0] && playerCards[1] && playerCards[0].value === playerCards[1].value && balance >= lockedBet;
        } else {
            var currentHand = playerHands[currentHandIndex] || [];
            showDouble =
                !handFinished[currentHandIndex] &&
                    currentHand.length === 2 &&
                    balance >= handBets[currentHandIndex] &&
                    !handDoubled[currentHandIndex];
            showSplit = false;
        }
    }

    if (doubleDownNode) doubleDownNode.style.display = showDouble ? "block" : "none";
    if (splitNode) splitNode.style.display = showSplit ? "block" : "none";
}

function lockBetForRound() {
    if (bet <= 0) return false;
    if (bet > balance) return false;
    betLocked = true;
    lockedBet = bet;
    balance -= lockedBet;
    saveMeta();
    updateHud();
    return true;
}

function unlockBet() {
    betLocked = false;
    lockedBet = 0;
    saveMeta();
    updateHud();
}

function recordHandOutcome(outcome) {
    ensureDaily();
    handsPlayed += 1;
    if (outcome === "win") {
        wins += 1;
        winStreak += 1;
        if (winStreak > bestStreak) bestStreak = winStreak;
        dailyWins += 1;
    } else if (outcome === "loss") {
        losses += 1;
        winStreak = 0;
    } else {
        ties += 1;
    }
}

function settleRound(outcome, reason) {
    if (roundSettled) return;
    roundSettled = true;

    roundWon = outcome === "win";
    roundLost = outcome === "loss";
    roundTied = outcome === "tie";

    saveMeta();
    updateHud();

    var kind = outcome;
    flashOutcome(kind);
    playOutcomeSound(kind);
    vibrate(kind);

    if (nextHandNode) nextHandNode.style.display = "block";
    if (hitMeNode) hitMeNode.style.display = "none";
    if (stayNode) stayNode.style.display = "none";
    if (doubleDownNode) doubleDownNode.style.display = "none";
    if (splitNode) splitNode.style.display = "none";

    unlockBet();
    updateActionButtons();
}

function getNewDeck() {
    /* This function needs to:
     1) Call the resetPlayingArea function
     2) Make a call to deckofcardsapi in order to retrieve a new deck_id
     3) Set the value of our state variable deckID to the retrieved deck_id
     4) Change the display property of style on the nextHandNode element in order
     to provide the player with the Next Hand button.
     5) Hide the hit-me and stay buttons by changing their style.display to "none"
     6) Catch any errors that may occur on the fetch and log them */
    resetPlayingArea();
    fetch(`https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=6`)
        .then(res => res.json())
        .then(res => {
            deckID = res.deck_id;
            nextHandNode.style.display = "block";
            hitMeNode.style.display = "none";
            stayNode.style.display = "none";
        })
        .catch(console.error)
}

function computeScore(cards) {
    // This function receives an array of cards and returns the total score.
    // ...
    let hasAce = false;
    let score = cards.reduce((acc, card) => {
        if (card.value === "ACE") {
            hasAce = true;
            return acc + 1
        }
        if (isNaN(card.value)) { return acc + 10 }
        return acc + Number(card.value);
    }, 0)
    if (hasAce) {
        score = (score + 10) > 21 ? score : score + 10;
    }
    return score
}

function newHand() {
    /* This function needs to:
     1) Call the resetPlayingArea function
     2) Make a call to deckofcardsapi using the deckID state variable in order
     to retrieve draw 4 cards from the deck.
     3) Once 4 cards have been drawn, push 2 of them to our dealerCards state
     array and 2 to our playerCards state array.
     4) Set our dealerScore state variable to "?" and then set the textContent
     value of the dealerScoreNode to dealerScore;
     5) ForEach card in playerCards and dealerCards, create an <img> element
     and assign the src of these to their respective card images. Don't forget to
     append these newly created <img> elements to the respective #dealer-cards and
     #player-cards DOM elements in order to have them show up in the html.
     6) Finally, compute the player's score by calling computeScore() and update
     the playerScoreNode to reflect this.
     7) If player score is 21, announce immediate victory by setting:
     roundWon = true;
     announcementNode.textContent = "BlackJack! You Win!";
     8) catch and log possible error from the fetch.
     */
    if (!deckID) {
        announcementNode.textContent = "Shuffle a new deck first.";
        return;
    }
    resetPlayingArea();
    if (!lockBetForRound()) {
        announcementNode.textContent = "Set a bet (and enough chips) before dealing.";
        return;
    }
    roundSettled = false;
    splitActive = false;
    playerHands = [];
    handBets = [];
    handDoubled = [];
    currentHandIndex = 0;
    hideDealerHoleCard = true;
    fetch(`https://deckofcardsapi.com/api/deck/${deckID}/draw/?count=4`)
        .then(res => res.json())
        .then(res => {
            nextHandNode.style.display = "none";
            hitMeNode.style.display = "block";
            stayNode.style.display = "block";

            dealerCards.push(res.cards[0], res.cards[1])
            playerCards.push(res.cards[2], res.cards[3])

            dealerScore = "?";
            dealerScoreNode.textContent = dealerScore;

            renderDealerCards();
            renderPlayerArea();

            playerScore = computeScore(playerCards);
            if (playerScore === 21) {
                hideDealerHoleCard = false;
                renderDealerCards();
                var payout = lockedBet * 2.5;
                balance += payout;
                announcementNode.textContent = "BlackJack! You Win!";
                recordHandOutcome("win");
                settleRound("win", "blackjack");
            }
            playerScoreNode.textContent = playerScore;
            updateActionButtons();

        })
        .catch(console.error)

}

dealerCards.forEach((card, i) => {
    let cardDomElement = document.createElement("img");
    if(i===0) {
        cardDomElement.src = './card.png';
    } else {
        cardDomElement.src = card.image;
    }
    dealerCardsNode.appendChild(cardDomElement)
})

function resetPlayingArea() {
    /* This function needs to:
     1) Reset all state variables to their defaults
     2) Reset the gameplay UI by updating textContent of all Nodes which may
     be displaying data from a previous round in the game. (ex: dealerScoreNode)
     3) Remove all <img> elements inside dealerCardsNode and playerCardsNode.
     */
    dealerCards = [];
    playerCards = [];
    roundLost = false;
    roundWon = false;
    roundTied = false;
    dealerScore = "";
    playerScore = 0;
    betLocked = false;
    lockedBet = 0;
    splitActive = false;
    playerHands = [];
    handBets = [];
    handDoubled = [];
    currentHandIndex = 0;
    handFinished = [];
    roundSettled = false;
    hideDealerHoleCard = true;
    dealerScoreNode.textContent = dealerScore;
    announcementNode.textContent = "";
    while (dealerCardsNode.firstChild) {
        dealerCardsNode.removeChild(dealerCardsNode.firstChild);
    }
    while (playerCardsNode.firstChild) {
        playerCardsNode.removeChild(playerCardsNode.firstChild);
    }
    updateHud();
    updateActionButtons();
}


function hitMe(target) {
    /* This function needs to:
     1) If any of roundLost or roundWon or roundTied is true, return immediately.
     2) Using the same deckID, fetch to draw 1 card
     3) Depending on wether target is 'player' or 'dealer', push the card to the
     appropriate state array (playerCards or dealerCards).
     4) Create an <img> and set it's src to the card image and append it to the
     appropriate DOM element for it to appear on the game play UI.
     5) If target === 'player', compute score and immediately announce loss if
     score > 21 by setting:
     roundLost = true;
     and updating announcementNode to display a message delivering the bad news.
     6) If target === 'dealer', just call the dealerPlays() function immediately
     after having appended the <img> to the game play UI.
     7) Catch error and log....
     */
    if (roundLost || roundWon || roundTied) { return }
    if (!betLocked) { return }
    fetch(`https://deckofcardsapi.com/api/deck/${deckID}/draw/?count=1`)
        .then(res => res.json())
        .then(res => {

            // If player
            if (target === 'player') {
                if (!splitActive) {
                    playerCards.push(res.cards[0])
                    renderPlayerArea();
                    playerScore = computeScore(playerCards);
                    playerScoreNode.textContent = playerScore;
                    if (playerScore > 21) {
                        announcementNode.textContent = "You broke. Pay up.";
                        recordHandOutcome("loss");
                        settleRound("loss", "bust");
                    }
                    updateActionButtons();
                    return;
                }

                var hand = playerHands[currentHandIndex];
                hand.push(res.cards[0]);
                renderPlayerArea();
                var score = computeScore(hand);
                playerScoreNode.textContent = splitScoreText();
                if (score > 21) {
                    announcementNode.textContent = `Hand ${currentHandIndex + 1} bust.`;
                    handFinished[currentHandIndex] = true;
                    advanceHandAfterAction();
                }
                updateActionButtons();
            }

            // If dealer
            if (target === 'dealer') {
                dealerCards.push(res.cards[0])
                renderDealerCards();
                dealerPlays();
            }
        })
        .catch(console.error);
}

function dealerPlays() {
    /* This function needs to:
     1) If any of roundLost or roundWon or roundTied is true, return immediately.
     2) Compute the dealer's score by calling the computeScore() function and
     update the UI to reflect this.
     */
    if (roundLost || roundWon || roundTied) { return }
    if (!betLocked) { return }
    hideDealerHoleCard = false;
    dealerScore = computeScore(dealerCards);
    dealerScoreNode.textContent = dealerScore;
    renderDealerCards();

    if (dealerScore < 17) {
        // a delay here makes for nicer game play because of suspence.
        setTimeout(()=>hitMe('dealer'), 900)
    }
    else {
        if (!splitActive) {
            var result = settleSingleHand(lockedBet, playerScore, false);
            recordHandOutcome(result.outcome);
            settleRound(result.outcome, "dealer_done");
            return;
        }
        var splitResult = settleSplitHands();
        splitResult.outcomes.forEach((o) => recordHandOutcome(o));
        var overall = overallOutcomeFromHands(splitResult.outcomes);
        settleRound(overall, "dealer_done");
    }

}

function splitScoreText() {
    if (!splitActive) return String(playerScore);
    var a = computeScore(playerHands[0] || []);
    var b = computeScore(playerHands[1] || []);
    return `H1 ${a} • H2 ${b}`;
}

function settleSingleHand(handBet, score, isBlackjack) {
    if (score > 21) return { net: -handBet, outcome: "loss" };
    if (dealerScore > 21) {
        var payout = handBet * 2;
        balance += payout;
        announcementNode.textContent = isBlackjack ? "BlackJack! You Win!" : "Dealer bust. You Win!";
        return { net: payout - handBet, outcome: "win" };
    }
    if (score > dealerScore) {
        var payoutW = handBet * 2;
        balance += payoutW;
        announcementNode.textContent = "You Won the hand!";
        return { net: payoutW - handBet, outcome: "win" };
    }
    if (score === dealerScore) {
        balance += handBet;
        announcementNode.textContent = "Tie round.";
        return { net: 0, outcome: "tie" };
    }
    announcementNode.textContent = "Sorry, You Lost the hand...";
    return { net: -handBet, outcome: "loss" };
}

function settleSplitHands() {
    var net = 0;
    var parts = [];
    var outcomes = [];
    for (var i = 0; i < 2; i++) {
        var hand = playerHands[i] || [];
        var score = computeScore(hand);
        var handBet = handBets[i] || lockedBet;
        if (score > 21) {
            net -= handBet;
            parts.push(`H${i + 1} bust`);
            outcomes.push("loss");
            continue;
        }
        if (dealerScore > 21) {
            var payout = handBet * 2;
            balance += payout;
            net += payout - handBet;
            parts.push(`H${i + 1} win`);
            outcomes.push("win");
            continue;
        }
        if (score > dealerScore) {
            var payoutW = handBet * 2;
            balance += payoutW;
            net += payoutW - handBet;
            parts.push(`H${i + 1} win`);
            outcomes.push("win");
            continue;
        }
        if (score === dealerScore) {
            balance += handBet;
            parts.push(`H${i + 1} push`);
            outcomes.push("tie");
            continue;
        }
        net -= handBet;
        parts.push(`H${i + 1} loss`);
        outcomes.push("loss");
    }
    announcementNode.textContent = parts.join(" • ");
    return { net, outcomes };
}

function overallOutcomeFromHands(outcomes) {
    var hasWin = outcomes.includes("win");
    var hasLoss = outcomes.includes("loss");
    if (hasWin && !hasLoss) return "win";
    if (hasLoss && !hasWin) return "loss";
    return "tie";
}

function onStay() {
    if (roundLost || roundWon || roundTied) return;
    if (!betLocked) return;
    if (!splitActive) {
        setTimeout(() => dealerPlays(), 600);
        return;
    }
    announcementNode.textContent = `Hand ${currentHandIndex + 1} stand.`;
    handFinished[currentHandIndex] = true;
    advanceHandAfterAction();
}

function advanceHandAfterAction() {
    if (!splitActive) return;
    if (!handFinished[0]) currentHandIndex = 0;
    else if (!handFinished[1]) currentHandIndex = 1;
    var bothBust = computeScore(playerHands[0] || []) > 21 && computeScore(playerHands[1] || []) > 21;
    if (bothBust) {
        recordHandOutcome("loss");
        recordHandOutcome("loss");
        settleRound("loss", "split_bust");
        return;
    }
    if (!handFinished[0] || !handFinished[1]) {
        playerScoreNode.textContent = splitScoreText();
        renderPlayerArea();
        updateActionButtons();
        announcementNode.textContent = `Playing Hand ${currentHandIndex + 1}`;
        return;
    }
    setTimeout(() => dealerPlays(), 600);
}

function onDoubleDown() {
    if (roundLost || roundWon || roundTied) return;
    if (!betLocked) return;
    if (!splitActive) {
        if (playerCards.length !== 2) return;
        if (balance < lockedBet) return;
        balance -= lockedBet;
        lockedBet = lockedBet * 2;
        saveMeta();
        updateHud();
        hitMe("player");
        if (!roundLost && !roundWon && !roundTied) setTimeout(() => dealerPlays(), 450);
        updateActionButtons();
        return;
    }
    var currentHand = playerHands[currentHandIndex] || [];
    if (currentHand.length !== 2) return;
    if (balance < (handBets[currentHandIndex] || 0)) return;
    if (handDoubled[currentHandIndex]) return;
    balance -= handBets[currentHandIndex];
    handBets[currentHandIndex] = handBets[currentHandIndex] * 2;
    handDoubled[currentHandIndex] = true;
    saveMeta();
    updateHud();
    fetch(`https://deckofcardsapi.com/api/deck/${deckID}/draw/?count=1`)
        .then(res => res.json())
        .then(res => {
            currentHand.push(res.cards[0]);
            renderPlayerArea();
            playerScoreNode.textContent = splitScoreText();
            handFinished[currentHandIndex] = true;
            advanceHandAfterAction();
        })
        .catch(console.error);
}

function onSplit() {
    if (roundLost || roundWon || roundTied) return;
    if (!betLocked) return;
    if (playerCards.length !== 2) return;
    if (!playerCards[0] || !playerCards[1]) return;
    if (playerCards[0].value !== playerCards[1].value) return;
    if (balance < lockedBet) return;

    balance -= lockedBet;
    splitActive = true;
    playerHands = [[playerCards[0]], [playerCards[1]]];
    handBets = [lockedBet, lockedBet];
    handDoubled = [false, false];
    handFinished = [false, false];
    currentHandIndex = 0;
    saveMeta();
    updateHud();

    fetch(`https://deckofcardsapi.com/api/deck/${deckID}/draw/?count=2`)
        .then(res => res.json())
        .then(res => {
            playerHands[0].push(res.cards[0]);
            playerHands[1].push(res.cards[1]);
            playerScoreNode.textContent = splitScoreText();
            renderPlayerArea();
            announcementNode.textContent = "Playing Hand 1";
            updateActionButtons();
        })
        .catch(console.error);
}
