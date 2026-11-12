/*
 * Absolutely Everything — a mod for Sandboxels
 *
 *  Everything tab  Every element in the game in one searchable palette.
 *                  Hidden, locked and mod-added elements are included.
 *                  Your settings and saves are never changed; remove the mod
 *                  and the game goes back to exactly how it was.
 *  Silly tab       Eleven daft new elements, plus one small quack.
 *
 * Built for touch: nothing needs a keyboard.
 */
(function () {
"use strict";

if (window.__absolutelyEverything) return;
window.__absolutelyEverything = true;

// If this mod is added after the game has finished loading, elements go in
// through the game's own addElement() instead of being queued for startup.
var gameReady = !!document.getElementById("elementCountSpan");

var SPECTRUM = ["#ff4d6d", "#ffb703", "#3ddc97", "#38bdf8", "#a78bfa"];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

// h: 0-360, s and l: 0-100. Returns an "rgb(r,g,b)" string, which is the
// colour format the game's own animated elements use.
function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s /= 100;
  l /= 100;
  var a = s * Math.min(l, 1 - l);
  function f(n) {
    var k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))));
  }
  return "rgb(" + f(0) + "," + f(8) + "," + f(4) + ")";
}

// Flash white for one tick, then go back to the pixel's own colour.
function sparkle(pixel) {
  if (pixel.sp) {
    pixel.color = pixel.sp;
    pixel.sp = 0;
  } else if (Math.random() < 0.012) {
    pixel.sp = pixel.color;
    pixel.color = "rgb(255,255,255)";
  }
}

// Whatever the game's own Random element is allowed to pick.
function chaosPool() {
  if (typeof randomChoices !== "undefined" && randomChoices && randomChoices.length) {
    return randomChoices;
  }
  return Object.keys(elements).filter(function (k) {
    var e = elements[k];
    return k !== "unknown" && !e.excludeRandom && !e.tool &&
      e.category !== "tools" && e.category !== "edit";
  });
}

/* ------------------------------------------------------------------ */
/* Silly elements                                                      */
/* ------------------------------------------------------------------ */

var silly = {};

silly.rainbow_goo = {
  color: SPECTRUM,
  buttonColor: SPECTRUM,
  behavior: behaviors.LIQUID,
  viscosity: 1200,
  tick: function (pixel) {
    pixel.color = hsl(pixelTicks * 3 + pixel.x * 4 + pixel.y * 2, 85, 58);
  },
  onPlace: behaviors.DO_TICK,
  category: "silly",
  state: "liquid",
  density: 1100,
  desc: "Thick goo that cycles through every colour. Unicorn dust makes it out of plain water."
};

silly.disco_floor = {
  color: SPECTRUM,
  buttonColor: SPECTRUM,
  behavior: behaviors.WALL,
  tick: function (pixel) {
    var checker = (pixel.x + pixel.y) & 1;
    pixel.color = hsl(pixelTicks * 4 + (pixel.x + pixel.y) * 6, 90, checker ? 48 : 60);
  },
  onPlace: behaviors.DO_TICK,
  category: "silly",
  state: "solid",
  density: 3000,
  breakInto: ["glitter", "glitter", "confetti"],
  desc: "A dance floor with a rolling rainbow. Smash it for glitter."
};

silly.unicorn_dust = {
  color: ["#ffd6f2", "#e5d4ff", "#d4f1ff", "#fff3c4", "#ffc2e8"],
  buttonColor: ["#ffc2e8", "#d4f1ff", "#fff3c4"],
  behavior: behaviors.POWDER,
  tick: sparkle,
  reactions: {
    "water": { elem1: null, elem2: "rainbow_goo" },
    "sand": { elem2: "color_sand", chance: 0.1 },
    "fire": { elem1: "confetti", chance: 0.2 }
  },
  category: "silly",
  state: "solid",
  density: 300,
  desc: "Sparkling powder. Turns water into rainbow goo and sand into colour sand."
};

silly.cotton_candy = {
  color: ["#ffb3d9", "#ffc8e6", "#b8e0ff", "#d9f0ff", "#fff0f7"],
  buttonColor: ["#ffb3d9", "#b8e0ff"],
  behavior: behaviors.POWDER,
  reactions: {
    "water": { elem1: null, elem2: "sugar_water", chance: 0.4 }
  },
  tempHigh: 120,
  stateHigh: "caramel",
  category: "silly",
  state: "solid",
  density: 120,
  desc: "Fluffy and light. Floats on water until it dissolves into sugar water."
};

