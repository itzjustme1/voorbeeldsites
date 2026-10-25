// "Recent work" carousel: arrow buttons step one card, the counter follows scrolling (also by swipe).
document.querySelectorAll("[data-carousel]").forEach(function (root) {
  var track = root.querySelector(".carousel-track");
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
    current.textContent = Math.min(i + 1, cards.length);
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max;
  }
  prev.addEventListener("click", function () { track.scrollBy({ left: -step(), behavior: "smooth" }); });
  next.addEventListener("click", function () { track.scrollBy({ left: step(), behavior: "smooth" }); });
  track.addEventListener("scroll", function () { window.requestAnimationFrame(update); }, { passive: true });
  window.addEventListener("resize", update);
  update();
});
