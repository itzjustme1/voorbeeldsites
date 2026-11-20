// Beheerpagina Inkstation. Talks to api.php; when that isn't there (e.g. the GitHub Pages preview) it runs as a demo
// where everything works except saving.
var API = "api.php";
var CONTENT = "../content/winkel.json";
var DAYS = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"];

var state = null;      // what's in the form now
var savedJSON = "";    // what's on the site, to know if there are unsaved changes
var csrf = null;
var demo = false;
var focus = "aanbieding";

var $ = function (id) { return document.getElementById(id); };

function api(action, opts) {
  opts = opts || {};
  var headers = { "Content-Type": "application/json" };
  if (csrf) headers["X-CSRF-Token"] = csrf;
  return fetch(API + "?action=" + action, {
    method: opts.body ? "POST" : "GET", headers: headers, credentials: "same-origin",
    body: opts.body ? JSON.stringify(opts.body) : undefined
  }).then(function (r) {
    var type = r.headers.get("Content-Type") || "";
    if (type.indexOf("application/json") === -1) throw { demo: true };
    return r.json().then(function (j) { if (!r.ok) throw { message: j.error || "Er ging iets mis." }; return j; });
  });
}

// --- Start: logged in? ---
function start() {
  api("me").then(function (me) {
    if (me.loggedIn) { csrf = me.csrf; openApp(); } else showLogin();
  }).catch(function (e) {
    demo = !!(e && e.demo) || e instanceof TypeError;
    showLogin();
  });
}

function showLogin() {
  $("app").hidden = true;
  $("login").hidden = false;
  $("demo-note").hidden = !demo;
  var form = $("login-form");
  form.elements.email.focus();
  form.onsubmit = function (ev) {
    ev.preventDefault();
    var err = $("login-error");
    err.hidden = true;
    if (demo) { openApp(); return; }
    var btn = form.querySelector("button");
    btn.disabled = true;
    btn.textContent = "Even geduld…";
    api("login", { body: { email: form.elements.email.value, password: form.elements.password.value } })
      .then(function (me) { csrf = me.csrf; form.reset(); openApp(); })
      .catch(function (e) { err.textContent = e.message || "Inloggen lukte niet."; err.hidden = false; })
      .then(function () { btn.disabled = false; btn.textContent = "Inloggen"; });
  };
}

function openApp() {
  $("login").hidden = true;
  $("app").hidden = false;
  $("demo-bar").hidden = !demo;
  fetch(CONTENT, { cache: "no-cache" })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      state = normalize(data);
      savedJSON = JSON.stringify(state);
      render();
      setupPreview();
    })
    .catch(function () { toast("De gegevens van de site konden niet geladen worden. Ververs de pagina."); });
}

// Fill in anything missing so the form always has every field.
function normalize(d) {
  d = d || {};
  var out = { openingstijden: {}, afwijkend: [], aanbieding: {} };
  DAYS.forEach(function (day) {
    var x = (d.openingstijden || {})[day] || {};
    out.openingstijden[day] = { open: !!x.open, van: x.van || "", tot: x.tot || "" };
  });
  (d.afwijkend || []).forEach(function (p) {
    out.afwijkend.push({ van: p.van || "", tot: p.tot || "", gesloten: p.gesloten !== false, open_van: p.open_van || "", open_tot: p.open_tot || "", opmerking: p.opmerking || "" });
  });
  var o = d.aanbieding || {};
  out.aanbieding = {
    tonen: !!o.tonen, bovenregel: o.bovenregel || "", prijs: o.prijs || "", onderregel: o.onderregel || "",
    kop: o.kop || "", tekst: o.tekst || "", kleine_letters: o.kleine_letters || "", tot_en_met: o.tot_en_met || ""
  };
  return out;
}

function get(path) { return path.split(".").reduce(function (o, k) { return o[k]; }, state); }
function set(path, value) {
  var keys = path.split("."), last = keys.pop();
  keys.reduce(function (o, k) { return o[k]; }, state)[last] = value;
}

// --- Form ---
function render() {
  document.querySelectorAll("[data-bind]").forEach(function (el) {
    var path = el.getAttribute("data-bind");
    if (el.type === "checkbox") el.checked = !!get(path); else el.value = get(path);
    el.oninput = el.onchange = function () {
      set(path, el.type === "checkbox" ? el.checked : el.value);
      changed(path.split(".")[0] === "aanbieding" ? "aanbieding" : null);
    };
  });
  renderWeek();
  renderPeriods();
  mirror();
}

