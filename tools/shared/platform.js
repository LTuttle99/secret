(function () {
  "use strict";

  const script = document.currentScript;
  const rootUrl = script ? new URL("../../", script.src) : new URL("../../", location.href);
  const isHome = /\/(?:index\.html)?$/.test(location.pathname) && !location.pathname.includes("/tools/");
  const toolId = location.pathname.match(/\/tools\/([^/]+)\//)?.[1] || null;
  const dbName = "datahub_workspace";
  const storeName = "files";
  const currentKey = "current";

  const tools = [
    ["data-analyzer", "Data Analyzer", "KPIs, forecasting, anomalies and insights"],
    ["instant-dashboard", "Instant Dashboard", "Build a dashboard automatically from a file"],
    ["dashboard-builder", "Dashboard Builder", "Design and share a custom dashboard"],
    ["sql-workbench", "SQL Workbench", "Query files with SQL"],
    ["pivot-explorer", "Pivot & Chart Explorer", "Summarize data with pivots and charts"],
    ["chart-builder", "Chart Builder", "Turn columns into presentation-ready charts"],
    ["column-stats", "Column Statistics", "Inspect distributions and missing values"],
    ["stat-tests", "Statistical Tests", "Run correlations, t-tests and ANOVA"],
    ["data-cleaner", "Data Cleaner", "Find and fix quality problems"],
    ["fuzzy-dupes", "Fuzzy Duplicate Finder", "Find near-duplicate names and records"],
    ["lookup-merge", "Lookup & Merge", "Join files using a shared key"],
    ["file-diff", "File Diff", "Compare two versions of a file"],
    ["converter", "Format Converter", "Convert CSV, Excel and JSON"],
    ["data-generator", "Test Data Generator", "Create safe sample datasets"],
    ["qr-generator", "QR Code Generator", "Create downloadable QR codes"],
    ["encode-decode", "Base64 / URL Encoder", "Encode and decode text"],
    ["jwt-decoder", "JWT Decoder", "Inspect token headers and payloads"],
    ["json-formatter", "JSON Formatter", "Validate, format and minify JSON"],
    ["regex-tester", "Regex Tester", "Test patterns against text"],
    ["text-diff", "Text Diff", "Compare two passages of text"],
    ["text-analyzer", "Text Analyzer", "Count and inspect written content"],
    ["markdown-preview", "Markdown Previewer", "Write and preview Markdown"],
    ["timestamp-converter", "Timestamp Converter", "Convert dates and Unix timestamps"],
    ["unit-converter", "Unit Converter", "Convert common measurements"],
    ["code-helper", "Code Helper", "Generate practical code snippets"],
    ["color-tools", "Color Tools", "Build palettes and convert colors"]
  ].map(([id, title, description]) => ({ id, title, description, url: new URL(`tools/${id}/index.html`, rootUrl).href }));

  const bundles = [
    { title: "Monthly reporting", query: "clean my monthly spreadsheet, analyze trends, then build a dashboard", tools: ["data-cleaner", "data-analyzer", "dashboard-builder"] },
    { title: "Data quality check", query: "check data quality and find duplicate records", tools: ["column-stats", "data-cleaner", "fuzzy-dupes"] },
    { title: "Dashboard creation", query: "turn my file into a dashboard I can share", tools: ["instant-dashboard", "dashboard-builder"] },
    { title: "Survey analysis", query: "summarize survey responses, test differences, and chart the results", tools: ["text-analyzer", "stat-tests", "chart-builder"] },
    { title: "Developer utilities", query: "format structured data and inspect developer values", tools: ["json-formatter", "regex-tester", "encode-decode"] }
  ];

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error("IndexedDB unavailable"));
      const request = indexedDB.open(dbName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(storeName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function workspaceGet() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const request = tx.objectStore(storeName).get(currentKey);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  }

  async function workspaceSet(file) {
    const db = await openDb();
    const record = { blob: file, name: file.name, type: file.type, size: file.size, modified: file.lastModified || Date.now(), savedAt: Date.now() };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).put(record, currentKey);
      tx.oncomplete = () => { db.close(); resolve(record); };
      tx.onerror = () => reject(tx.error);
    });
  }

  async function workspaceClear() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).delete(currentKey);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  }

  function humanSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  function toast(message) {
    document.querySelector(".dh-toast")?.remove();
    const node = document.createElement("div");
    node.className = "dh-toast";
    node.textContent = message;
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 3200);
  }

  function makeFile(record) {
    return new File([record.blob], record.name, { type: record.type || record.blob.type, lastModified: record.modified || Date.now() });
  }

  function loadIntoFirstInput(record) {
    const input = document.querySelector('input[type="file"]');
    if (!input) { toast("This tool doesn’t use file uploads."); return false; }
    try {
      const transfer = new DataTransfer();
      transfer.items.add(makeFile(record));
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      toast(`${record.name} loaded from your workspace.`);
      return true;
    } catch (error) {
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      toast("Choose the workspace file from this tool’s upload control.");
      return false;
    }
  }

  function sampleFile() {
    const csv = [
      "date,region,product,revenue,orders,satisfaction",
      "2026-01-01,North,Starter,12800,142,4.2",
      "2026-02-01,South,Pro,16750,159,4.5",
      "2026-03-01,West,Starter,14120,151,4.1",
      "2026-04-01,East,Enterprise,21300,177,4.7",
      "2026-05-01,North,Pro,18440,168,4.6",
      "2026-06-01,South,Enterprise,23950,186,4.8"
    ].join("\n");
    return new File([csv], "datahub-sample.csv", { type: "text/csv" });
  }

  async function useSample() {
    const file = sampleFile();
    const record = await workspaceSet(file);
    if (toolId) loadIntoFirstInput(record);
    await renderWorkspaceBanner();
    toast("Sample data is ready.");
  }

  async function renderWorkspaceBanner() {
    document.querySelector(".dh-workspace-banner[data-workspace-banner]")?.remove();
    let record = null;
    try { record = await workspaceGet(); } catch (error) { /* storage may be disabled */ }
    if (!record && !toolId) return;
    const banner = document.createElement("div");
    banner.className = "dh-workspace-banner";
    banner.dataset.workspaceBanner = "true";
    banner.innerHTML = record
      ? `<div><strong>Workspace:</strong> ${escapeHtml(record.name)} <span>· ${humanSize(record.size)}</span></div><div class="dh-workspace-actions">${toolId ? '<button class="dh-small-button" data-dh-use>Use in this tool</button>' : ''}<button class="dh-small-button" data-dh-sample>Sample data</button><button class="dh-small-button danger" data-dh-clear>Clear</button></div>`
      : `<div><strong>Try this tool instantly</strong> with a safe sample dataset.</div><div class="dh-workspace-actions"><button class="dh-small-button" data-dh-sample>Load sample data</button></div>`;
    const anchor = document.querySelector("header") || document.body.firstChild;
    anchor.insertAdjacentElement("afterend", banner);
    banner.querySelector("[data-dh-use]")?.addEventListener("click", () => loadIntoFirstInput(record));
    banner.querySelector("[data-dh-sample]")?.addEventListener("click", useSample);
    banner.querySelector("[data-dh-clear]")?.addEventListener("click", async () => { await workspaceClear(); await renderWorkspaceBanner(); toast("Workspace cleared."); });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  function recordVisit() {
    if (!toolId) return;
    const item = tools.find(tool => tool.id === toolId);
    if (!item) return;
    try {
      const recent = JSON.parse(localStorage.getItem("hub_platform_recent") || "[]").filter(entry => entry.id !== toolId);
      recent.unshift({ id: item.id, title: item.title, url: item.url, at: Date.now() });
      localStorage.setItem("hub_platform_recent", JSON.stringify(recent.slice(0, 8)));
    } catch (error) { /* local preferences are optional */ }
  }

  function recentTools() {
    try { return JSON.parse(localStorage.getItem("hub_platform_recent") || "[]"); }
    catch (error) { return []; }
  }

  function addContinueCard() {
    if (!isHome) return;
    const recent = recentTools()[0];
    if (!recent) return;
    const finder = document.getElementById("vanessa-finder");
    if (!finder) return;
    const card = document.createElement("a");
    card.href = recent.url;
    card.className = "dh-workspace-banner";
    card.style.textDecoration = "none";
    card.innerHTML = `<div><strong>Continue where you left off</strong><br><span>${escapeHtml(recent.title)}</span></div><span class="dh-small-button">Continue →</span>`;
    finder.insertAdjacentElement("afterend", card);
  }

  function addUniversalDrop() {
    if (!isHome) return;
    const finder = document.getElementById("vanessa-finder");
    if (!finder) return;
    const zone = document.createElement("div");
    zone.className = "dh-drop-zone";
    zone.tabIndex = 0;
    zone.setAttribute("role", "button");
    zone.innerHTML = '<strong>Drop a file here once. Use it anywhere.</strong><span>CSV, Excel, JSON, or text · stored only in this browser</span><input type="file" hidden accept=".csv,.xlsx,.xls,.xlsm,.json,.txt,.md">';
    finder.appendChild(zone);
    const input = zone.querySelector("input");
    const save = async file => {
      if (!file) return;
      if (file.size > 50 * 1024 * 1024) return toast("Choose a file smaller than 50 MB.");
      await workspaceSet(file);
      await renderWorkspaceBanner();
      const finderInput = document.getElementById("tool-finder-input");
      if (finderInput) finderInput.value = `Help me work with ${file.name}`;
      zone.querySelector("strong").textContent = `${file.name} is ready`;
      zone.querySelector("span").textContent = "Ask Vanessa what to do next, or open any file-based tool.";
      toast("File added to your shared workspace.");
    };
    zone.addEventListener("click", event => { if (event.target !== input) input.click(); });
    zone.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") input.click(); });
    input.addEventListener("change", () => save(input.files[0]));
    ["dragenter", "dragover"].forEach(type => zone.addEventListener(type, event => { event.preventDefault(); zone.classList.add("is-dragging"); }));
    ["dragleave", "drop"].forEach(type => zone.addEventListener(type, event => { event.preventDefault(); zone.classList.remove("is-dragging"); }));
    zone.addEventListener("drop", event => save(event.dataTransfer.files[0]));
  }

  function addBundles() {
    if (!isHome) return;
    const finder = document.getElementById("vanessa-finder");
    if (!finder) return;
    const section = document.createElement("section");
    section.className = "dh-bundles";
    section.innerHTML = `<div class="dh-bundles-head"><h3>Start with a workflow</h3><span style="font:500 12px/1.2 ui-sans-serif,system-ui;color:#94a3b8">Vanessa connects the tools</span></div><div class="dh-bundle-row">${bundles.map((bundle, index) => `<button class="dh-bundle" data-bundle="${index}">${escapeHtml(bundle.title)}<br><span style="color:#94a3b8">${bundle.tools.length} steps</span></button>`).join("")}</div>`;
    finder.insertAdjacentElement("afterend", section);
    section.querySelectorAll("[data-bundle]").forEach(button => button.addEventListener("click", () => {
      const bundle = bundles[Number(button.dataset.bundle)];
      const input = document.getElementById("tool-finder-input");
      if (input) input.value = bundle.query;
      document.getElementById("tool-finder-form")?.requestSubmit();
      finder.scrollIntoView({ behavior: "smooth", block: "center" });
    }));
  }

  function platformBar() {
    const bar = document.createElement("nav");
    bar.className = "dh-platform-bar";
    bar.setAttribute("aria-label", "DataHub quick controls");
    bar.innerHTML = `<button class="dh-platform-button" data-dh-command title="Open command center"><strong>⌘</strong><span>Command</span></button><button class="dh-platform-button" data-dh-workspace title="Workspace"><strong>▣</strong><span>Workspace</span></button><button class="dh-platform-button" data-dh-export title="Export center"><strong>⇩</strong><span>Export</span></button><button class="dh-platform-button" data-dh-theme title="Toggle theme"><strong>◐</strong><span>Theme</span></button>`;
    document.body.appendChild(bar);
    bar.querySelector("[data-dh-command]").addEventListener("click", openCommandCenter);
    bar.querySelector("[data-dh-workspace]").addEventListener("click", async () => {
      const record = await workspaceGet().catch(() => null);
      if (record) toast(`${record.name} · ${humanSize(record.size)} is in your workspace.`);
      else useSample();
    });
    bar.querySelector("[data-dh-export]").addEventListener("click", openExportCenter);
    bar.querySelector("[data-dh-theme]").addEventListener("click", () => {
      if (document.getElementById("hub-theme-toggle")) document.getElementById("hub-theme-toggle").click();
      else document.documentElement.dataset.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    });
  }

  function modalShell(label) {
    const shell = document.createElement("div");
    shell.className = "dh-modal-shell";
    shell.setAttribute("role", "dialog");
    shell.setAttribute("aria-modal", "true");
    shell.setAttribute("aria-label", label);
    shell.innerHTML = '<div class="dh-modal"></div>';
    shell.addEventListener("click", event => { if (event.target === shell) shell.remove(); });
    document.body.appendChild(shell);
    return shell;
  }

  function commandActions(query) {
    const q = query.trim().toLowerCase();
    const actions = [
      { title: "Ask Vanessa", description: "Describe a goal and get a workflow", icon: "V", run: () => { location.href = new URL("index.html#vanessa-finder", rootUrl).href; } },
      { title: "Load sample data", description: "Try tools without finding a file", icon: "+", run: useSample },
      { title: "Toggle dark mode", description: "Switch the DataHub theme", icon: "◐", run: () => document.querySelector("[data-dh-theme]")?.click() },
      { title: "Print or save as PDF", description: "Export the current view", icon: "P", run: () => window.print() }
    ];
    const items = tools.map(tool => ({ title: tool.title, description: tool.description, icon: tool.title.slice(0, 1), run: () => { location.href = tool.url; } })).concat(actions);
    return q ? items.filter(item => `${item.title} ${item.description}`.toLowerCase().includes(q)) : items;
  }

  function openCommandCenter() {
    document.querySelector('.dh-modal-shell[aria-label="Command center"]')?.remove();
    const shell = modalShell("Command center");
    const modal = shell.querySelector(".dh-modal");
    modal.innerHTML = '<div class="dh-modal-head"><input class="dh-command-input" placeholder="Search tools or type an action…" aria-label="Search commands"></div><div class="dh-command-results"></div>';
    const input = modal.querySelector("input");
    const results = modal.querySelector(".dh-command-results");
    const draw = () => {
      const items = commandActions(input.value).slice(0, 14);
      results.innerHTML = `<div class="dh-command-group">Tools and actions</div>${items.map((item, index) => `<button class="dh-command-item" data-index="${index}"><span class="dh-command-icon">${escapeHtml(item.icon)}</span><span class="dh-command-copy"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.description)}</span></span></button>`).join("") || '<p style="padding:24px;color:#94a3b8;text-align:center">No matches</p>'}`;
      results.querySelectorAll("[data-index]").forEach(button => button.addEventListener("click", () => { const action = items[Number(button.dataset.index)]; shell.remove(); action.run(); }));
    };
    input.addEventListener("input", draw);
    input.addEventListener("keydown", event => { if (event.key === "Escape") shell.remove(); if (event.key === "Enter") results.querySelector("[data-index]")?.click(); });
    draw(); input.focus();
  }

  function openExportCenter() {
    const shell = modalShell("Export center");
    const modal = shell.querySelector(".dh-modal");
    const nativeDownloads = Array.from(document.querySelectorAll('a[download], button')).filter(node => !node.closest('.dh-platform-bar,.dh-modal-shell') && /download|export|copy|save/i.test(node.textContent || "")).slice(0, 8);
    modal.innerHTML = `<div class="dh-modal-head"><div style="font:700 18px/1.3 ui-sans-serif,system-ui;color:#00133c">Export center</div><div style="margin-top:4px;color:#94a3b8;font:400 13px/1.4 ui-sans-serif,system-ui">One place for every way to take your work with you.</div></div><div class="dh-command-results"><div class="dh-command-group">Universal</div><button class="dh-command-item" data-print><span class="dh-command-icon">P</span><span class="dh-command-copy"><strong>Print or save as PDF</strong><span>Use your browser’s PDF destination</span></span></button><button class="dh-command-item" data-copy><span class="dh-command-icon">C</span><span class="dh-command-copy"><strong>Copy visible results</strong><span>Copy the main workspace as text</span></span></button>${nativeDownloads.length ? `<div class="dh-command-group">This tool</div>${nativeDownloads.map((node, index) => `<button class="dh-command-item" data-native="${index}"><span class="dh-command-icon">⇩</span><span class="dh-command-copy"><strong>${escapeHtml((node.textContent || "Export").trim().slice(0, 60))}</strong><span>Use this tool’s built-in export</span></span></button>`).join("")}` : ""}</div>`;
    modal.querySelector("[data-print]").addEventListener("click", () => { shell.remove(); window.print(); });
    modal.querySelector("[data-copy]").addEventListener("click", async () => {
      const text = (document.querySelector("main") || document.body).innerText;
      await navigator.clipboard.writeText(text); shell.remove(); toast("Visible results copied.");
    });
    modal.querySelectorAll("[data-native]").forEach(button => button.addEventListener("click", () => { shell.remove(); nativeDownloads[Number(button.dataset.native)].click(); }));
  }

  function progressiveControls() {
    const candidates = Array.from(document.querySelectorAll("main section, main > div")).filter(node => {
      const heading = node.querySelector(":scope > h2, :scope > h3, :scope > h4");
      return heading && /advanced|options|settings|configuration/i.test(heading.textContent || "");
    });
    candidates.forEach(node => {
      const button = document.createElement("button");
      button.type = "button"; button.className = "dh-advanced-toggle"; button.textContent = "Show advanced controls";
      node.parentNode.insertBefore(button, node);
      node.classList.add("dh-advanced-collapsed");
      button.addEventListener("click", () => {
        const hidden = node.classList.toggle("dh-advanced-collapsed");
        button.textContent = hidden ? "Show advanced controls" : "Hide advanced controls";
      });
    });
  }

  function registerPwa() {
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register(new URL("service-worker.js", rootUrl)).catch(() => {});
    }
  }

  function keyboardShortcuts() {
    document.addEventListener("keydown", event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openCommandCenter(); }
      if (event.key === "Escape") document.querySelector(".dh-modal-shell")?.remove();
    });
  }

  async function init() {
    recordVisit();
    addUniversalDrop();
    addBundles();
    addContinueCard();
    platformBar();
    progressiveControls();
    keyboardShortcuts();
    registerPwa();
    await renderWorkspaceBanner();
  }

  window.DataHubWorkspace = { get: workspaceGet, set: workspaceSet, clear: workspaceClear, useSample, loadIntoFirstInput };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
