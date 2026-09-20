let appList = [];
let isEditMode = false;
let currentEditId = null;

// --- INIT LƯU TRỮ APP ---
async function loadAppsData() {
    const local = localStorage.getItem('qal_apps');
    if (local) {
        appList = JSON.parse(local);
        renderApps();
    } else {
        try {
            const res = await fetch('System/appios.json');
            const data = await res.json();
            appList = Object.keys(data).map(key => ({
                id: key, name: data[key].Name, icon: data[key].icon
            }));
            saveApps(); renderApps();
        } catch (e) { console.error("Missing appios.json", e); }
    }
}

function saveApps() { localStorage.setItem('qal_apps', JSON.stringify(appList)); }

// --- RENDER GIAO DIỆN KHUNG APP ---
function renderApps() {
    const grid = document.getElementById('app-grid');
    grid.innerHTML = '';
    
    appList.slice(0, 24).forEach(app => {
        const btn = document.createElement('button');
        btn.className = 'app-item';
        
        const icon = document.createElement('img');
        icon.src = app.icon; 
        icon.onerror = () => { icon.src = 'image/placeholder.png'; };
        
        const title = document.createElement('span');
        title.textContent = app.name;
        
        btn.appendChild(icon);
        btn.appendChild(title);
        
        btn.onclick = () => handleAppClick(app);
        grid.appendChild(btn);
    });

    if (appList.length < 24) {
        const addBtn = document.createElement('button');
        addBtn.className = 'app-item add-app-btn';
        addBtn.innerHTML = `<img src="image/icon_add.png" style="content: url('data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'%23007aff\\'><path d=\\'M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z\\'/></svg>');"><span data-i18n="add_app">Thêm</span>`;
        addBtn.onclick = () => {
            if(!isEditMode) toggleModal('store-modal', true);
        };
        grid.appendChild(addBtn);
    }
    
    if (grid.classList.contains('edit-mode') !== isEditMode) {
        grid.classList.toggle('edit-mode', isEditMode);
    }
}

// --- LOGIC CLICK APP (CHẠY / XOÁ / SỬA TÊN) ---
function handleAppClick(app) {
    if (!isEditMode) {
        const shortcutUrl = `shortcuts://run-shortcut?name=Open%20App%20Launcher&input=text&text=${encodeURIComponent(app.id)}`;
        window.location.href = shortcutUrl;
    } else {
        // Chế độ sửa: Hỏi xoá hoặc đổi tên
        if(confirm(`Bạn muốn xoá ${app.name}?\nNhấn OK để Xoá, Cancel để Đổi Tên.`)) {
            appList = appList.filter(a => a.id !== app.id);
            saveApps(); renderApps();
        } else {
            currentEditId = app.id;
            document.getElementById('input-rename').value = app.name;
            toggleModal('rename-modal', true);
        }
    }
}

// --- TÌM KIẾM iTUNES API ---
document.getElementById('btn-search-app').onclick = async () => {
    const query = document.getElementById('input-search-app').value;
    const region = document.getElementById('select-store-region').value;
    if(!query) return;
    
    const resultsContainer = document.getElementById('store-results');
    resultsContainer.innerHTML = '<p>Đang tìm...</p>';
    
    try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&country=${region}&entity=software&limit=15`);
        const data = await res.json();
        resultsContainer.innerHTML = '';
        
        data.results.forEach(app => {
            const div = document.createElement('button');
            div.className = 'menu-item';
            div.innerHTML = `<img src="${app.artworkUrl100}"> <span>${app.trackName}</span>`;
            div.onclick = () => {
                if (appList.length >= 24) return alert("Đã đầy 24 ứng dụng!");
                if (appList.find(a => a.id === app.bundleId)) return alert("App đã tồn tại!");
                
                appList.push({ id: app.bundleId, name: app.trackName, icon: app.artworkUrl100 });
                saveApps(); renderApps();
                toggleModal('store-modal', false);
            };
            resultsContainer.appendChild(div);
        });
    } catch (e) { resultsContainer.innerHTML = '<p>Lỗi kết nối API.</p>'; }
};

// --- CHẾ ĐỘ EDIT (XOÁ / ĐỔI TÊN) ---
document.getElementById('btn-edit-mode').onclick = () => {
    isEditMode = true;
    toggleModal('setting-modal', false);
    document.getElementById('edit-bar').classList.remove('hidden');
    renderApps();
};
document.getElementById('btn-exit-edit').onclick = () => {
    isEditMode = false;
    document.getElementById('edit-bar').classList.add('hidden');
    renderApps();
};

document.getElementById('btn-save-rename').onclick = () => {
    const newName = document.getElementById('input-rename').value;
    if (currentEditId && newName) {
        appList = appList.map(a => a.id === currentEditId ? {...a, name: newName} : a);
        saveApps(); renderApps();
    }
    toggleModal('rename-modal', false);
};
document.getElementById('btn-close-rename').onclick = () => toggleModal('rename-modal', false);

// --- MODAL CONTROLS & I18N ---
function toggleModal(id, show) {
    const modal = document.getElementById(id);
    if (show) modal.classList.remove('hidden'); else modal.classList.add('hidden');
}

document.getElementById('btn-setting').onclick = () => toggleModal('setting-modal', true);
document.getElementById('btn-close-setting').onclick = () => toggleModal('setting-modal', false);
document.getElementById('btn-close-store').onclick = () => toggleModal('store-modal', false);
document.getElementById('btn-info').onclick = () => { toggleModal('setting-modal', false); toggleModal('info-modal', true); };
document.getElementById('btn-close-info').onclick = () => toggleModal('info-modal', false);
document.getElementById('btn-about').onclick = () => { toggleModal('info-modal', false); toggleModal('about-popup', true); };
document.getElementById('btn-close-about').onclick = () => toggleModal('about-popup', false);

async function loadTranslations() {
    const lang = navigator.language.startsWith('vi') ? 'vi-VN' : 'en-US';
    try {
        const res = await fetch(`${lang}.json`);
        const trans = await res.json();
        document.querySelectorAll('[data-i18n]').forEach(el => {
            if (trans[el.dataset.i18n]) el.textContent = trans[el.dataset.i18n];
        });
    } catch(e) {}
}

document.addEventListener('DOMContentLoaded', () => { loadTranslations(); loadAppsData(); });
