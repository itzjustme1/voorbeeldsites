// Opening hours as listed on Google Maps (7 Nov 2026). Minutes since midnight, keyed by weekday (0 = Sunday).
var HOURS = { 1: [780, 1050], 2: [600, 1050], 3: [600, 1050], 4: [600, 1050], 5: [600, 1050] };
var DAYS = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];

function fmt(min) {
  return Math.floor(min / 60) + ":" + String(min % 60).padStart(2, "0");
}

// The shop is in Waddinxveen, so "now" is Dutch time, whatever the visitor's clock says.
function nowInNL() {
  var parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date());
  var get = function (t) { return parts.find(function (p) { return p.type === t; }).value; };
  var day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day: day, min: parseInt(get("hour"), 10) * 60 + parseInt(get("minute"), 10) };
}

function openStatus() {
  var now = nowInNL();
  var today = HOURS[now.day];
  if (today && now.min >= today[0] && now.min < today[1]) {
    return { open: true, day: now.day, text: "Nu open, tot " + fmt(today[1]) + " uur" };
  }
  // Find the next opening moment: later today, or the first day after that has hours.
  if (today && now.min < today[0]) {
    return { open: false, day: now.day, text: "Nu gesloten, vandaag open vanaf " + fmt(today[0]) + " uur" };
  }
  for (var i = 1; i <= 7; i++) {
    var d = (now.day + i) % 7;
    if (HOURS[d]) {
      var when = i === 1 ? "morgen" : DAYS[d];
      return { open: false, day: now.day, text: "Nu gesloten, " + when + " weer open vanaf " + fmt(HOURS[d][0]) + " uur" };
    }
  }
}

// "shop" rather than "status": a global named status would collide with window.status.
var shop = openStatus();
document.querySelectorAll("[data-status], [data-status-line]").forEach(function (el) {
  el.textContent = shop.text;
  el.classList.toggle("is-open", shop.open);
  el.hidden = false;
});
var row = document.querySelector('.week [data-day="' + shop.day + '"]');
if (row) { row.classList.add("is-today"); row.setAttribute("aria-current", "date"); }

// Mobile menu
var menuBtn = document.querySelector(".menu-btn");
var nav = document.getElementById("nav");
function setMenu(open) {
  nav.classList.toggle("is-open", open);
  menuBtn.setAttribute("aria-expanded", String(open));
  menuBtn.textContent = open ? "Sluit" : "Menu";
  // Lock the page behind the full-height menu so it can't scroll underneath.
  document.documentElement.style.overflow = open ? "hidden" : "";
}
menuBtn.addEventListener("click", function () { setMenu(!nav.classList.contains("is-open")); });
nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && nav.classList.contains("is-open")) { setMenu(false); menuBtn.focus(); }
});

// Palette picker, only for previewing colours: shown when the URL contains ?kleuren.
var PALETTES = [
  { id: "huisstijl", name: "Huisstijl", swatch: "#ffe500" },
  { id: "magenta", name: "Magenta", swatch: "#e4007c" },
  { id: "cyaan", name: "Cyaan", swatch: "#00a3e0" },
  { id: "geel", name: "Geel", swatch: "#ffd500" },
  { id: "oranje", name: "Oranje", swatch: "#ff5b14" },
  { id: "kobalt", name: "Kobalt", swatch: "#2b44ff" }
];
var params = new URLSearchParams(location.search);
if (params.has("kleuren")) {
  var picker = document.createElement("div");
  picker.className = "picker";
  picker.setAttribute("role", "group");
  picker.setAttribute("aria-label", "Kies een kleur");
  var current = document.documentElement.getAttribute("data-kleur");
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  PALETTES.forEach(function (p) {
    var b = document.createElement("button");
    b.type = "button";
    var label = document.createElement("span");
    label.textContent = p.name;
    b.appendChild(label);
    b.setAttribute("aria-label", p.name);
    b.style.setProperty("--swatch", p.swatch);
    b.setAttribute("aria-pressed", String(p.id === current));
    b.addEventListener("click", function () {
      document.documentElement.setAttribute("data-kleur", p.id);
      try { localStorage.setItem("inkstation-kleur-v2", p.id); } catch (e) {}
      if (themeMeta) themeMeta.setAttribute("content", p.swatch);
      picker.querySelectorAll("button").forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
    });
    picker.appendChild(b);
  });
  document.body.appendChild(picker);
}
