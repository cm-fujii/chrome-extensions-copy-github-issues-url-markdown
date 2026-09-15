'use strict';

// キーごとの許可値（先頭が既定値）。storage に想定外の値が入っていても
// セレクタを壊さないよう、復元時は必ずこのリストで検証する
const SETTINGS = {
  format: ['title-number', 'title', 'number'],
  typeLabel: ['none', 'prefix', 'suffix'],
};

async function restore() {
  const defaults = Object.fromEntries(
    Object.entries(SETTINGS).map(([key, values]) => [key, values[0]])
  );
  const stored = await chrome.storage.sync.get(defaults);
  for (const [key, values] of Object.entries(SETTINGS)) {
    const value = values.includes(stored[key]) ? stored[key] : values[0];
    document.querySelector(`input[name="${key}"][value="${value}"]`).checked = true;
  }
}

for (const key of Object.keys(SETTINGS)) {
  document.querySelectorAll(`input[name="${key}"]`).forEach((radio) => {
    radio.addEventListener('change', () => {
      chrome.storage.sync.set({ [key]: radio.value });
    });
  });
}

restore();
