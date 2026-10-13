// Pisa IJs — mock site interactions
// 1) mobile nav toggle
// 2) signature motion moment: staggered scroll-reveal on the flavor grid
//    (see DESIGN-RECON.md > Motion > Signature moment)

document.addEventListener("DOMContentLoaded", () => {
  // --- mobile nav ---
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav-links");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  // --- signature reveal: flavor cards ---
  const cards = document.querySelectorAll(".flavor-card");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stagger = 80; // ms, see DESIGN-RECON.md

  if (!cards.length) return;

  if (reduceMotion) {
    cards.forEach((c) => c.classList.add("is-visible"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const card = entry.target;
        const i = [...cards].indexOf(card);
        setTimeout(() => card.classList.add("is-visible"), i * stagger);
        io.unobserve(card);
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
  );

  cards.forEach((c) => io.observe(c));
});
