/**
 * AdPush CMS - Professional Logic
 */

let state = { ads: [], analytics: { impressions: 0, clicks: 0 }, _sha: null };
let config = JSON.parse(localStorage.getItem('ad_push_config')) || { token: '', repo: '' };

// 1. Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    if (config.token && config.repo) {
        syncDatabase();
    } else {
        switchView('settings');
        log("System: Please configure GitHub settings.");
    }
});

// 2. Navigation Logic
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.onclick = () => {
            const view = item.dataset.view;
            switchView(view);
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        };
    });
}

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.add('active');
    if(viewId === 'dashboard') renderDashboard();
    if(viewId === 'ads') renderAdsList();
    if(viewId === 'integration') renderIntegration();
}

// 3. GitHub API (Database) Logic
async function syncDatabase() {
    const statusEl = document.getElementById('connection-status');
    statusEl.innerText = "Connecting...";
    statusEl.style.color = "#f59e0b";

    const url = `https://api.github.com/repos/${config.repo}/contents/db.json?t=${Date.now()}`;
    
    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `token ${config.token}`, 'Accept': 'application/vnd.github.v3+json' }
        });

        if (!response.ok) throw new Error("Invalid Token or Repo");

        const data = await response.json();
        state._sha = data.sha;
        state = { ...state, ...JSON.parse(atob(data.content)) };

        statusEl.innerText = "Connected";
        statusEl.style.color = "#10b981";
        log("Database: Successfully synced with GitHub.");
        renderDashboard();
    } catch (err) {
        statusEl.innerText = "Sync Failed";
        statusEl.style.color = "#ef4444";
        log("Error: " + err.message);
        alert("GitHub Sync Failed. Check Token/Repo/Ad-blocker.");
    }
}

async function saveToGitHub() {
    log("Database: Committing changes to GitHub...");
    const url = `https://api.github.com/repos/${config.repo}/contents/db.json`;
    
    const body = {
        message: "CMS Update: " + new Date().toISOString(),
        content: btoa(JSON.stringify({ ads: state.ads, analytics: state.analytics }, null, 2)),
        sha: state._sha
    };

    const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Authorization': `token ${config.token}` },
        body: JSON.stringify(body)
    });

    if (response.ok) {
        const result = await response.json();
        state._sha = result.content.sha;
        log("Database: Save successful.");
    } else {
        log("Error: Could not save to GitHub.");
    }
}

// 4. Rendering UI
function renderDashboard() {
    document.getElementById('count-impressions').innerText = state.analytics.impressions.toLocaleString();
    document.getElementById('count-clicks').innerText = state.analytics.clicks.toLocaleString();
    document.getElementById('count-active').innerText = state.ads.length;
    
    const ctr = state.analytics.impressions > 0 
        ? ((state.analytics.clicks / state.analytics.impressions) * 100).toFixed(2) 
        : 0;
    document.getElementById('count-ctr').innerText = ctr + "%";
}

function renderAdsList() {
    const list = document.getElementById('ads-list');
    list.innerHTML = state.ads.map(ad => `
        <tr>
            <td><strong>${ad.name}</strong></td>
            <td><span style="font-size:11px; padding:2px 6px; background:#e2e8f0; border-radius:4px;">${ad.type.toUpperCase()}</span></td>
            <td><code>${ad.slot}</code></td>
            <td><span style="color:#10b981; font-weight:600;">● Active</span></td>
            <td>${ad.expiry || 'Permanent'}</td>
            <td>
                <button onclick="deleteAd('${ad.id}')" style="color:#ef4444; border:none; background:none; cursor:pointer;">Delete</button>
            </td>
        </tr>
    `).join('');
}

function renderIntegration() {
    const path = window.location.href.replace('index.html', '') + 'ad-loader.js';
    document.getElementById('code-loader').innerText = `<script src="${path}"></script>`;
}

// 5. Ad Actions
document.getElementById('ad-form').onsubmit = async (e) => {
    e.preventDefault();
    const newAd = {
        id: 'ad_' + Date.now(),
        name: document.getElementById('ad-name').value,
        type: document.getElementById('ad-type').value,
        slot: document.getElementById('ad-slot').value.trim().toUpperCase(),
        dest: document.getElementById('ad-dest').value,
        media: document.getElementById('ad-media').value,
        weight: parseInt(document.getElementById('ad-weight').value),
        expiry: document.getElementById('ad-expiry').value
    };

    state.ads.push(newAd);
    await saveToGitHub();
    toggleModal('ad-modal', false);
    renderAdsList();
};

async function deleteAd(id) {
    if(!confirm("Are you sure?")) return;
    state.ads = state.ads.filter(a => a.id !== id);
    await saveToGitHub();
    renderAdsList();
}

// 6. Settings
function saveConfig() {
    config.token = document.getElementById('gh-token').value.trim();
    config.repo = document.getElementById('gh-repo').value.trim();
    localStorage.setItem('ad_push_config', JSON.stringify(config));
    syncDatabase();
}

// 7. Utilities
function toggleModal(id, show) {
    document.getElementById(id).style.display = show ? 'flex' : 'none';
}

function log(msg) {
    const el = document.getElementById('system-logs');
    el.innerHTML += `<div>[${new Date().toLocaleTimeString()}] ${msg}</div>`;
    el.scrollTop = el.scrollHeight;
}
