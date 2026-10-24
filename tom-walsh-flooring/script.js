(function () {
  var btn = document.querySelector(".menu-btn");
  var nav = document.getElementById("site-nav");

  function setOpen(open) {
    nav.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", String(open));
  }

  btn.addEventListener("click", function () {
    setOpen(btn.getAttribute("aria-expanded") !== "true");
  });
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) setOpen(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      btn.focus();
    }
  });

  // Before/after comparison: the range input drives the clip of the "before" photo.
  document.querySelectorAll("[data-compare]").forEach(function (box) {
    var range = box.querySelector(".compare-range");
    var before = box.querySelector(".compare-before");
    function update() {
      var v = range.value;
      before.style.clipPath = "inset(0 " + (100 - v) + "% 0 0)";
      box.style.setProperty("--pos", v + "%");
    }
    range.addEventListener("input", update);
    update();
  });
})();
