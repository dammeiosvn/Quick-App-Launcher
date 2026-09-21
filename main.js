let appList = [];
let offlineApps = []; // Chứa danh sách app lấy từ System/appios.json
let isEditMode = false;
let currentEditId = null;
let currentTranslations = {};

// --- ĐA NGÔN NGỮ (TỰ ĐỘNG PHÁT HIỆN & FALLBACK) ---
async function loadTranslations() {
    const userLang = navigator.language || navigator.userLanguage;
    try {
        const res = await fetch(`Language/${userLang}.json`);
        if (!res.ok) throw new Error("Không tìm thấy file ngôn ngữ");
        currentTranslations = await res.json();
    } catch (e) {
        console.warn(`Fallback về en-GB do không có file Language/${userLang}.json`);
        try {
            const fallbackRes = await fetch(`Language/en-GB.json`);
            if (fallbackRes.ok) currentTranslations = await fallbackRes.json();
        } catch (err) { console.error("Lỗi Fallback", err); }
    }
    applyTranslations(document);
}

function applyTranslations(rootElement) {
    rootElement.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (currentTranslations[key]) el.textContent = currentTranslations[key];
    });
}

// --- INIT LƯU TRỮ APP (OFFLINE & ONLINE) ---
async function loadAppsData() {
    // 1. Tải danh sách App Offline từ thư mục System để đưa vào Kho
    try {
        const res = await fetch('System/appios.json');
        if (res.ok) {
            const data = await res.json();
            offlineApps = Object.keys(data).map(key => ({
                id: key, name: data[key].Name, icon: data[key].icon
            }));
        }
    } catch (e) { console.warn("Không tìm thấy System/appios.json"); }

    // 2. Tải danh sách App sếp đã thêm vào màn hình chính
    const local = localStorage.getItem('qal_apps');
    if (local && local !== "[]") {
        appList = JSON.parse(local); 
    } else {
        appList = []; // Lần chạy đầu tiên: mảng rỗng (Chắc chắn sẽ hiện dấu +)
    }
    renderApps();
}

function saveApps() {
    localStorage.setItem('qal_apps', JSON.stringify(appList));
}

// --- RENDER GIAO DIỆN KHUNG APP & NÚT THÊM (+) ---
function renderApps() {
    const grid = document.getElementById('app-grid');
    grid.innerHTML = ''; // Làm sạch khung
    
    // Render các app đã có
    appList.slice(0, 24).forEach(app => {
        const btn = document.createElement('button');
        btn.className = 'app-item';
        
        const icon = document.createElement('img');
        // Logic đọc icon offline/online chuẩn xác
        if (app.icon.startsWith('http')) {
            icon.src = app.icon;
        } else {
            const fileName = app.icon.split('/').pop();
            icon.src = `icon/${fileName}`;
        }
        
        // Fallback icon nếu file lỗi hoặc gọi sai tên
        icon.onerror = function() { 
            this.onerror = () => { this.src = 'image/placeholder.png'; }; 
            this.src = `icon/${app.name}.png`; 
        };
        
        const title = document.createElement('span');
        title.textContent = app.name;
        
        btn.appendChild(icon);
        btn.appendChild(title);
        btn.onclick = () => handleAppClick(app);
        grid.appendChild(btn);
    });

    // Render nút Thêm (+) thông minh: Luôn hiện nếu dưới 24 app, kể cả khi 0 app
    if (appList.length < 24) {
        const addBtn = document.createElement('button');
        addBtn.className = 'app-item add-app-btn';
        
        const addIconBox = document.createElement('div');
        addIconBox.className = 'add-icon-box';
        // Icon + màu xanh dương chuẩn Apple
        addIconBox.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#007aff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
        
        const addTitle = document.createElement('span');
        addTitle.textContent = currentTranslations['add_app'] || "Thêm";

        addBtn.appendChild(addIconBox);
        addBtn.appendChild(addTitle);
        
        // Bấm thêm app bất cứ lúc nào
        addBtn.onclick = () => openStore();
        grid.appendChild(addBtn);
    }
    
    // Kích hoạt class CSS để rung icon nếu đang bật chế độ sửa
    grid.classList.toggle('edit-mode', isEditMode);
}

// --- LOGIC CLICK APP (CHẠY / XOÁ / SỬA TÊN) ---
function handleAppClick(app) {
    if (!isEditMode) {
        // Chạy qua phím tắt
        const shortcutUrl = `shortcuts://run-shortcut?name=Open%20App%20Launcher&input=text&text=${encodeURIComponent(app.id)}`;
        window.location.href = shortcutUrl;
    } else {
        // Chế độ Edit: Hỏi Xoá hay Đổi Tên
        if(confirm(`Bạn muốn xoá ${app.name}?\nNhấn OK để Xoá, Cancel để Đổi Tên.`)) {
            appList = appList.filter(a => a.id !== app.id);
            saveApps();
            // Lập tức gọi lại render để chèn nút + vào đúng vị trí trống
            renderApps();
        } else {
            currentEditId = app.id;
            document.getElementById('input-rename').value = app.name;
            toggleModal('rename-modal', true);
        }
    }
}

