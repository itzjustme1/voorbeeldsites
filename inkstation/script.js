// Opening hours, holiday closures and the current offer come from content/winkel.json, which Rens edits on /admin/.
// The HTML already contains the regular hours and the 20-year offer, so the page reads fine before (or without) the fetch.
var DAYS = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
var MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
var info = {
  openingstijden: {
    maandag: { open: true, van: "13:00", tot: "17:30" }, dinsdag: { open: true, van: "10:00", tot: "17:30" },
    woensdag: { open: true, van: "10:00", tot: "17:30" }, donderdag: { open: true, van: "10:00", tot: "17:30" },
    vrijdag: { open: true, van: "10:00", tot: "17:30" }, zaterdag: { open: false }, zondag: { open: false }
  },
  afwijkend: []
};

function toMin(t) {
  var m = /^(\d{1,2}):(\d{2})$/.exec(String(t || "").trim());
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
}
function fmt(min) {
  return Math.floor(min / 60) + ":" + String(min % 60).padStart(2, "0");
}
// Dates are handled as "YYYY-MM-DD" strings in Dutch time; day arithmetic is done in UTC so DST can't shift a day.
function ymd(d) { return d.toISOString().slice(0, 10); }
function addDays(date, n) { var p = date.split("-"); return ymd(new Date(Date.UTC(+p[0], p[1] - 1, +p[2] + n))); }
function weekday(date) { var p = date.split("-"); return new Date(Date.UTC(+p[0], p[1] - 1, +p[2])).getUTCDay(); }
function niceDate(date) { var p = date.split("-"); return +p[2] + " " + MONTHS[p[1] - 1]; }

// The shop is in Waddinxveen, so "now" is Dutch time, whatever the visitor's clock says.
function nowInNL() {
  var parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date());
  var get = function (t) { return parts.find(function (p) { return p.type === t; }).value; };
  return { date: get("year") + "-" + get("month") + "-" + get("day"), min: parseInt(get("hour"), 10) * 60 + parseInt(get("minute"), 10) };
}

// Hours for one date as [open, close] in minutes, or null when closed. A holiday period wins over the regular week.
function hoursOn(date) {
  var special = (info.afwijkend || []).find(function (a) { return a.van && a.tot && date >= a.van && date <= a.tot; });
  if (special) {
    if (special.gesloten) return null;
    var sv = toMin(special.open_van), st = toMin(special.open_tot);
    if (sv !== null && st !== null) return [sv, st];
  }
  var day = (info.openingstijden || {})[DAYS[weekday(date)]];
  var v = day && day.open ? toMin(day.van) : null, t = day && day.open ? toMin(day.tot) : null;
  return v !== null && t !== null ? [v, t] : null;
}

function openStatus() {
  var now = nowInNL();
  var today = hoursOn(now.date);
  if (today && now.min >= today[0] && now.min < today[1]) {
    return { open: true, text: "Nu open, tot " + fmt(today[1]) + " uur" };
  }
  if (today && now.min < today[0]) {
    return { open: false, text: "Nu gesloten, vandaag open vanaf " + fmt(today[0]) + " uur" };
  }
  // Find the next opening day; look further than a week so a long holiday still gives an answer.
  for (var i = 1; i <= 60; i++) {
    var d = addDays(now.date, i), h = hoursOn(d);
    if (h) {
      var when = i === 1 ? "morgen" : i < 7 ? DAYS[weekday(d)] : "op " + DAYS[weekday(d)] + " " + niceDate(d);
      return { open: false, text: "Nu gesloten, " + when + " weer open vanaf " + fmt(h[0]) + " uur" };
    }
  }
  return { open: false, text: "Nu gesloten" };
}

// Regular week as rows, joining days with the same hours: "Dinsdag t/m vrijdag".
function weekRows() {
  var order = [1, 2, 3, 4, 5, 6, 0], rows = [];
  order.forEach(function (d) {
    var day = (info.openingstijden || {})[DAYS[d]] || {};
    var v = toMin(day.van), t = toMin(day.tot);
    var label = day.open && v !== null && t !== null ? fmt(v) + " – " + fmt(t) : "Gesloten";
    var last = rows[rows.length - 1];
    if (last && last.label === label) last.to = d; else rows.push({ from: d, to: d, label: label });
  });
  return rows.map(function (r) {
    var name = DAYS[r.from].charAt(0).toUpperCase() + DAYS[r.from].slice(1);
    if (r.to !== r.from) name += (r.to === (r.from + 1) % 7 ? " en " : " t/m ") + DAYS[r.to];
    return [name, r.label];
  });
}

