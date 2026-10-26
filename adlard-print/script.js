// "Recent work" carousel: arrow buttons step one card, the counter follows scrolling (also by swipe).
document.querySelectorAll("[data-carousel]").forEach(function (box) {
  var root = box.closest(".section") || box;
  var track = box.querySelector(".carousel-track");
  var cards = track.querySelectorAll(".card");
  var prev = root.querySelector("[data-prev]");
  var next = root.querySelector("[data-next]");
  var current = root.querySelector("[data-current]");
  root.querySelector("[data-total]").textContent = cards.length;

  function step() {
    var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return cards[0].getBoundingClientRect().width + gap;
  }
  function update() {
    var i = Math.round(track.scrollLeft / step());
    var max = track.scrollWidth - track.clientWidth - 2;
    current.textContent = track.scrollLeft >= max ? cards.length : Math.min(i + 1, cards.length);
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max;
  }
  function go(dir) {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var from = track.scrollLeft;
    var target = from + dir * step();
    track.scrollTo({ left: target, behavior: reduce ? "auto" : "smooth" });
    // Some browsers drop the smooth scroll on a snapping track; jump there instead.
    setTimeout(function () {
      if (Math.abs(track.scrollLeft - from) < 2) track.scrollTo({ left: target, behavior: "instant" });
    }, 350);
  }
  prev.addEventListener("click", function () { go(-1); });
  next.addEventListener("click", function () { go(1); });
  track.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
});
