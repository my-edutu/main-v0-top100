(() => {
  const title = document.querySelector('title');
  if (title) {
    const brandTitle = () => {
      const nextTitle = document.title.replace(/\blistmonk\b/i, 'Top100 Email');
      if (nextTitle !== document.title) document.title = nextTitle;
    };
    new MutationObserver(brandTitle).observe(title, { childList: true, subtree: true, characterData: true });
    brandTitle();
  }
  const icon = document.querySelector('link[rel~="icon"]');
  if (icon) icon.href = 'https://top100afl.com/favicon-32x32.png';
})();


(() => {
  const mobile = matchMedia('(max-width: 768px)');
  const selector = '.navbar-burger';
  const getBurger = () => document.querySelector('#app ' + selector);
  const getDrawer = () => document.querySelector('#app .navbar-menu.is-active');
  const updateTrigger = () => {
    const burger = getBurger();
    const menu = document.querySelector('#app .navbar-menu');
    if (!burger || !menu) return false;
    menu.id ||= 'top100-email-navigation';
    burger.setAttribute('aria-controls', menu.id);
    burger.setAttribute('aria-expanded', String(Boolean(getDrawer())));
    return true;
  };
  if (!updateTrigger()) {
    const ready = new MutationObserver(() => {
      if (updateTrigger()) ready.disconnect();
    });
    ready.observe(document.documentElement, { childList: true, subtree: true });
  }
  const focusable = drawer => [...drawer.querySelectorAll('a, button, [tabindex="0"]')]
    .filter(element => element.getClientRects().length && element.tabIndex >= 0);
  const close = () => {
    const burger = getBurger();
    if (!burger || !getDrawer()) return;
    burger.click();
    burger.focus();
  };

  document.addEventListener('click', event => {
    if (!mobile.matches || !(event.target instanceof Element)) return;
    const drawer = getDrawer();
    if (event.target.closest(selector)) {
      requestAnimationFrame(() => {
        updateTrigger();
        const openDrawer = getDrawer();
        if (openDrawer) focusable(openDrawer)[0]?.focus();
      });
    } else if (drawer && !event.target.closest('#app .navbar')) {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (drawer && event.target.closest('a[href^="/admin"]')) {
      requestAnimationFrame(close);
    }
  }, true);
  document.addEventListener('keydown', event => {
    if (!mobile.matches) return;
    const burger = getBurger();
    const drawer = getDrawer();
    if (event.target === burger && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      burger.click();
    } else if (drawer && event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (drawer && event.key === 'Tab') {
      const items = [burger, ...focusable(drawer)].filter(Boolean);
      const index = items.indexOf(document.activeElement);
      if (index < 0 || (event.shiftKey ? index === 0 : index === items.length - 1)) {
        event.preventDefault();
        (event.shiftKey ? items.at(-1) : items[0])?.focus();
      }
    }
  });
  mobile.addEventListener('change', () => {
    if (!mobile.matches && getDrawer()) getBurger()?.click();
  });
})();


(() => {
  const label = (selector, text) => {
    document.querySelectorAll(selector).forEach(node => {
      if (!node.getAttribute('aria-label')) node.setAttribute('aria-label', text);
      if (!node.title) node.title = text;
    });
  };
  const update = () => {
    label('.subscribers [data-cy="btn-advanced-search"]', 'Advanced filters');
    label('.subscribers [data-cy="btn-search"]', 'Search subscribers');
    label('.subscribers thead th.checkbox-cell input', 'Select subscribers on this page');
    label('#app .table-mobile-sort select', 'Sort by');
    label('#app .table-mobile-sort button', 'Reverse sort order');
    label('#app .b-table .level-left form button[type="submit"]', 'Search');
  };
  new MutationObserver(update).observe(document.documentElement, { childList: true, subtree: true });
  update();
})();


(() => {
  const previews = new Map();

  function intro(title, hint) {
    const region = document.createElement('div');
    region.className = 'top100-composer-intro';
    const heading = document.createElement('h2');
    heading.className = 'top100-composer-title';
    heading.textContent = title;
    const paragraph = document.createElement('p');
    paragraph.className = 'top100-composer-hint';
    paragraph.textContent = hint;
    region.append(heading, paragraph);
    return region;
  }

  function updateSetup(campaign) {
    const form = campaign.querySelector('#campaign-content form');
    if (!form) return;
    const advanced = [...form.children].filter(field =>
      field.querySelector('select[name="messenger"], input[name="tags"], [data-cy="btn-headers"]')
    );
    advanced.forEach(field => field.classList.add('top100-advanced-field'));
    const schedule = form.querySelector('[data-cy="btn-send-later"]')?.closest('.columns');
    schedule?.classList.add('top100-schedule');

    if (advanced.length && !form.querySelector('.top100-advanced-toggle')) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'button top100-advanced-toggle';
      toggle.textContent = 'Advanced settings';
      const setOpen = (open) => {
        form.dataset.top100Options = open ? 'open' : 'closed';
        toggle.setAttribute('aria-expanded', String(open));
      };
      setOpen(Boolean(form.querySelector('textarea[name="headers"]')?.value));
      toggle.addEventListener('click', () => setOpen(form.dataset.top100Options !== 'open'));
      form.addEventListener('invalid', (event) => {
        if (event.target.closest('.top100-advanced-field')) setOpen(true);
      }, true);
      advanced[0].before(toggle);
      form.prepend(intro('Campaign setup', 'Choose the audience, sender, and subject. Then design your email.'));
    }

    const next = form.querySelector('[data-cy="btn-continue"]');
    if (next?.textContent.trim() === 'Continue') next.textContent = 'Continue to design';

    const testCard = campaign.querySelector('#campaign-content .column > .box');
    if (testCard && !testCard.querySelector('.top100-test-hint')) {
      const hint = document.createElement('p');
      hint.className = 'top100-composer-hint top100-test-hint';
      hint.textContent = 'Save your campaign setup and design your email to enable a test send.';
      testCard.append(hint);
    }
  }

  function updatePreview(modal, stage) {
    const header = modal.querySelector('.modal-card-head');
    if (!header || previews.has(stage)) return;
    modal.classList.add('top100-device-preview');
    const controls = document.createElement('div');
    controls.className = 'top100-preview-device-switch';
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', 'Email preview device');
    const buttons = new Map();
    let active = stage.clientWidth >= 580 ? 680 : 375;

    function resize() {
      if (!stage.clientWidth) return;
      const scale = Math.min(1, (stage.clientWidth - 24) / active);
      stage.style.setProperty('--top100-email-frame-width', active + 'px');
      stage.style.setProperty('--top100-email-frame-height', (stage.clientHeight - 24) / scale + 'px');
      stage.style.setProperty('--top100-email-frame-scale', String(scale));
    }

    for (const [width, title] of [[680, 'Desktop'], [375, 'Mobile']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = title;
      button.setAttribute('aria-pressed', String(width === active));
      button.addEventListener('click', () => {
        active = width;
        buttons.forEach((item, size) => item.setAttribute('aria-pressed', String(size === active)));
        resize();
      });
      buttons.set(width, button);
      controls.append(button);
    }

    const observer = new ResizeObserver(resize);
    previews.set(stage, observer);
    header.append(controls);
    observer.observe(stage);
    resize();
  }

  function update() {
    for (const [stage, observer] of previews) {
      if (!stage.isConnected) {
        observer.disconnect();
        previews.delete(stage);
      }
    }

    const campaign = document.querySelector('#app .main > .campaign');
    if (campaign) {
      const labels = [['campaign-label', 'Campaign', 'Setup'], ['content-label', 'Content', 'Design']];
      for (const [id, oldLabel, newLabel] of labels) {
        const text = campaign.querySelector('#' + id + ' > span:last-child');
        if (text?.textContent.trim() === oldLabel) text.textContent = newLabel;
      }
      updateSetup(campaign);
      const editor = campaign.querySelector('#content-content .editor');
      if (editor && !editor.querySelector(':scope > .top100-composer-intro')) {
        editor.prepend(intro('Email design', 'Choose a saved template and format your message, then preview it on desktop or mobile.'));
      }
    }

    document.querySelectorAll('#app .modal-card-body.preview > iframe').forEach(frame => {
      const modal = frame.closest('.modal');
      if (modal) updatePreview(modal, frame.parentElement);
    });
  }

  new MutationObserver(update).observe(document.documentElement, { childList: true, subtree: true });
  update();
})();


(() => {
  const covers = new Set();
  const tables = new WeakSet();
  const resize = new ResizeObserver(entries => {
    for (const { target, contentRect } of entries) {
      if (!contentRect.width) continue;
      const scale = Math.min(1, contentRect.width / 620);
      target.style.setProperty('--top100-cover-scale', String(scale));
      target.style.setProperty('--top100-cover-frame-height', Math.ceil(contentRect.height / scale) + 'px');
    }
  });

  async function setSort(table, column, descending) {
    const find = () => table.querySelectorAll('thead th')[column];
    const nextRender = () => new Promise(resolve => requestAnimationFrame(resolve));
    if (!find()?.classList.contains('is-current-sort')) {
      find()?.click();
      await nextRender();
    }
    const header = find();
    if (header?.classList.contains('is-current-sort') &&
        Boolean(header.querySelector('.sort-icon.is-desc')) !== descending) {
      header.click();
    }
  }

  function addToolbar(table) {
    if (tables.has(table)) return;
    tables.add(table);
    const bar = document.createElement('div');
    bar.className = 'top100-gallery-tools';
    const intro = document.createElement('p');
    intro.textContent = 'Preview and manage your reusable email designs.';
    const label = document.createElement('label');
    label.textContent = 'Sort by';
    const select = document.createElement('select');
    const sorts = [
      ['Last updated', 4, true],
      ['Newest created', 3, true],
      ['Name A–Z', 0, false],
    ];
    sorts.forEach(([name], index) => select.add(new Option(name, String(index))));
    select.addEventListener('change', async () => {
      const [, column, descending] = sorts[Number(select.value)];
      select.disabled = true;
      try { await setSort(table, column, descending); }
      finally { select.disabled = false; }
    });
    label.append(select);
    bar.append(intro, label);
    table.before(bar);
    setSort(table, 4, true);
  }

  function updateCard(row) {
    const [first, , idCell, , updated] = row.cells;
    const id = idCell?.textContent.trim();
    const name = first?.querySelector('a')?.textContent.trim();
    if (!name || !/^\d+$/.test(id)) return;
    let cover = first.querySelector('.top100-template-cover');
    if (!cover) {
      cover = document.createElement('div');
      cover.className = 'top100-template-cover';
      const frame = document.createElement('iframe');
      frame.title = 'Template thumbnail';
      frame.loading = 'lazy';
      frame.tabIndex = -1;
      frame.setAttribute('sandbox', '');
      frame.setAttribute('aria-hidden', 'true');
      const caption = document.createElement('button');
      caption.type = 'button';
      caption.className = 'top100-template-cover-label';
      caption.textContent = 'Preview';
      cover.append(frame, caption);
      caption.addEventListener('click', () => cover.closest('tr')?.querySelector('[data-cy="btn-preview"]')?.click());
      first.prepend(cover);
      covers.add(cover);
      resize.observe(cover);
    }
    const version = updated?.textContent.trim() || '';
    const src = '/api/templates/' + id + '/preview?v=' + encodeURIComponent(version);
    const frame = cover.querySelector('iframe');
    if (frame.getAttribute('src') !== src) frame.setAttribute('src', src);
    cover.querySelector('button').setAttribute('aria-label', 'Preview ' + name);
  }

  let pending = false;
  function update() {
    pending = false;
    for (const cover of covers) {
      if (!cover.isConnected) {
        resize.unobserve(cover);
        covers.delete(cover);
      }
    }
    const table = document.querySelector('#app .main > .templates > .b-table');
    if (!table?.querySelector('thead th')) return;
    table.classList.add('top100-template-gallery');
    addToolbar(table);
    table.querySelectorAll('tbody tr:has(> td.actions)').forEach(updateCard);
  }
  new MutationObserver(() => {
    if (!pending) {
      pending = true;
      requestAnimationFrame(update);
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
  update();
})();