silly.quack = {
  color: ["#fff6bf", "#ffffff"],
  behavior: [
    "M2%30|M1%50|M2%30",
    "XX|XX|XX",
    "XX|XX|XX"
  ],
  tick: function (pixel) {
    pixel.age = (pixel.age || 0) + 1;
    if (pixel.age > 18) deletePixel(pixel.x, pixel.y);
  },
  category: "silly",
  state: "gas",
  density: 0.1,
  ignoreAir: true,
  desc: "A small puff of sound from a rubber duck."
};

silly.rubber_duck = {
  color: ["#ffd60a", "#ffd60a", "#ffe14d", "#ffd60a", "#ff9f0a"],
  buttonColor: "#ffd60a",
  behavior: behaviors.POWDER,
  tick: function (pixel) {
    // In Sandboxels a light solid never rises through a liquid by itself, so a
    // duck drawn underwater would sit on the bottom. Let it bob back up.
    var above = !outOfBounds(pixel.x, pixel.y - 1) && pixelMap[pixel.x][pixel.y - 1];
    if (above) {
      var info = elements[above.element];
      if (info && info.state === "liquid" && info.density > elements.rubber_duck.density && Math.random() < 0.4) {
        swapPixels(pixel, above);
      }
    }
    if (Math.random() < 0.002 && isEmpty(pixel.x, pixel.y - 1)) {
      createPixel("quack", pixel.x, pixel.y - 1);
    }
  },
  tempHigh: 180,
  stateHigh: "molten_plastic",
  category: "silly",
  state: "solid",
  density: 380,
  desc: "Floats on anything wet. Quacks now and then."
};

silly.cheese_cloud = {
  color: "#ffe08a",
  behavior: [
    "XX|XX|XX",
    "XX|CH:cheese%0.05|M1%2.5 AND BO",
    "XX|XX|XX"
  ],
  category: "silly",
  state: "gas",
  density: 0.5,
  ignoreAir: true,
  breakInto: "cheese",
  desc: "A drifting cloud that rains cheese."
};

silly.bubble_gum = {
  color: ["#ff7eb6", "#ff8fc2", "#ff6fa8"],
  behavior: behaviors.LIQUID,
  viscosity: 8000,
  tick: function (pixel) {
    if (Math.random() < 0.0015 && isEmpty(pixel.x, pixel.y - 1)) {
      createPixel("bubble", pixel.x, pixel.y - 1);
    }
  },
  category: "silly",
  state: "liquid",
  density: 1250,
  desc: "Very sticky pink goo that blows the occasional bubble."
};

silly.glitter_bomb = {
  color: ["#d946ef", "#a78bfa", "#38bdf8", "#fde047"],
  buttonColor: ["#d946ef", "#38bdf8", "#fde047"],
  behavior: [
    "XX|EX:12>glitter,confetti,confetti,flash|XX",
    "XX|XX|XX",
    "M2|M1 AND EX:12>glitter,confetti,confetti,flash|M2"
  ],
  tick: sparkle,
  category: "silly",
  state: "solid",
  density: 1300,
  excludeRandom: true,
  cooldown: defaultCooldown,
  desc: "Lands, then bursts into glitter and confetti."
};

silly.lost_sock = {
  color: ["#e5484d", "#f5f5f5", "#e5484d", "#f5f5f5", "#3b82f6"],
  buttonColor: ["#e5484d", "#f5f5f5", "#3b82f6"],
  behavior: behaviors.POWDER,
  tick: function (pixel) {
    if (Math.random() < 0.0015) deletePixel(pixel.x, pixel.y);
  },
  burn: 60,
  burnTime: 120,
  burnInto: ["smoke", "ash"],
  category: "silly",
  state: "solid",
  density: 450,
  desc: "Pile them up. They won't all be there later."
};

silly.chaos_cloud = {
  color: ["#b9a7ff", "#9fd3ff", "#ffa7d6"],
  buttonColor: ["#b9a7ff", "#9fd3ff", "#ffa7d6"],
  behavior: [
    "XX|XX|XX",
    "XX|XX|M1%2.5 AND BO",
    "XX|XX|XX"
  ],
  tick: function (pixel) {
    pixel.color = hsl(pixelTicks * 2 + pixel.x * 3, 55, 68);
    if (Math.random() < 0.0006) {
      var pool = chaosPool();
      var pick = pool[Math.floor(Math.random() * pool.length)];
      if (pick) changePixel(pixel, pick);
    }
  },
  onPlace: behaviors.DO_TICK,
  category: "silly",
  state: "gas",
  density: 0.5,
  ignoreAir: true,
  excludeRandom: true,
  desc: "Rains a random element, any element the Random tool could pick. Stand back."
};

