/**
 * Merixa Device Lab — multi-device iOS-style preview frames.
 */
const DEVICES = [
  {
    id: "iphone-16-pro",
    label: "iPhone 16 Pro",
    width: 393,
    height: 852,
    safeTop: 59,
    safeBottom: 34,
    island: true,
    kind: "phone",
  },
  {
    id: "iphone-16-pro-max",
    label: "iPhone 16 Pro Max",
    width: 430,
    height: 932,
    safeTop: 59,
    safeBottom: 34,
    island: true,
    kind: "phone",
  },
  {
    id: "iphone-se",
    label: "iPhone SE",
    width: 375,
    height: 667,
    safeTop: 20,
    safeBottom: 0,
    island: false,
    kind: "phone",
  },
  {
    id: "ipad-mini",
    label: "iPad mini",
    width: 744,
    height: 1133,
    safeTop: 24,
    safeBottom: 20,
    island: false,
    kind: "pad",
  },
];

const STORAGE_KEY = "mpg-device-lab-v1";

const state = {
  url: "http://127.0.0.1:3000/ask/",
  selected: new Set(["iphone-16-pro"]),
  orient: "portrait",
  scale: 72,
  chrome: true,
  safe: false,
  darkFrame: false,
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (typeof parsed.url === "string" && parsed.url.trim()) {
      state.url = parsed.url.trim();
    }
    if (Array.isArray(parsed.selected) && parsed.selected.length) {
      state.selected = new Set(parsed.selected);
    }
    if (parsed.orient === "portrait" || parsed.orient === "landscape") {
      state.orient = parsed.orient;
    }
    if (typeof parsed.scale === "number") {
      state.scale = Math.min(100, Math.max(40, parsed.scale));
    }
    if (typeof parsed.chrome === "boolean") state.chrome = parsed.chrome;
    if (typeof parsed.safe === "boolean") state.safe = parsed.safe;
    if (typeof parsed.darkFrame === "boolean") state.darkFrame = parsed.darkFrame;
  } catch {
    // ignore
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      url: state.url,
      selected: [...state.selected],
      orient: state.orient,
      scale: state.scale,
      chrome: state.chrome,
      safe: state.safe,
      darkFrame: state.darkFrame,
    }),
  );
}