// Holiday periods that run now or start within two weeks.
function upcoming() {
  var today = nowInNL().date, soon = addDays(today, 14);
  return (info.afwijkend || []).filter(function (a) { return a.van && a.tot && a.tot >= today && a.van <= soon; })
    .sort(function (a, b) { return a.van < b.van ? -1 : 1; })
    .map(function (a) {
      var sameMonth = a.van.slice(0, 7) === a.tot.slice(0, 7);
      var when = a.van === a.tot ? DAYS[weekday(a.van)] + " " + niceDate(a.van)
        : (sameMonth ? +a.van.slice(8) : niceDate(a.van)) + " t/m " + niceDate(a.tot);
      var sv = toMin(a.open_van), st = toMin(a.open_tot);
      var what = a.gesloten || sv === null || st === null ? "gesloten" : "open van " + fmt(sv) + " tot " + fmt(st) + " uur";
      return { when: when, what: what, note: (a.opmerking || "").trim() };
    });
}

function renderHours() {
  var shop = openStatus();
  document.querySelectorAll("[data-status], [data-status-line]").forEach(function (el) {
    el.textContent = shop.text;
    el.classList.toggle("is-open", shop.open);
    el.hidden = false;
  });
  var dl = document.querySelector("[data-hours]");
  if (dl) {
    dl.textContent = "";
    weekRows().forEach(function (r) {
      var row = document.createElement("div"), dt = document.createElement("dt"), dd = document.createElement("dd");
      dt.textContent = r[0]; dd.textContent = r[1];
      row.append(dt, dd); dl.appendChild(row);
    });
  }
  var list = upcoming();
  document.querySelectorAll("[data-notice]").forEach(function (el) {
    el.textContent = "";
    list.forEach(function (a) {
      var line = document.createElement("span");
      line.textContent = "Let op: " + a.when + " " + a.what + (a.note ? " (" + a.note + ")" : "") + ".";
      el.appendChild(line);
    });
    el.hidden = !list.length;
  });
}

function renderOffer(o) {
  var today = nowInNL().date;
  var show = o && o.tonen && o.kop && !(o.tot_en_met && today > o.tot_en_met);
  var set = function (sel, text) {
    document.querySelectorAll(sel).forEach(function (el) { el.textContent = text || ""; el.hidden = !text; });
  };
  document.querySelectorAll("[data-offer]").forEach(function (el) { el.hidden = !show; });
  var sticker = document.querySelector("[data-offer-sticker]");
  if (sticker) sticker.hidden = !(show && o.prijs);
  if (!show) return;
  set("[data-offer-boven]", o.bovenregel);
  set("[data-offer-prijs]", o.prijs);
  set("[data-offer-onder]", o.onderregel);
  set("[data-offer-kop]", o.kop);
  set("[data-offer-tekst]", o.tekst);
  set("[data-offer-klein]", o.kleine_letters + (o.tot_en_met ? (o.kleine_letters ? " " : "") + "Geldig t/m " + niceDate(o.tot_en_met) + "." : ""));
}

function apply(data) {
  if (data.openingstijden) info.openingstijden = data.openingstijden;
  info.afwijkend = data.afwijkend || [];
  renderHours();
  renderOffer(data.aanbieding);
}

renderHours();
// Live preview inside the admin page (admin/?voorbeeld in an iframe): the form sends its unsaved data here.
var PREVIEW = /[?&]voorbeeld\b/.test(location.search) && window.parent !== window;
if (PREVIEW) {
  window.addEventListener("message", function (e) {
    if (e.origin !== location.origin || !e.data || e.data.type !== "inkstation-voorbeeld") return;
    apply(e.data.data);
    var target = e.data.focus === "openingstijden" ? document.getElementById("langskomen") : null;
    window.scrollTo({ top: target ? target.offsetTop - 80 : 0, behavior: "instant" });
  });
} else {
  // no-cache: the browser checks with the server every time, so Rens's change shows straight away.
  fetch("content/winkel.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(apply)
    .catch(function () { /* keep the hours and offer that are already in the HTML */ });
}

// Mobile menu
var menuBtn = document.querySelector(".menu-btn");
var nav = document.getElementById("nav");
function setMenu(open) {
  nav.classList.toggle("is-open", open);
  menuBtn.setAttribute("aria-expanded", String(open));
  menuBtn.querySelector(".menu-label").textContent = open ? "Sluit" : "Menu";
  // Lock the page behind the full-height menu so it can't scroll underneath.
  document.documentElement.style.overflow = open ? "hidden" : "";
}
menuBtn.addEventListener("click", function () { setMenu(!nav.classList.contains("is-open")); });
nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && nav.classList.contains("is-open")) { setMenu(false); menuBtn.focus(); }
});
