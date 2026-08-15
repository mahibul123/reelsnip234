/**
 * AdPush CMS - Professional Logic (Updated for Debugging)
 */

let state = { ads: [], analytics: { impressions: 0, clicks: 0 }, _sha: null };
let config = JSON.parse(localStorage.getItem('ad_push_config')) || { token: '', repo: '' };

document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    if (config.token && config.repo) {
        syncDatabase();
    } else {
        switchView('settings');
    }
});

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

async function syncDatabase() {
    const statusEl = document.getElementById('connection-status');
    statusEl.innerText = "Connecting...";
    statusEl.style.color = "#f59e0b";

    // CLEAN THE INPUTS (Remove spaces)
    const cleanRepo = config.repo.trim();
    const cleanToken = config.token.trim();

    const url = `https://api.github.com/repos/${cleanRepo}/contents/db.json`;
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 
                'Authorization': `token ${cleanToken}`, 
                'Accept': 'application/vnd.github.v3+json',
                'Cache-Control': 'no-cache'
            }
        });

        if (response.status === 404) {
            throw new Error("File 'db.json' not found in this repo. Please create it first.");
        } else if (response.status === 401) {
            throw new Error("Invalid Token. Your ghp_... token is wrong or expired.");
        } else if (!response.ok) {
            throw new Error("GitHub Error: " + response.statusText);
        }

        const data = await response.json();
        state._sha = data.sha;
        state = { ...state, ...JSON.parse(atob(data.content)) };

        statusEl.innerText = "Connected";
        statusEl.style.color = "#10b981";
        log("System: Successfully connected to GitHub.");
        renderDashboard();
    } catch (err) {
        statusEl.innerText = "Sync Failed";
        statusEl.style.color = "#ef4444";
        log("Error: " + err.message);
        
        // Detailed Alert
        alert("❌ CONNECTION ERROR:\n" + err.message + "\n\n1. Disable Ad-blockers\n2. Check your Token permissions\n3. Ensure db.json exists");
    }
}

async function saveToGitHub() {
    const url = `https://api.github.com/repos/${config.repo.trim()}/contents/db.json`;
    const body = {
        message: "Update Ads: " + new Date().toLocaleString(),
        content: btoa(JSON.stringify({ ads: state.ads, analytics: state.analytics }, null, 2)),
        sha: state._sha
    };

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Authorization': `token ${config.token.trim()}` },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            const result = await response.json();
            state._sha = result.content.sha;
            log("Database: Changes saved to GitHub.");
        } else {
            const errData = await response.json();
            alert("Save Failed: " + errData.message);
        }
    } catch (e) {
        alert("Error saving: " + e.message);
    }
}

function renderDashboard() {
    document.getElementById('count-impressions').innerText = state.analytics.impressions.toLocaleString();
    document.getElementById('count-clicks').innerText = state.analytics.clicks.toLocaleString();
    document.getElementById('count-active').innerText = state.ads.length;
    const ctr = state.analytics.impressions > 0 ? ((state.analytics.clicks / state.analytics.impressions) * 100).toFixed(2) : 0;
    document.getElementById('count-ctr').innerText = ctr + "%";
}

function renderAdsList() {
    const list = document.getElementById('ads-list');
    list.innerHTML = state.ads.map(ad => `
        <tr>
            <td><strong>${ad.name}</strong></td>
            <td><span class="badge">${ad.type.toUpperCase()}</span></td>
            <td><code>${ad.slot}</code></td>
            <td><span style="color:#10b981;">● Active</span></td>
            <td>${ad.expiry || 'Permanent'}</td>
            <td><button onclick="deleteAd('${ad.id}')" class="btn-del">Delete</button></td>
        </tr>
    `).join('');
}

function renderIntegration() {
    const path = window.location.href.replace('index.html', '') + 'ad-loader.js';
    document.getElementById('code-loader').innerText = `<script src="${path}"></script>`;
}

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

function saveConfig() {
    const t = document.getElementById('gh-token').value.trim();
    const r = document.getElementById('gh-repo').value.trim();
    if(!t || !r) return alert("Fill both fields!");
    config = { token: t, repo: r };
    localStorage.setItem('ad_push_config', JSON.stringify(config));
    syncDatabase();
}

function toggleModal(id, show) { document.getElementById(id).style.display = show ? 'flex' : 'none'; }
function log(msg) {
    const el = document.getElementById('system-logs');
    if(el) {
        el.innerHTML += `<div>[${new Date().toLocaleTimeString()}] ${msg}</div>`;
        el.scrollTop = el.scrollHeight;
    }
}