// --- BẬT / TẮT CHẾ ĐỘ SỬA TRANG ---
document.getElementById('btn-enter-edit-mode').onclick = () => {
    isEditMode = true; 
    toggleModal('setting-modal', false);
    document.getElementById('btn-done-edit').classList.remove('hidden');
    document.getElementById('btn-setting').classList.add('hidden');
    renderApps();
};

document.getElementById('btn-done-edit').onclick = () => {
    isEditMode = false; 
    document.getElementById('btn-done-edit').classList.add('hidden');
    document.getElementById('btn-setting').classList.remove('hidden');
    renderApps();
};

// --- ĐỔI TÊN APP ---
document.getElementById('btn-save-rename').onclick = () => {
    const newName = document.getElementById('input-rename').value;
    if (currentEditId && newName) {
        appList = appList.map(a => a.id === currentEditId ? {...a, name: newName} : a);
        saveApps();
        renderApps();
    }
    toggleModal('rename-modal', false);
};
document.getElementById('btn-close-rename').onclick = () => toggleModal('rename-modal', false);

// --- KHO ỨNG DỤNG (OFFLINE & ONLINE) ---
function openStore() {
    toggleModal('store-modal', true);
    renderOfflineStore();
}

function renderOfflineStore() {
    const resultsContainer = document.getElementById('store-results');
    document.getElementById('store-status-text').textContent = "Ứng dụng có sẵn (Offline):";
    resultsContainer.innerHTML = '';
    
    offlineApps.forEach(app => {
        const div = document.createElement('button');
        div.className = 'menu-item';
        
        let iconSrc = app.icon;
        if (!iconSrc.startsWith('http')) {
            const fileName = iconSrc.split('/').pop();
            iconSrc = `icon/${fileName}`;
        }

        div.innerHTML = `<img src="${iconSrc}" onerror="this.src='icon/${app.name}.png'"> <span>${app.name}</span>`;
        div.onclick = () => addAppToGrid(app);
        resultsContainer.appendChild(div);
    });
}

function addAppToGrid(app) {
    if (appList.length >= 24) return alert("Đã đầy 24 ứng dụng!");
    if (appList.find(a => a.id === app.id)) return alert("App đã tồn tại!");
    
    appList.push(app);
    saveApps();
    renderApps();
    toggleModal('store-modal', false);
}

// Tìm kiếm Online API iTunes
document.getElementById('btn-search-app').onclick = async () => {
    const query = document.getElementById('input-search-app').value.trim();
    const region = document.getElementById('select-store-region').value;
    
    // Nếu khung tìm kiếm trống, quay lại list Offline
    if(!query) {
        renderOfflineStore();
        return;
    }
    
    const resultsContainer = document.getElementById('store-results');
    document.getElementById('store-status-text').textContent = "Kết quả từ iTunes API (Online):";
    resultsContainer.innerHTML = '<p style="padding: 10px;">Đang tìm kiếm...</p>';
    
    try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&country=${region}&entity=software&limit=15`);
        const data = await res.json();
        resultsContainer.innerHTML = '';
        
        if(data.results.length === 0) {
            resultsContainer.innerHTML = '<p style="padding: 10px;">Không tìm thấy ứng dụng nào.</p>';
            return;
        }

        data.results.forEach(app => {
            const div = document.createElement('button');
            div.className = 'menu-item';
            div.innerHTML = `<img src="${app.artworkUrl100}"> <span>${app.trackName}</span>`;
            div.onclick = () => addAppToGrid({ id: app.bundleId, name: app.trackName, icon: app.artworkUrl100 });
            resultsContainer.appendChild(div);
        });
    } catch (e) { 
        resultsContainer.innerHTML = '<p style="padding: 10px;">Lỗi kết nối API iTunes.</p>'; 
    }
};

// --- ĐIỀU KHIỂN MODAL CHUNG ---
function toggleModal(id, show) {
    const modal = document.getElementById(id);
    if (show) modal.classList.remove('hidden'); 
    else modal.classList.add('hidden');
}

// Bắt sự kiện tắt bật Modal
document.getElementById('btn-setting').onclick = () => toggleModal('setting-modal', true);
document.getElementById('btn-close-setting').onclick = () => toggleModal('setting-modal', false);
document.getElementById('btn-close-store').onclick = () => toggleModal('store-modal', false);

document.getElementById('btn-info').onclick = () => { 
    toggleModal('setting-modal', false); 
    toggleModal('info-modal', true); 
};
document.getElementById('btn-close-info').onclick = () => toggleModal('info-modal', false);

document.getElementById('btn-about').onclick = () => { 
    toggleModal('info-modal', false); 
    toggleModal('about-popup', true); 
};
document.getElementById('btn-close-about').onclick = () => toggleModal('about-popup', false);

// Init khi tải xong trang (Gắn await để đảm bảo render ĐÚNG thứ tự)
document.addEventListener('DOMContentLoaded', async () => { 
    await loadTranslations();
    await loadAppsData(); 
});