silly.mood_ring = {
  color: ["#3b82f6", "#31c48d", "#facc15", "#fb7185"],
  buttonColor: ["#3b82f6", "#31c48d", "#facc15", "#fb7185"],
  behavior: behaviors.WALL,
  tick: function (pixel) {
    var t = Math.max(-100, Math.min(400, pixel.temp));
    var target = 270 - ((t + 100) / 500) * 270;
    pixel.mh = pixel.mh === undefined ? target : pixel.mh + (target - pixel.mh) * 0.15;
    pixel.color = hsl(pixel.mh, 78, 52);
  },
  onPlace: behaviors.DO_TICK,
  category: "silly",
  state: "solid",
  density: 3000,
  desc: "Shows its mood through its temperature: blue when chilly, green when warm, red when scorching. Try the heat and cool tools."
};

function register(name, def) {
  if (elements[name]) return; // never overwrite an element that already exists
  if (gameReady && typeof addElement === "function") addElement(name, def);
  else elements[name] = def;
}

["rainbow_goo", "disco_floor", "unicorn_dust", "cotton_candy", "quack", "rubber_duck",
 "cheese_cloud", "bubble_gum", "glitter_bomb", "lost_sock", "chaos_cloud", "mood_ring"
].forEach(function (name) { register(name, silly[name]); });

/* ------------------------------------------------------------------ */
/* Everything tab                                                      */
/* ------------------------------------------------------------------ */

var CSS = [
  "#categoryButton-everything{position:relative}",
  "#categoryButton-everything::after{content:'';position:absolute;left:0;right:0;bottom:-2px;height:3px;",
  "background:linear-gradient(90deg," + SPECTRUM.join(",") + ");pointer-events:none}",

  "#category-everything{flex-direction:column;flex-wrap:nowrap;justify-content:flex-start;text-align:left}",
  "#category-everything .ap-bar,#category-everything .ap-head,#category-everything .ap-empty{",
  "font-family:ui-rounded,'SF Pro Rounded',system-ui,sans-serif}",
  "#category-everything .ap-bar{display:flex;gap:8px;align-items:center;padding:4px 2px 8px}",

  "#category-everything .ap-search{flex:1 1 auto;min-width:0;box-sizing:border-box;font:inherit;font-size:16px;",
  "line-height:1.2;color:#fff;background:var(--theme-darkest);border:2px solid var(--theme-opac50);",
  "border-radius:999px;padding:9px 16px;outline:none;-webkit-appearance:none;appearance:none}",
  "#category-everything .ap-search::placeholder{color:rgba(255,255,255,.5)}",
  "#category-everything .ap-search:focus{border-color:#38bdf8;box-shadow:0 0 0 3px rgba(56,189,248,.28)}",

  "#category-everything .ap-dice{flex:none;padding:9px 16px;border:2px solid var(--theme-opac50);",
  "border-radius:999px;background:var(--theme-darker);text-shadow:none;font:inherit;font-weight:600}",
  "#category-everything button:focus-visible{outline:2px solid #38bdf8;outline-offset:2px}",

  "#category-everything .ap-scroll{max-height:min(46vh,440px);overflow-y:auto;overscroll-behavior:contain;",
  "-webkit-overflow-scrolling:touch;scrollbar-width:thin}",
  "#category-everything .ap-section{margin-bottom:12px}",
  "#category-everything .ap-head{display:flex;justify-content:space-between;align-items:baseline;",
  "padding:0 4px 4px;font-size:1.05em;font-weight:700}",
  "#category-everything .ap-count{font-weight:500;font-size:.85em;opacity:.6;font-variant-numeric:tabular-nums}",
  "#category-everything .ap-chips{height:5px;margin:0 4px 7px;border-radius:3px}",
  "#category-everything .ap-grid{display:flex;flex-wrap:wrap;justify-content:space-evenly}",
  "#category-everything .ap-grid::after{content:'';flex-grow:20}",
  "#category-everything .ap-empty{padding:18px 8px;text-align:center;opacity:.75}",
  "#category-everything .ap-sr{position:absolute;width:1px;height:1px;overflow:hidden;",
  "clip:rect(0 0 0 0);white-space:nowrap}"
].join("");