function renderWeek() {
  var week = $("week");
  week.textContent = "";
  DAYS.forEach(function (day) {
    var d = state.openingstijden[day];
    var row = document.createElement("div");
    row.className = "day" + (d.open ? "" : " is-closed");
    row.innerHTML =
      '<p class="day-name"></p>' +
      '<label class="switch"><input type="checkbox"><span class="switch-ui" aria-hidden="true"></span><span class="switch-text"></span></label>' +
      '<label class="field field-time"><span class="field-label">Van</span><input type="time"></label>' +
      '<label class="field field-time"><span class="field-label">Tot</span><input type="time"></label>';
    row.querySelector(".day-name").textContent = day.charAt(0).toUpperCase() + day.slice(1);
    var box = row.querySelector("input[type=checkbox]"), txt = row.querySelector(".switch-text");
    var times = row.querySelectorAll("input[type=time]");
    box.checked = d.open;
    box.setAttribute("aria-label", row.querySelector(".day-name").textContent + " open");
    txt.textContent = d.open ? "Open" : "Gesloten";
    times[0].value = d.van; times[1].value = d.tot;
    box.onchange = function () {
      d.open = box.checked;
      if (d.open && !d.van) { d.van = "10:00"; d.tot = "17:30"; times[0].value = d.van; times[1].value = d.tot; }
      row.classList.toggle("is-closed", !d.open);
      txt.textContent = d.open ? "Open" : "Gesloten";
      changed("openingstijden");
    };
    times[0].oninput = function () { d.van = times[0].value; changed("openingstijden"); };
    times[1].oninput = function () { d.tot = times[1].value; changed("openingstijden"); };
    week.appendChild(row);
  });
}

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function renderPeriods() {
  var list = $("periods");
  list.textContent = "";
  state.afwijkend.forEach(function (p, i) {
    var li = $("period-tpl").content.firstElementChild.cloneNode(true);
    var q = function (k) { return li.querySelectorAll('[data-k="' + k + '"]'); };
    q("van")[0].value = p.van;
    q("tot")[0].value = p.tot;
    q("open_van")[0].value = p.open_van;
    q("open_tot")[0].value = p.open_tot;
    q("opmerking")[0].value = p.opmerking;
    var radios = q("kind");
    radios.forEach(function (r) { r.name = "kind-" + i; r.checked = (r.value === "dicht") === p.gesloten; });
    var sync = function () {
      li.classList.toggle("is-open", !p.gesloten);
      li.classList.toggle("is-past", !!p.tot && p.tot < today());
    };
    sync();
    q("van")[0].oninput = function () {
      p.van = this.value;
      if (!p.tot || p.tot < p.van) { p.tot = p.van; q("tot")[0].value = p.van; }
      sync(); changed("vakantie");
    };
    q("tot")[0].oninput = function () { p.tot = this.value; sync(); changed("vakantie"); };
    q("open_van")[0].oninput = function () { p.open_van = this.value; changed("vakantie"); };
    q("open_tot")[0].oninput = function () { p.open_tot = this.value; changed("vakantie"); };
    q("opmerking")[0].oninput = function () { p.opmerking = this.value; changed("vakantie"); };
    radios.forEach(function (r) {
      r.onchange = function () {
        p.gesloten = r.value === "dicht";
        if (!p.gesloten && !p.open_van) { p.open_van = "10:00"; p.open_tot = "14:00"; q("open_van")[0].value = "10:00"; q("open_tot")[0].value = "14:00"; }
        sync(); changed("vakantie");
      };
    });
    li.querySelector(".period-remove").onclick = function () {
      state.afwijkend.splice(i, 1);
      renderPeriods(); changed("vakantie");
    };
    list.appendChild(li);
  });
}

$("add-period").onclick = function () {
  var t = today();
  state.afwijkend.push({ van: t, tot: t, gesloten: true, open_van: "", open_tot: "", opmerking: "" });
  renderPeriods(); changed("vakantie");
  var last = $("periods").lastElementChild;
  last.querySelector('[data-k="van"]').focus();
};

