document.addEventListener('DOMContentLoaded', () => {
  const navItems = document.querySelectorAll('.nav-item');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.link;
      if (!target) return;

      window.location.href = target;
    });
  });
});