function node(tag, cls, text) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function titleFor(cat) {
  var raw = (typeof lang !== "undefined" && lang && lang[cat]) || cat;
  raw = String(raw).replace(/_/g, " ");
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

// A strip of hard-edged colour chips sampled from a category: a quick preview
// of what's inside, readable while scrolling a long list.
function chipGradient(list) {
  var n = Math.min(14, list.length);
  var cols = [];
  for (var i = 0; i < n; i++) {
    var co = elements[list[Math.floor((i * list.length) / n)]].colorObject;
    if (Array.isArray(co)) co = co[Math.floor(co.length / 2)];
    cols.push(co && co.r !== undefined ? "rgb(" + co.r + "," + co.g + "," + co.b + ")" : "#888");
  }
  var step = 100 / cols.length;
  return "linear-gradient(90deg," + cols.map(function (c, i) {
    return c + " " + (i * step).toFixed(2) + "% " + ((i + 1) * step).toFixed(2) + "%";
  }).join(",") + ")";
}

// The game hides some elements and shows no button for them. Give them one.
// Nothing here touches the game's settings or saved progress.
function revealHiddenElements(names) {
  names.forEach(function (name) {
    var info = elements[name];
    try {
      if (info.locked === true) info.locked = false;
      if (!document.getElementById("elementButton-" + name)) {
        info.hidden = false;
        createElementButton(name);
      }
      var btn = document.getElementById("elementButton-" + name);
      if (btn) btn.classList.remove("disabled");
    } catch (e) {
      console.warn("[Absolutely Everything] could not add " + name, e);
    }
  });
  try {
    window.hiddenCount = 0;
    var span = document.getElementById("elementCountSpan");
    if (span && typeof langKey === "function") {
      span.innerText = langKey("guitemplate.elementCount", "$1 elements, with $2 hidden",
        { 1: window.elementCount, 2: 0 });
    }
  } catch (e) { /* the footer count is cosmetic */ }
}

function buildEverything() {
  if (document.getElementById("category-everything")) return;

  var names = Object.keys(elements).filter(function (n) { return n !== "unknown"; });
  revealHiddenElements(names);

  var style = document.createElement("style");
  style.id = "ap-style";
  style.textContent = CSS;
  document.head.appendChild(style);

  createCategoryDiv("everything");
  var tab = document.getElementById("categoryButton-everything");
  var panel = document.getElementById("category-everything");
  var tabs = document.getElementById("categoryControls");
  tab.textContent = "Everything";
  tabs.insertBefore(tab, tabs.firstChild);
  panel.style.display = "none";

  // Group by category, in the same order as the game's own tabs.
  var order = [];
  Array.prototype.forEach.call(tabs.children, function (b) {
    var c = b.getAttribute("category");
    if (c && c !== "everything") order.push(c);
  });
  var byCat = {};
  names.forEach(function (name) {
    if (!document.getElementById("elementButton-" + name)) return;
    var cat = elements[name].category || "other";
    if (!byCat[cat]) { byCat[cat] = []; if (order.indexOf(cat) === -1) order.push(cat); }
    byCat[cat].push(name);
  });

  var sections = [];
  var cloneByName = {};
  var total = 0;
  var scroll = node("div", "ap-scroll");
  var empty = node("div", "ap-empty");
  empty.style.display = "none";

  order.forEach(function (cat) {
    var list = byCat[cat];
    if (!list) return;
    var box = node("section", "ap-section");
    var head = node("div", "ap-head");
    head.appendChild(node("span", "ap-title", titleFor(cat)));
    var count = node("span", "ap-count", String(list.length));
    head.appendChild(count);
    var chips = node("div", "ap-chips");
    chips.style.backgroundImage = chipGradient(list);
    var grid = node("div", "ap-grid");
    var items = [];

    list.forEach(function (name) {
      var orig = document.getElementById("elementButton-" + name);
      var btn = orig.cloneNode(true);
      btn.removeAttribute("id");
      btn.classList.remove("notify", "disabled");
      btn.onclick = orig.onclick;
      btn.oncontextmenu = orig.oncontextmenu;
      btn.onkeyup = function (e) { e.preventDefault(); };
      grid.appendChild(btn);
      cloneByName[name] = btn;

      var info = elements[name];
      var alias = info.alias ? (Array.isArray(info.alias) ? info.alias.join(" ") : String(info.alias)) : "";
      var hay = (name + " " + name.replace(/_/g, " ") + " " + (info.name || "") + " " + alias + " " + cat).toLowerCase();
      items.push({ name: name, btn: btn, hay: hay });
      total++;
    });

    box.appendChild(head);
    box.appendChild(chips);
    box.appendChild(grid);
    scroll.appendChild(box);
    sections.push({ box: box, count: count, items: items });
  });
  scroll.appendChild(empty);

  // Search bar
  var bar = node("div", "ap-bar");
  var input = node("input", "ap-search");
  input.type = "search";
  input.placeholder = "Search " + total + " elements";
  input.setAttribute("aria-label", "Search all elements");
  input.setAttribute("autocomplete", "off");
  input.setAttribute("autocapitalize", "off");
  input.setAttribute("autocorrect", "off");
  input.setAttribute("enterkeyhint", "go");
  input.spellcheck = false;
  var dice = node("button", "ap-dice", "Random");
  dice.type = "button";
  var status = node("div", "ap-sr");
  status.setAttribute("aria-live", "polite");
  bar.appendChild(input);
  bar.appendChild(dice);

  // The game listens for shortcuts on the whole page (R resets, P pauses...).
  // Keep typing in the search box to itself.
  ["keydown", "keyup", "keypress"].forEach(function (type) {
    input.addEventListener(type, function (e) { e.stopPropagation(); });
  });

  function applyFilter() {
    var terms = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    var visible = 0;
    sections.forEach(function (s) {
      var shown = 0;
      s.items.forEach(function (it) {
        var ok = terms.every(function (t) { return it.hay.indexOf(t) !== -1; });
        it.btn.style.display = ok ? "" : "none";
        if (ok) shown++;
      });
      s.box.style.display = shown ? "" : "none";
      s.count.textContent = terms.length ? shown + " of " + s.items.length : String(s.items.length);
      visible += shown;
    });
    empty.style.display = visible ? "none" : "";
    empty.textContent = visible ? "" : "No element matches \u201C" + input.value.trim() + "\u201D. Try fewer letters.";
    status.textContent = terms.length ? visible + " of " + total + " elements" : "";
  }

  function pick(name) {
    input.blur();
    selectElement(name);
    if (typeof focusGame === "function") focusGame();
  }

  input.addEventListener("input", applyFilter);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      for (var s = 0; s < sections.length; s++) {
        for (var i = 0; i < sections[s].items.length; i++) {
          var it = sections[s].items[i];
          if (it.btn.style.display !== "none") { pick(it.name); return; }
        }
      }
    } else if (e.key === "Escape") {
      input.value = "";
      applyFilter();
      input.blur();
    }
  });

  dice.addEventListener("click", function () {
    var source = (typeof randomChoices !== "undefined" && randomChoices && randomChoices.length)
      ? randomChoices : Object.keys(cloneByName);
    var pool = source.filter(function (n) { return cloneByName[n]; });
    var name = pool[Math.floor(Math.random() * pool.length)];
    if (!name) return;
    if (input.value) { input.value = ""; applyFilter(); }
    selectElement(name);
    cloneByName[name].scrollIntoView({ block: "nearest", inline: "nearest" });
  });

  // Keep the highlight on the copies in step with the game's own buttons.
  new MutationObserver(function (records) {
    records.forEach(function (r) {
      var id = r.target.id;
      if (!id || id.indexOf("elementButton-") !== 0) return;
      var clone = cloneByName[id.slice(14)];
      if (!clone) return;
      var v = r.target.getAttribute(r.attributeName);
      if (v === null) clone.removeAttribute(r.attributeName);
      else clone.setAttribute(r.attributeName, v);
    });
  }).observe(document.getElementById("controls") || document.getElementById("elementControls"), {
    subtree: true,
    attributes: true,
    attributeFilter: ["current", "modified"]
  });

  panel.appendChild(bar);
  panel.appendChild(status);
  panel.appendChild(scroll);
}

// Buttons are built after runAfterLoad callbacks run, so wait for them.
function whenReady(fn, tries) {
  tries = tries || 0;
  var tabs = document.getElementById("categoryControls");
  if (tabs && tabs.children.length && document.getElementById("elementCountSpan")) {
    fn();
  } else if (tries < 200) {
    setTimeout(function () { whenReady(fn, tries + 1); }, 50);
  }
}

function start() {
  try { whenReady(buildEverything); }
  catch (e) { console.error("[Absolutely Everything]", e); }
}

if (gameReady) start();
else runAfterLoad(function () { setTimeout(start, 0); });

})();
