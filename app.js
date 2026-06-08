const API_URL =
  "https://script.google.com/macros/s/AKfycbzR5drUd3Uk22xdgGNQYbvcO0iB1B40qNSRYy_GakfP8BW21M8OG9QWsE8mjg9neUcQ/exec";

const PASSCODE_KEY = "lw_passcode";

let searches = [];
let suggestions = [];
let lastOverlaps = [];

let recentSearchLimit = 25;
let recentFindLimit = 10;
let suggestionLimit = 50;

/* ---------------- INIT ---------------- */

document.addEventListener("DOMContentLoaded", () => {

  safeBind("loginBtn", login);
  safeBind("checkBtn", checkCoverage);
  safeBind("saveBtn", saveSearch);

  safeBind(
    "suggestionFilter",
    renderSuggested,
    "change"
  );

  startApp();
});

/* ---------------- SAFE BIND ---------------- */

function safeBind(
  id,
  fn,
  event = "click"
) {
  const el = document.getElementById(id);

  if (el) {
    el.addEventListener(event, fn);
  }
}

/* ---------------- LOGIN ---------------- */

function getCode() {
  return localStorage.getItem(PASSCODE_KEY) || "";
}

function login() {

  const code =
    document
      .getElementById("passInput")
      ?.value
      ?.trim();

  if (!code) {

    setText(
      "loginError",
      "Enter passcode"
    );

    return;
  }

  localStorage.setItem(
    PASSCODE_KEY,
    code
  );

  startApp();
}

function startApp() {

  const code = getCode();

  if (!code) {

    show("login");
    hide("app");

    return;
  }

  hide("login");
  show("app");

  init();
}

/* ---------------- INIT ---------------- */

async function init() {

  const commander =
    document.getElementById(
      "commander"
    );

  if (!commander) return;

  commander.value =
    localStorage.getItem(
      "commander"
    ) || "";

  commander.onchange = () =>
    localStorage.setItem(
      "commander",
      commander.value
    );

  await loadData();
}

/* ---------------- LOAD ---------------- */

async function loadData() {

  try {

    const res =
      await fetch(
        API_URL +
        "?code=" +
        encodeURIComponent(
          getCode()
        )
      );

    const json =
      await res.json();

    if (!json.success) {

      alert(
        "Unauthorized or server error"
      );

      return;
    }

    searches =
      json.searches || [];

    suggestions =
      json.suggested || [];

    renderAll();

  } catch (e) {

    console.error(e);

    alert(
      "Server connection failed"
    );
  }
}

/* ---------------- CHECK ---------------- */

function checkCoverage() {

  const x =
    Number(val("x"));

  const y =
    Number(val("y"));

  const result =
    document.getElementById(
      "checkResult"
    );

  /* exact duplicate */

  const exact =
    searches.find(s =>
      Number(s.x) === x &&
      Number(s.y) === y
    );

  if (exact) {

    result.innerHTML = `
      <div class="warning">

        ⚠ Coordinate already exists

        <br><br>

        Player:
        ${exact.player || "Unknown"}

        <br>

        Status:
        ${exact.status}

      </div>
    `;

    hide("submitArea");

    return;
  }

  lastOverlaps =
    searches.filter(s =>

      Math.abs(
        x - Number(s.x)
      ) <= 4 &&

      Math.abs(
        y - Number(s.y)
      ) <= 4
    );

  show("submitArea");

  if (lastOverlaps.length) {

    const nearest =
      lastOverlaps[0];

    result.innerHTML = `

      <div class="warning">

        ⚠ Overlap Detected

        <br><br>

        Existing Search:

        <br>

        ${nearest.player || "Unknown"}

        <br>

        (${nearest.x},
         ${nearest.y})

        <br>

        Status:
        ${nearest.status}

        <br><br>

        Proceed with caution.

      </div>

    `;

  } else {

    result.innerHTML = `
      <div class="success">

        ✅ Area appears clear

      </div>
    `;
  }
}

/* ---------------- SAVE ---------------- */

async function saveSearch() {

  const payload = {

    player:
      val("commander"),

    x:
      Number(val("x")),

    y:
      Number(val("y")),

    status:
      val("status"),

    code:
      getCode()
  };

  try {

    const res =
      await fetch(
        API_URL,
        {
          method:"POST",
          body:JSON.stringify(
            payload
          )
        }
      );

    const json =
      await res.json();

    if (!json.success) {

      alert(
        json.error ||
        "Save failed"
      );

      return;
    }

    clear("x");
    clear("y");

    hide("submitArea");

    clearHTML(
      "checkResult"
    );

    await loadData();

  } catch (e) {

    console.error(e);

    alert("Save failed");
  }
}

/* ---------------- RENDER ---------------- */

function renderAll() {

  renderStats();
  renderLeaders();
  renderRecent();
  renderRecentFinds();
  renderSuggested();
}

/* ---------------- STATS ---------------- */

