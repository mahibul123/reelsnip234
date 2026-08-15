let supa;
let ads = [];
let config = JSON.parse(localStorage.getItem('supa_config')) || { url: '', key: '' };

// Initialize Supabase
if (config.url && config.key) {
    supa = supabase.createClient(config.url, config.key);
    init();
} else {
    document.querySelector('[data-view="settings"]').click();
}

async function init() {
    await fetchAds();
    document.getElementById('db-status').innerText = "Database: Connected";
    renderAds();
    renderDashboard();
    renderIntegration();
}

async function fetchAds() {
    const { data, error } = await supa.from('ads').select('*').order('created_at', { ascending: false });
    if (error) return console.error(error);
    ads = data;
}

function renderAds() {
    const list = document.getElementById('ads-list');
    list.innerHTML = ads.map(ad => `
        <tr>
            <td><strong>${ad.name}</strong></td>
            <td>${ad.type}</td>
            <td><code>${ad.slot}</code></td>
            <td>${ad.impressions} / ${ad.clicks}</td>
            <td><button onclick="deleteAd('${ad.id}')" style="color:red; background:none; border:none; cursor:pointer;">Delete</button></td>
        </tr>
    `).join('');
}

function renderDashboard() {
    const totalImp = ads.reduce((acc, ad) => acc + ad.impressions, 0);
    const totalClk = ads.reduce((acc, ad) => acc + ad.clicks, 0);
    document.getElementById('total-imp').innerText = totalImp;
    document.getElementById('total-clk').innerText = totalClk;
    document.getElementById('total-ads').innerText = ads.length;
}

function renderIntegration() {
    const path = window.location.href.replace('index.html', '') + 'ad-loader.js';
    document.getElementById('loader-code').innerText = `<script src="${path}"></script>`;
}

// Create Ad
document.getElementById('ad-form').onsubmit = async (e) => {
    e.preventDefault();
    const newAd = {
        name: document.getElementById('ad-name').value,
        type: document.getElementById('ad-type').value,
        slot: document.getElementById('ad-slot').value.toUpperCase(),
        dest_url: document.getElementById('ad-dest').value,
        media_url: document.getElementById('ad-media').value,
        expiry: document.getElementById('ad-expiry').value || null
    };

    const { error } = await supa.from('ads').insert([newAd]);
    if (error) alert(error.message);
    else {
        showModal(false);
        await init();
    }
};

async function deleteAd(id) {
    if (!confirm("Delete this ad?")) return;
    await supa.from('ads').delete().eq('id', id);
    await init();
}

function saveSettings() {
    const url = document.getElementById('supa-url').value.trim();
    const key = document.getElementById('supa-key').value.trim();
    localStorage.setItem('supa_config', JSON.stringify({ url, key }));
    window.location.reload();
}

// Navigation and Modals
document.querySelectorAll('.nav-item').forEach(item => {
    item.onclick = () => {
        document.querySelectorAll('.view, .nav-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        document.getElementById(`view-${item.dataset.view}`).classList.add('active');
    }
});

function showModal(show) { document.getElementById('modal').style.display = show ? 'flex' : 'none'; }
function log(msg) { document.getElementById('logs').innerHTML += `<div>[${new Date().toLocaleTimeString()}] ${msg}</div>`; }
