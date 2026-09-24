/**
 * Sends a small orb from an add control to the cart button in the bottom
 * navigation, then bounces that button. Deliberately DOM-only: cart data
 * remains owned by CartProvider.
 */
export function animateToCart(from: HTMLElement | null) {
  const to = document.querySelector<HTMLElement>("[data-cart-target]");

  if (from && to) {
    const start = from.getBoundingClientRect();
    const end = to.getBoundingClientRect();
    const orb = document.createElement("div");
    orb.className = "magic-orb";
    orb.style.top = `${start.top + start.height / 2 - 9}px`;
    orb.style.left = `${start.left + start.width / 2 - 9}px`;
    document.body.appendChild(orb);
    void orb.offsetWidth;
    orb.style.top = `${end.top + end.height / 2 - 9}px`;
    orb.style.left = `${end.left + end.width / 2 - 9}px`;
    orb.style.transform = "scale(0.3)";
    orb.style.opacity = "0.5";
    window.setTimeout(() => orb.remove(), 650);

    window.setTimeout(() => {
      to.classList.remove("nav-bounce");
      void to.offsetWidth;
      to.classList.add("nav-bounce");
      window.setTimeout(() => to.classList.remove("nav-bounce"), 550);
    }, 620);
  }

  navigator.vibrate?.(20);
}
