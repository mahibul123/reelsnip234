/**
 * AdPush CMS Logic
 * Built with Vanilla JavaScript
 */

// 1. STATE & CONFIG
let state = { ads: [], advertisers: [], analytics: { impressions: 0, clicks: 0 }, _sha: null };
let config = JSON.parse(localStorage.getItem('ad_push_config')) || { token: '', repo: '' };

// 2. INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    if (config.token && config.repo) {
        fetchDatabase();
    } else {
        switchView('settings');
        updateStatus('No Connection', '#ef4444');
    }
});

// 3. NAVIGATION ENGINE
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.getAttribute('data-view');
            switchView(view);
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.add('active');
    if(viewId === 'dashboard') renderDashboard();
    if(viewId === 'ads') renderAdsTable();
    if(viewId === 'settings') renderSettings();
}

// 4. GITHUB API SYNC (Database)
async function fetchDatabase() {
    updateStatus('Connecting...', '#f59e0b');
    const url = `https://api.github.com/repos/${config.repo}/contents/db.json`;
    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `token ${config.token}`, 'Accept': 'application/vnd.github.v3+json' }
        });
        const data = await response.json();
        state._sha = data.sha;
        const decodedContent = JSON.parse(atob(data.content));
        state = { ...state, ...decodedContent };
        
        updateStatus('Connected', '#10b981');
        renderDashboard();
    } catch (error) {
        updateStatus('Sync Error', '#ef4444');
        console.error(error);
    }
}

async function saveDatabase() {
    updateStatus('Saving...', '#3b82f6');
    const url = `https://api.github.com/repos/${config.repo}/contents/db.json`;
    const body = {
        message: "CMS Update: Ad Modification",
        content: btoa(JSON.stringify({
            ads: state.ads,
            advertisers: state.advertisers,
            analytics: state.analytics
        })),
        sha: state._sha
    };

    const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Authorization': `token ${config.token}` },
        body: JSON.stringify(body)
    });

    if (response.ok) {
        const data = await response.json();
        state._sha = data.content.sha;
        updateStatus('Connected', '#10b981');
    }
}

// 5. RENDERING DATA
function renderDashboard() {
    document.getElementById('stat-impressions').innerText = state.analytics.impressions.toLocaleString();
    document.getElementById('stat-clicks').innerText = state.analytics.clicks.toLocaleString();
    document.getElementById('stat-active').innerText = state.ads.filter(a => a.status === 'active').length;
    
    const ctr = state.analytics.impressions > 0 
        ? ((state.analytics.clicks / state.analytics.impressions) * 100).toFixed(2) 
        : 0;
    document.getElementById('stat-ctr').innerText = ctr + '%';
}

function renderAdsTable() {
    const tbody = document.getElementById('ads-table-body');
    tbody.innerHTML = state.ads.map(ad => `
        <tr>
            <td><strong>${ad.name}</strong></td>
            <td>${ad.type.toUpperCase()}</td>
            <td><code>${ad.slot}</code></td>
            <td><span class="status-pill" style="background:#dcfce7; color:#166534">Active</span></td>
            <td>${ad.start || 'N/A'} - ${ad.end || 'N/A'}</td>
            <td>
                <button class="btn" onclick="deleteAd('${ad.id}')">❌</button>
            </td>
        </tr>
    `).join('');
}

function renderSettings() {
    document.getElementById('gh-token').value = config.token;
    document.getElementById('gh-repo').value = config.repo;
    const loaderPath = window.location.href.replace('index.html', '') + 'ad-loader.js';
    document.getElementById('integration-code').innerText = `<script src="${loaderPath}"></script>`;
}

// 6. AD MANAGEMENT ACTIONS
document.getElementById('ad-form').onsubmit = async (e) => {
    e.preventDefault();
    const newAd = {
        id: 'ad_' + Date.now(),
        name: document.getElementById('ad-name').value,
        type: document.getElementById('ad-type').value,
        slot: document.getElementById('ad-slot').value,
        url: document.getElementById('ad-url').value,
        media: document.getElementById('ad-media').value,
        start: document.getElementById('ad-start').value,
        end: document.getElementById('ad-end').value,
        status: 'active',
        weight: 100
    };
    state.ads.push(newAd);
    await saveDatabase();
    closeModal('ad-modal');
    renderAdsTable();
};

async function deleteAd(id) {
    if(confirm('Remove this ad push?')) {
        state.ads = state.ads.filter(a => a.id !== id);
        await saveDatabase();
        renderAdsTable();
    }
}

function saveSettings() {
    config.token = document.getElementById('gh-token').value;
    config.repo = document.getElementById('gh-repo').value;
    localStorage.setItem('ad_push_config', JSON.stringify(config));
    fetchDatabase();
}

// 7. UTILS
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function updateStatus(text, color) {
    const el = document.getElementById('connection-status');
    el.innerText = text;
    el.style.background = color + '22';
    el.style.color = color;
}
async function fetchDatabase() {
    updateStatus('Connecting...', '#f59e0b');
    const url = `https://api.github.com/repos/${config.repo}/contents/db.json`;
    
    try {
        const response = await fetch(url, {
            headers: { 
                'Authorization': `token ${config.token}`, 
                'Accept': 'application/vnd.github.v3+json',
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message);
        }

        const data = await response.json();
        state._sha = data.sha;
        const decodedContent = JSON.parse(atob(data.content));
        state = { ...state, ...decodedContent };
        
        updateStatus('Connected', '#10b981');
        alert("Successfully connected to GitHub!");
        renderDashboard();
    } catch (error) {
        updateStatus('Sync Error', '#ef4444');
        alert("GitHub Error: " + error.message);
        console.error("Full Error:", error);
    }
}
