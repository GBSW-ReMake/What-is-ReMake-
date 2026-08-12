document.documentElement.classList.remove("no-js");

// One-shot scroll reveal — IntersectionObserver, never re-fires.
const revealEls = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window && revealEls.length) {
  const observer = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
  );
  revealEls.forEach((el) => observer.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("is-visible"));
}

// Masthead nav disclosure (mobile only — CSS gates the collapsed state)
const mastToggle = document.querySelector(".mast-toggle");
const mastNav = document.querySelector(".mast-nav");

if (mastToggle && mastNav) {
  mastToggle.addEventListener("click", () => {
    const isOpen = mastNav.classList.toggle("is-open");
    mastToggle.setAttribute("aria-expanded", String(isOpen));
    mastToggle.textContent = isOpen ? "Close" : "Menu";
  });

  mastNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mastNav.classList.remove("is-open");
      mastToggle.setAttribute("aria-expanded", "false");
      mastToggle.textContent = "Menu";
    });
  });
}
