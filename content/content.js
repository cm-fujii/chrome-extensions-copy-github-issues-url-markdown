'use strict';

(() => {
  const BTN_CLASS = 'cgh-copy-btn';
  // options/options.js の SETTINGS 各キーの先頭値と一致させること
  const DEFAULT_FORMAT = 'title-number';
  const DEFAULT_TYPE_LABEL = 'none';
  const FEEDBACK_MS = 1500;
  const SCAN_THROTTLE_MS = 150;
  const BTN_LABEL = 'Copy as Markdown link';

  // GitHub の DOM は React 版とレガシー版が混在するため、
  // セレクタは新 UI → 旧 UI の順のフォールバックチェーンで持つ
  const SELECTORS = {
    detailTitle: [
      '[data-testid="issue-title"]',
      'h1[data-component="PH_Title"] .markdown-title',
      '.gh-header-title .markdown-title',
      '.js-issue-title',
    ],
    listItemLink: [
      'a[data-testid="listitem-title-link"]',
      '.js-issue-row a.js-navigation-open',
    ],
    projectPanelAnchor: [
      '[data-testid="side-panel-title-content"] a[href*="/issues/"], [data-testid="side-panel-title-content"] a[href*="/pull/"]',
      'h1[data-component="PH_Title"] a[href*="/issues/"], h1[data-component="PH_Title"] a[href*="/pull/"]',
      '[data-testid="side-panel-focus-target"] a[href*="/issues/"], [data-testid="side-panel-focus-target"] a[href*="/pull/"]',
    ],
    // アンカーと同じタイトル行を指すコンテナ。タイトルと URL を必ず
    // 同一 Issue から取るため、この中でだけタイトルを探す
    projectPanelTitleScope:
      'h1[data-component="PH_Title"], [data-testid="side-panel-title-content"], [data-testid="side-panel-focus-target"]',
    projectPanelTitle: ['[data-testid="issue-title"]'],
  };

  // Octicons (MIT License) https://github.com/primer/octicons
  const ICON_PATHS = {
    copy: 'M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Zm5-5C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z',
    check: 'M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z',
    error: 'M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z',
  };

  function createIconSvg(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', ICON_PATHS[name]);
    svg.appendChild(path);
    return svg;
  }

  function escapeTitle(title) {
    return title.replace(/[\\[\]]/g, '\\$&');
  }

  function buildMarkdown({ format, typeLabel }, { title, number, url, type }) {
    const t = escapeTitle(title.trim());
    let text;
    switch (format) {
      case 'title':
        text = t;
        break;
      case 'number':
        text = `#${number}`;
        break;
      default:
        text = `${t} #${number}`;
    }
    const label = type === 'pr' ? 'PR' : 'Issue';
    if (typeLabel === 'prefix') text = `${label}: ${text}`;
    else if (typeLabel === 'suffix') text = `${text} (${label})`;
    return `[${text}](${url})`;
  }

  // href から Issue/PR の正規 URL・番号・種別を取り出す（クエリ・ハッシュは捨てる）
  function parseIssueHref(href) {
    const m = href.match(/^(https:\/\/github\.com\/[^/]+\/[^/]+\/(issues|pull)\/(\d+))(?:$|[/?#])/);
    if (!m) return null;
    return { url: m[1], number: m[3], type: m[2] === 'pull' ? 'pr' : 'issue' };
  }

  function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    textarea.remove();
    return ok;
  }

  function showFeedback(btn, kind) {
    clearTimeout(btn._cghTimer);
    btn.replaceChildren(createIconSvg(kind));
    btn.classList.toggle('cgh-success', kind === 'check');
    btn.classList.toggle('cgh-error', kind === 'error');
    btn.setAttribute('aria-label', kind === 'check' ? 'Copied' : 'Copy failed');
    btn._cghTimer = setTimeout(() => {
      btn.replaceChildren(createIconSvg('copy'));
      btn.classList.remove('cgh-success', 'cgh-error');
      btn.setAttribute('aria-label', BTN_LABEL);
    }, FEEDBACK_MS);
  }

  // getData はクリック時に評価する。Projects のサイドパネルはカード切替で
  // 中身だけ差し替わることがあるため、挿入時の値を固定しない
  function createButton(getData) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = BTN_CLASS;
    btn.title = BTN_LABEL;
    btn.setAttribute('aria-label', BTN_LABEL);
    btn.appendChild(createIconSvg('copy'));
    btn.addEventListener('click', async (e) => {
      // Issues 一覧では行全体がナビゲーション対象のため伝播を止める
      e.preventDefault();
      e.stopPropagation();
      const data = getData();
      if (!data) {
        showFeedback(btn, 'error');
        return;
      }
      // 拡張のリロード/更新でコンテキストが無効化されると chrome.* が throw する。
      // その場合もデフォルト設定でコピー自体は成立させる
      let settings = { format: DEFAULT_FORMAT, typeLabel: DEFAULT_TYPE_LABEL };
      try {
        settings = await chrome.storage.sync.get(settings);
      } catch {
        // fall back to defaults
      }
      const markdown = buildMarkdown(settings, data);
      try {
        await navigator.clipboard.writeText(markdown);
        showFeedback(btn, 'check');
      } catch {
        showFeedback(btn, fallbackCopy(markdown) ? 'check' : 'error');
      }
    });
    return btn;
  }

  // 挿入は常に insertAdjacentElement('afterend') なので直後の兄弟だけを見る
  function hasButton(el) {
    const next = el.nextElementSibling;
    return next !== null && next.classList.contains(BTN_CLASS);
  }

  function queryFirst(selectors, root = document) {
    for (const sel of selectors) {
      const el = root.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  const DETAIL_PATH_RE = /^\/([^/]+)\/([^/]+)\/(issues|pull)\/(\d+)(?:$|\/)/;

  // Injector A: Issue/PR 詳細ページ。URL と番号はアドレスバーから正規形を構築し、
  // DOM からはタイトルのみ取得する（DOM 変更に対して最も壊れにくい）。
  // ソフトナビゲーションでボタンが生き残ることがあるため、URL・番号も
  // クリック時に解決する（挿入時の値を固定すると別 Issue の URL を掴む）
  function getDetailData() {
    const m = location.pathname.match(DETAIL_PATH_RE);
    const el = queryFirst(SELECTORS.detailTitle);
    if (!m || !el) return null;
    const title = el.textContent;
    if (!title.trim()) return null;
    return {
      title,
      number: m[4],
      url: `https://github.com/${m[1]}/${m[2]}/${m[3]}/${m[4]}`,
      type: m[3] === 'pull' ? 'pr' : 'issue',
    };
  }

  function injectDetailPage() {
    if (!DETAIL_PATH_RE.test(location.pathname)) return;
    const titleEl = queryFirst(SELECTORS.detailTitle);
    if (!titleEl || hasButton(titleEl)) return;
    titleEl.insertAdjacentElement('afterend', createButton(getDetailData));
  }

  // Injector B: Issues/PRs 一覧の各行
  function injectListRows() {
    for (const sel of SELECTORS.listItemLink) {
      for (const link of document.querySelectorAll(sel)) {
        if (hasButton(link)) continue;
        if (!parseIssueHref(link.href)) continue;
        const btn = createButton(() => {
          const parsed = parseIssueHref(link.href);
          const title = link.textContent.trim();
          return parsed && title ? { title, ...parsed } : null;
        });
        link.insertAdjacentElement('afterend', btn);
      }
    }
  }

  // Injector C: GitHub Projects のサイドパネル/フルスクリーン表示。
  // ブラウザの URL は Projects のままなので、パネル内タイトルの
  // アンカー href から Issue 本来の URL を取得する
  function getProjectPanelData() {
    const a = queryFirst(SELECTORS.projectPanelAnchor);
    if (!a) return null;
    const parsed = parseIssueHref(a.href);
    if (!parsed) return null;
    // パネルのタイトル行は「タイトルの bdi + #番号のアンカー」で構成され、
    // アンカーのテキストは番号だけのことがある。タイトルはアンカーと同じ
    // タイトル行の bdi から取り、無い/空のときのみアンカーテキストに頼る。
    // 末尾の番号除去は、タイトル自体が別の「... #42」で終わるケースを
    // 壊さないよう、href から取れた自分の番号と一致するときだけ行う
    const scope = a.closest(SELECTORS.projectPanelTitleScope) ?? a.parentElement;
    const titleEl = scope ? queryFirst(SELECTORS.projectPanelTitle, scope) : null;
    const title =
      (titleEl && titleEl.textContent.trim()) ||
      a.textContent.trim().replace(new RegExp(`\\s*#${parsed.number}$`), '');
    return title ? { title, ...parsed } : null;
  }

  function injectProjectPanel() {
    if (!/^\/(orgs|users)\/[^/]+\/projects\/\d+/.test(location.pathname)) return;
    const anchor = queryFirst(SELECTORS.projectPanelAnchor);
    if (!anchor || hasButton(anchor) || !parseIssueHref(anchor.href)) return;
    anchor.insertAdjacentElement('afterend', createButton(getProjectPanelData));
  }

  // 冪等なので何度走っても安全。React の再レンダーでボタンが消えても
  // 次のスキャンで復旧する
  function scan() {
    injectDetailPage();
    injectListRows();
    injectProjectPanel();
  }

  let scanTimer = null;
  function throttledScan() {
    if (scanTimer !== null) return;
    scanTimer = setTimeout(() => {
      scanTimer = null;
      scan();
    }, SCAN_THROTTLE_MS);
  }

  scan();
  new MutationObserver(throttledScan).observe(document.body, {
    childList: true,
    subtree: true,
  });
  // Projects のパネル開閉はナビゲーションイベントを発しないため
  // MutationObserver が主機構。以下はソフトナビゲーション時の即応用
  document.addEventListener('turbo:render', throttledScan);
  document.addEventListener('soft-nav:react-done', throttledScan);
  // Turbo はページキャッシュ時に DOM を clone するためリスナーが失われる。
  // 死んだボタンが復元されると hasButton が再注入を妨げるので、キャッシュ前に外す
  document.addEventListener('turbo:before-cache', () => {
    for (const btn of document.querySelectorAll(`.${BTN_CLASS}`)) btn.remove();
  });
})();