function renderStats() {

  const found =
    searches.filter(
      s => s.status === "found"
    ).length;

  const empty =
    searches.filter(
      s => s.status === "empty"
    ).length;

  setHTML("stats", `

    <div class="stat">
      <div class="statValue">
        ${searches.length}
      </div>
      <div class="statLabel">
        Searches
      </div>
    </div>

    <div class="stat">
      <div class="statValue">
        ${found}
      </div>
      <div class="statLabel">
        Found
      </div>
    </div>

    <div class="stat">
      <div class="statValue">
        ${empty}
      </div>
      <div class="statLabel">
        Empty
      </div>
    </div>

  `);
}

/* ---------------- LEADERS ---------------- */

function renderLeaders() {

  const el =
    document.getElementById(
      "leaders"
    );

  if (!el) return;

  const players = {};

  searches.forEach(s => {

    const name =
      (s.player ||
       "Unknown").trim();

    if (!players[name]) {

      players[name] = {

        searches:0,
        founds:0
      };
    }

    players[name].searches++;

    if (
      s.status === "found"
    ) {
      players[name].founds++;
    }
  });

  const list =
    Object.entries(players);

  if (!list.length) {

    el.innerHTML =
      "No data";

    return;
  }

  const topSearches =
    [...list].sort(
      (a,b)=>
      b[1].searches -
      a[1].searches
    )[0];

  const topFounds =
    [...list].sort(
      (a,b)=>
      b[1].founds -
      a[1].founds
    )[0];

  el.innerHTML = `

    <div class="leaderRow">
      <div>
        Most Searches<br>
        <small>${topSearches[0]}</small>
      </div>
      <div class="leaderValue">
        ${topSearches[1].searches}
      </div>
    </div>

    <div class="leaderRow">
      <div>
        Most Finds<br>
        <small>${topFounds[0]}</small>
      </div>
      <div class="leaderValue">
        ${topFounds[1].founds}
      </div>
    </div>

  `;
}

/* ---------------- RECENT ---------------- */

function renderRecent() {

  const el =
    document.getElementById(
      "recentSearches"
    );

  if (!el) return;

  const recent =
    searches
      .slice()
      .reverse()
      .slice(
        0,
        recentSearchLimit
      );

  el.innerHTML =
    recent.map(s => `

      <div class="searchCard">

        <div>
          (${s.x}, ${s.y})<br>
          <small>
            ${s.player || "Unknown"}
          </small>
        </div>

        <div class="
          badge
          badge-${s.status}
        ">
          ${s.status}
        </div>

      </div>

    `).join("");

  if (
    searches.length >
    recentSearchLimit
  ) {

    el.innerHTML += `
      <button
        class="moreBtn"
        onclick="showMoreRecent()">
        Show More
      </button>
    `;
  }
}

function showMoreRecent() {

  recentSearchLimit += 25;

  renderRecent();
}

window.showMoreRecent =
  showMoreRecent;

/* ---------------- FINDS ---------------- */

function renderRecentFinds() {

  const el =
    document.getElementById(
      "recentFinds"
    );

  if (!el) return;

  const finds =
    searches
      .filter(
        s =>
        s.status === "found"
      )
      .slice()
      .reverse()
      .slice(
        0,
        recentFindLimit
      );

  el.innerHTML =
    finds.map(s => `

      <div class="searchCard">

        <div>
          (${s.x}, ${s.y})<br>
          <small>
            ${s.player || "Unknown"}
          </small>
        </div>

        <div class="
          badge
          badge-found
        ">
          FOUND
        </div>

      </div>

    `).join("");
}

/* ---------------- SUGGESTED ---------------- */

function renderSuggested() {

  const el =
    document.getElementById(
      "suggestedLocations"
    );

  if (!el) return;

  const filter =
    val("suggestionFilter") ||
    "unchecked";

  let list =
    suggestions;

  if (
    filter !== "all"
  ) {

    list =
      list.filter(
        s =>
        s.status === filter
      );
  }

  if (!list.length) {

    el.innerHTML =
      `<div class="warning">
        No matching suggestions
      </div>`;

    return;
  }

  const visible =
    list.slice(
      0,
      suggestionLimit
    );

  el.innerHTML =
    visible.map(s => `

      <div class="searchCard">

        <div>
          (${s.x}, ${s.y})<br>
          <small>
            Level ${s.level ?? "?"}
          </small>
        </div>

        <div class="
          badge
          badge-${s.status}
        ">
          ${s.status}
        </div>

      </div>

    `).join("");

  if (
    list.length >
    suggestionLimit
  ) {

    el.innerHTML += `
      <button
        class="moreBtn"
        onclick="showMoreSuggestions()">
        Show More
      </button>
    `;
  }
}

function showMoreSuggestions() {

  suggestionLimit += 50;

  renderSuggested();
}

window.showMoreSuggestions =
  showMoreSuggestions;

/* ---------------- HELPERS ---------------- */

function val(id) {
  return document.getElementById(id)?.value || "";
}

function setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

function clear(id) {
  const el = document.getElementById(id);
  if (el) el.value = "";
}

function clearHTML(id) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = "";
}

function show(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "block";
}

function hide(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
}
