window.FETCH_CONFIG = {
  demoMode: false,
  supabaseUrl: 'https://appesztafatypbxzdunr.supabase.co',
  supabaseAnonKey: 'sb_publishable_70RugEcKQxZWUa5eQfmyeg_y7AkVz9V'
};

/* Fetch v0.6.9 point-update loader.
   Keeps the v0.6.8 app/data code intact and layers the responsive-card fix on top. */
(() => {
  if (!document.querySelector('link[data-fetch-v069]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'fetch-responsive-v0.6.9.css?v=0.6.9';
    link.dataset.fetchV069 = 'true';
    document.head.appendChild(link);
  }

  const activate = () => {
    const classifyCards = () => {
      document.querySelectorAll('.item-card').forEach(card => {
        card.classList.remove('capture-page','capture-text','capture-image-link');
        const label = (card.querySelector('.type-pill')?.textContent || '').trim().toLowerCase();
        if (label.includes('image')) card.classList.add('capture-image-link');
        else if (label.includes('text')) card.classList.add('capture-text');
        else card.classList.add('capture-page');
      });
    };

    document.querySelectorAll('.sidebar-footer span').forEach(el => {
      if (/^v\d+\.\d+\.\d+$/.test((el.textContent || '').trim())) el.textContent = 'v0.6.9';
    });

    classifyCards();
    const items = document.getElementById('items');
    if (items && !items.dataset.fetchV069Observed) {
      items.dataset.fetchV069Observed = 'true';
      new MutationObserver(classifyCards).observe(items, { childList: true, subtree: true });
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', activate, { once: true });
  else activate();
})();
