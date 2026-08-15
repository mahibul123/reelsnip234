(async function() {
    // 1. YOUR SUPABASE SETTINGS (Copy from your dashboard)
  const SUPA_URL = "https://your-project-id.supabase.co"; 
    const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; 


    async function loadAds() {
        const slots = document.querySelectorAll('[data-ad-slot]');
        if (slots.length === 0) return;

        // Fetch active ads from Supabase
        const resp = await fetch(`${SUPA_URL}/rest/v1/ads?status=eq.active`, {
            headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}` }
        });
        const ads = await resp.json();

        slots.forEach(container => {
            const slotName = container.getAttribute('data-ad-slot');
            const eligible = ads.filter(a => a.slot === slotName);
            if (eligible.length > 0) {
                const ad = eligible[Math.floor(Math.random() * eligible.length)];
                render(container, ad);
                track(ad.id, 'impressions');
            }
        });
    }

    function render(container, ad) {
        let html = '';
        if (ad.type === 'image') {
            html = `<a href="${ad.dest_url}" target="_blank"><img src="${ad.media_url}" style="width:100%; border-radius:8px;"></a>`;
        } else if (ad.type === 'video') {
            html = `<video src="${ad.media_url}" autoplay muted loop style="width:100%; border-radius:8px;" onclick="window.open('${ad.dest_url}')"></video>`;
        } else {
            html = ad.media_url; // HTML Type
        }
        container.innerHTML = html;
        container.onclick = () => track(ad.id, 'clicks');
    }

    async function track(id, field) {
        // Increment impression or click in Supabase using RPC or PATCH
        // For simplicity in vanilla, we fetch current, then update
        const resp = await fetch(`${SUPA_URL}/rest/v1/ads?id=eq.${id}`, {
            headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}` }
        });
        const data = await resp.json();
        const currentCount = data[0][field];

        await fetch(`${SUPA_URL}/rest/v1/ads?id=eq.${id}`, {
            method: 'PATCH',
            headers: { 
                "apikey": SUPA_KEY, 
                "Authorization": `Bearer ${SUPA_KEY}`,
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            },
            body: JSON.stringify({ [field]: currentCount + 1 })
        });
    }

    loadAds();
})();
