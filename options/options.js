'use strict';

const DEFAULT_FORMAT = 'title-number';
const FORMATS = ['title-number', 'title', 'number'];

async function restore() {
  let { format } = await chrome.storage.sync.get({ format: DEFAULT_FORMAT });
  // storage に想定外の値が入っていてもセレクタを壊さないよう許可リストで検証する
  if (!FORMATS.includes(format)) format = DEFAULT_FORMAT;
  document.querySelector(`input[name="format"][value="${format}"]`).checked = true;
}

document.querySelectorAll('input[name="format"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    chrome.storage.sync.set({ format: radio.value });
  });
});

restore();
