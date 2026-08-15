let supa;
let ads = [];
let config = JSON.parse(localStorage.getItem('supa_config')) || { url: '', key: '' };

const log = (msg, isError = false) => {
    const el = document.getElementById('logs');
    if (el) {
        const color = isError ? 'red' : '#3ecf8e';
        el.innerHTML += `<div style="color: ${color}">[${new Date().toLocaleTimeString()}] ${msg}</div>`;
        el.scrollTop = el.scrollHeight;
    }
};

// Start initialization
async function init() {
    if (!config.url || !config.key) {
        log("System: No configuration found. Please go to Settings.", true);
        switchView('settings');
        return;
    }

    try {
        log("System: Initializing Supabase client...");
        supa = supabase.createClient(config.url, config.key);
        
        log("System: Fetching ads from database...");
        await fetchAds();
        
        document.getElementById('db-status').innerText = "Database: Connected";
        document.getElementById('db-status').style.color = "#3ecf8e";
        
        renderAds();
        renderDashboard();
        renderIntegration();
        log("System: All systems online.");
    } catch (err) {
        log("CRITICAL ERROR: " + err.message, true);
        document.getElementById('db-status').innerText = "Database: Error";
        document.getElementById('db-status').style.color = "red";
    }
}

async function fetchAds() {
    // Try to select from the 'ads' table
    const { data, error } = await supa.from('ads').select('*').order('created_at', { ascending: false });
    
    if (error) {
        throw new Error(`Supabase Error: ${error.message} (Check if 'ads' table exists)`);
    }
    
    ads = data || [];
    log(`System: Found ${ads.length} ads in database.`);
}

function renderAds() {
    const list = document.getElementById('ads-list');
    if (!list) return;
    list.innerHTML = ads.map(ad => `
        <tr>
            <td><strong>${ad.name}</strong></td>
            <td>${ad.type}</td>
            <td><code>${ad.slot}</code></td>
            <td>${ad.impressions} / ${ad.clicks}</td>
            <td><button onclick="deleteAd('${ad.id}')" style="color:red; background:none; border:none; cursor:pointer; font-weight:bold;">Delete</button></td>
        </tr>
    `).join('');
}

function renderDashboard() {
    const totalImp = ads.reduce((acc, ad) => acc + (ad.impressions || 0), 0);
    const totalClk = ads.reduce((acc, ad) => acc + (ad.clicks || 0), 0);
    document.getElementById('total-imp').innerText = totalImp;
    document.getElementById('total-clk').innerText = totalClk;
    document.getElementById('total-ads').innerText = ads.length;
}

function renderIntegration() {
    const path = window.location.href.replace('index.html', '') + 'ad-loader.js';
    document.getElementById('loader-code').innerText = `<script src="${path}"></script>`;
}

// Settings logic
function saveSettings() {
    const url = document.getElementById('supa-url').value.trim();
    const key = document.getElementById('supa-key').value.trim();
    if (!url || !key) {
        alert("Please fill in both fields");
        return;
    }
    localStorage.setItem('supa_config', JSON.stringify({ url, key }));
    log("Settings: Configuration saved. Reloading...");
    window.location.reload();
}

// Navigation Logic
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.onclick = () => {
            const viewId = item.dataset.view;
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            
            document.getElementById(`view-${viewId}`).classList.add('active');
            item.classList.add('active');
        };
    });
}

function switchView(viewId) {
    const item = document.querySelector(`[data-view="${viewId}"]`);
    if (item) item.click();
}

// Global modal toggle
window.showModal = (show) => {
    document.getElementById('modal').style.display = show ? 'flex' : 'none';
};

// Form submission
document.getElementById('ad-form').onsubmit = async (e) => {
    e.preventDefault();
    log("System: Publishing new ad...");
    
    const newAd = {
        name: document.getElementById('ad-name').value,
        type: document.getElementById('ad-type').value,
        slot: document.getElementById('ad-slot').value.toUpperCase(),
        dest_url: document.getElementById('ad-dest').value,
        media_url: document.getElementById('ad-media').value,
        expiry: document.getElementById('ad-expiry').value || null
    };

    const { error } = await supa.from('ads').insert([newAd]);
    if (error) {
        log("Error adding ad: " + error.message, true);
        alert(error.message);
    } else {
        log("System: Ad published successfully.");
        showModal(false);
        await init();
    }
};

async function deleteAd(id) {
    if (!confirm("Delete this ad?")) return;
    const { error } = await supa.from('ads').delete().eq('id', id);
    if (error) log("Error deleting: " + error.message, true);
    await init();
}

// Run on start
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    init();
});