function clockLabel() {
  const d = new Date();
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function renderDeviceList() {
  const root = document.getElementById("device-list");
  root.innerHTML = "";
  for (const device of DEVICES) {
    const label = document.createElement("label");
    label.className = state.selected.has(device.id) ? "on" : "";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = state.selected.has(device.id);
    input.addEventListener("change", () => {
      if (input.checked) state.selected.add(device.id);
      else state.selected.delete(device.id);
      if (state.selected.size === 0) {
        state.selected.add("iphone-16-pro");
      }
      saveState();
      renderDeviceList();
      renderStage();
    });
    const copy = document.createElement("span");
    copy.innerHTML = `${device.label}<small>${device.width}×${device.height}</small>`;
    label.append(input, copy);
    root.append(label);
  }
}

function deviceBox(device) {
  const landscape = state.orient === "landscape";
  const w = landscape ? device.height : device.width;
  const h = landscape ? device.width : device.height;
  return { w, h };
}

function renderStage() {
  const stage = document.getElementById("stage");
  stage.innerHTML = "";
  const devices = DEVICES.filter((d) => state.selected.has(d.id));
  if (devices.length === 0) {
    stage.innerHTML =
      '<p class="lab-empty">Select at least one device in the sidebar.</p>';
    return;
  }

  for (const device of devices) {
    const { w, h } = deviceBox(device);
    const wrap = document.createElement("div");
    wrap.className = "device-wrap";

    const caption = document.createElement("div");
    caption.className = "device-caption";
    caption.textContent = `${device.label} · ${w}×${h} · ${state.orient}`;

    const shell = document.createElement("div");
    shell.className = [
      "device-shell",
      device.kind === "pad" ? "pad" : "",
      state.chrome ? "" : "hide-chrome",
      state.darkFrame ? "dark-frame" : "",
    ]
      .filter(Boolean)
      .join(" ");
    shell.style.transform = `scale(${state.scale / 100})`;
    shell.style.marginBottom = `${((h + 24) * (1 - state.scale / 100)) / 2}px`;

    const screen = document.createElement("div");
    screen.className = state.safe ? "device-screen safe-guides" : "device-screen";
    screen.style.width = `${w}px`;
    screen.style.height = `${h}px`;
    screen.style.setProperty("--safe-top", `${device.safeTop}px`);
    screen.style.setProperty("--safe-bottom", `${device.safeBottom}px`);

    if (state.chrome && device.island && state.orient === "portrait") {
      const island = document.createElement("div");
      island.className = "island";
      screen.append(island);
    }

    if (state.chrome) {
      const bar = document.createElement("div");
      bar.className = "status-bar";
      bar.innerHTML = `<span>${clockLabel()}</span><span>5G · 100%</span>`;
      screen.append(bar);
    }

    const frame = document.createElement("iframe");
    frame.title = `${device.label} preview`;
    frame.src = state.url;
    frame.loading = "eager";
    frame.referrerPolicy = "no-referrer";
    screen.append(frame);

    if (state.chrome && device.safeBottom > 0 && state.orient === "portrait") {
      const home = document.createElement("div");
      home.className = "home-bar";
      screen.append(home);
    }

    shell.append(screen);
    wrap.append(caption, shell);
    stage.append(wrap);
  }
}

function bindUi() {
  const urlInput = document.getElementById("app-url");
  urlInput.value = state.url;
  urlInput.addEventListener("change", () => {
    state.url = urlInput.value.trim() || "http://127.0.0.1:3000/ask/";
    saveState();
    renderStage();
  });
  urlInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      state.url = urlInput.value.trim() || "http://127.0.0.1:3000/ask/";
      saveState();
      renderStage();
    }
  });

  document.getElementById("btn-reload").addEventListener("click", () => {
    state.url = urlInput.value.trim() || state.url;
    saveState();
    void checkAppReachable();
    renderStage();
  });

  document.getElementById("btn-open").addEventListener("click", () => {
    window.open(state.url, "_blank", "noopener,noreferrer");
  });

  document.querySelectorAll(".lab-seg-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.orient === state.orient);
    btn.addEventListener("click", () => {
      state.orient = btn.dataset.orient;
      document
        .querySelectorAll(".lab-seg-btn")
        .forEach((b) => b.classList.toggle("active", b === btn));
      saveState();
      renderStage();
    });
  });

  const scale = document.getElementById("scale");
  const scaleLabel = document.getElementById("scale-label");
  scale.value = String(state.scale);
  scaleLabel.textContent = String(state.scale);
  scale.addEventListener("input", () => {
    state.scale = Number(scale.value);
    scaleLabel.textContent = String(state.scale);
    saveState();
    renderStage();
  });

  const chrome = document.getElementById("show-chrome");
  chrome.checked = state.chrome;
  chrome.addEventListener("change", () => {
    state.chrome = chrome.checked;
    saveState();
    renderStage();
  });

  const safe = document.getElementById("show-safe");
  safe.checked = state.safe;
  safe.addEventListener("change", () => {
    state.safe = safe.checked;
    saveState();
    renderStage();
  });

  const dark = document.getElementById("dark-frame");
  dark.checked = state.darkFrame;
  dark.addEventListener("change", () => {
    state.darkFrame = dark.checked;
    saveState();
    renderStage();
  });

  document.getElementById("preset-phone").addEventListener("click", () => {
    state.selected = new Set(["iphone-16-pro"]);
    saveState();
    renderDeviceList();
    renderStage();
  });
  document.getElementById("preset-compare").addEventListener("click", () => {
    state.selected = new Set(["iphone-16-pro", "iphone-se"]);
    saveState();
    renderDeviceList();
    renderStage();
  });
  document.getElementById("preset-ipad").addEventListener("click", () => {
    state.selected = new Set(["iphone-16-pro", "ipad-mini"]);
    saveState();
    renderDeviceList();
    renderStage();
  });
}

function setConnBanner(kind, message) {
  const banner = document.getElementById("conn-banner");
  if (!banner) return;
  if (!message) {
    banner.hidden = true;
    banner.textContent = "";
    banner.className = "lab-conn";
    return;
  }
  banner.hidden = false;
  banner.className = `lab-conn ${kind}`;
  banner.textContent = message;
}

async function checkAppReachable() {
  try {
    const res = await fetch(
      `/api/ping?url=${encodeURIComponent(state.url)}`,
      { cache: "no-store" },
    );
    const data = await res.json();
    if (data.ok) {
      setConnBanner(
        "ok",
        `App reachable at ${state.url} (HTTP ${data.status ?? "ok"}). Reload frames if they still look blank.`,
      );
      return true;
    }
    setConnBanner(
      "bad",
      `Cannot reach ${state.url}. Start the app with “npm run dev” in another terminal, then click Reload. (${data.error || "connection refused"})`,
    );
    return false;
  } catch {
    setConnBanner(
      "bad",
      "Device Lab ping failed — is the lab server still running on :3920?",
    );
    return false;
  }
}

loadState();
bindUi();
renderDeviceList();
renderStage();
void checkAppReachable();
setInterval(() => {
  document.querySelectorAll(".status-bar span:first-child").forEach((node) => {
    node.textContent = clockLabel();
  });
}, 30_000);
setInterval(() => {
  void checkAppReachable();
}, 12_000);