// Grey out the offer fields while the offer is switched off.
function mirror() {
  document.querySelectorAll("[data-mirror]").forEach(function (el) {
    el.textContent = get(el.getAttribute("data-mirror"));
  });
  var o = state.aanbieding;
  document.querySelector(".offer-fields").classList.toggle("is-off", !o.tonen);
}

function dirty() { return JSON.stringify(state) !== savedJSON; }

function changed(where) {
  if (where) focus = where;
  mirror();
  var d = dirty();
  $("save").disabled = !d;
  $("save-state").textContent = d ? "Niet opgeslagen wijzigingen" : "Alles is opgeslagen";
  $("save-state").classList.toggle("is-dirty", d);
  $("save-error").hidden = true;
  sendPreview();
}

window.addEventListener("beforeunload", function (e) {
  if (state && dirty() && !demo) { e.preventDefault(); e.returnValue = ""; }
});

// --- Saving ---
$("save").onclick = function () {
  var btn = $("save");
  if (demo) {
    savedJSON = JSON.stringify(state);
    changed();
    toast("In het voorbeeld wordt niets opgeslagen. Op de echte site staat het nu meteen online.");
    return;
  }
  btn.disabled = true;
  btn.textContent = "Opslaan…";
  api("save", { body: { data: state } })
    .then(function (res) {
      state = normalize(res.data);
      savedJSON = JSON.stringify(state);
      render();
      changed();
      toast("Opgeslagen. Het staat nu op de website.");
    })
    .catch(function (e) {
      if (e && e.message && /ingelogd/.test(e.message)) { showLogin(); return; }
      $("save-error").textContent = e.message || "Opslaan lukte niet. Probeer het nog eens.";
      $("save-error").hidden = false;
      btn.disabled = false;
    })
    .then(function () { btn.textContent = "Opslaan"; });
};

$("logout").onclick = $("logout-bottom").onclick = function () {
  if (dirty() && !demo && !confirm("Er zijn wijzigingen die nog niet zijn opgeslagen. Toch uitloggen?")) return;
  var done = function () { csrf = null; state = null; showLogin(); };
  if (demo) return done();
  api("logout", { body: {} }).then(done, done);
};

var toastTimer;
function toast(text) {
  var t = $("toast");
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.hidden = true; }, 4500);
}

// --- Live preview: the real site in an iframe, fed the form data ---
var frame = $("frame");
var previewTimer;
function sendPreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(function () {
    if (!frame.contentWindow || !state) return;
    frame.contentWindow.postMessage({ type: "inkstation-voorbeeld", data: state, focus: focus }, location.origin);
  }, 120);
}

function setupPreview() {
  frame.onload = sendPreview;
  sendPreview();
  // "Computer" shows the site at 1280 wide, scaled to fit the column; "Telefoon" at 390 wide.
  var stage = $("stage");
  var view = window.innerWidth < 700 ? "mobile" : "desktop";
  document.querySelectorAll("[data-view]").forEach(function (o) { o.setAttribute("aria-pressed", String(o.getAttribute("data-view") === view)); });
  function fit() {
    var w = view === "desktop" ? 1280 : 390;
    var scale = Math.min(1, stage.clientWidth / w);
    frame.style.width = w + "px";
    frame.style.height = Math.round(stage.clientHeight / scale) + "px";
    frame.style.transform = "scale(" + scale + ")";
    stage.classList.toggle("is-mobile", view === "mobile");
  }
  document.querySelectorAll("[data-view]").forEach(function (b) {
    b.onclick = function () {
      view = b.getAttribute("data-view");
      document.querySelectorAll("[data-view]").forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
      fit();
    };
  });
  window.addEventListener("resize", fit);
  fit();
  // Phones: the preview opens full screen on request.
  $("open-preview").onclick = function () { document.body.classList.add("show-preview"); fit(); sendPreview(); };
  $("close-preview").onclick = function () { document.body.classList.remove("show-preview"); };
  // Focusing a section moves the preview to the matching part of the site.
  document.querySelectorAll(".card[data-focus]").forEach(function (card) {
    card.addEventListener("focusin", function () {
      var f = card.getAttribute("data-focus");
      if (f !== focus) { focus = f; sendPreview(); }
    });
  });
}

start();
