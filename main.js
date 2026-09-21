let appList = [];
let isEditMode = false;
let currentEditId = null;

// --- ĐA NGÔN NGỮ (TỰ ĐỘNG PHÁT HIỆN & FALLBACK) ---
async function loadTranslations() {
    // Lấy mã ngôn ngữ của hệ thống (VD: vi-VN, en-US)
    const userLang = navigator.language || navigator.userLanguage;
    
    try {
        // Thử tải file ngôn ngữ theo hệ thống từ thư mục Language/
        const res = await fetch(`Language/${userLang}.json`);
        if (!res.ok) throw new Error("Language file not found");
        applyTranslations(await res.json());
    } catch (e) {
        console.warn(`Không tìm thấy Language/${userLang}.json, tự động Fallback về en-GB`);
        try {
            // Fallback về en-GB.json nếu không tìm thấy
            const fallbackRes = await fetch(`Language/en-GB.json`);
            if (fallbackRes.ok) {
                applyTranslations(await fallbackRes.json());
            }
        } catch (err) {
            console.error("Lỗi: Không tìm thấy cả file fallback en-GB.json", err);
        }
    }
}

function applyTranslations(translations) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[key]) {
            el.textContent = translations[key];
        }
    });
}

// --- INIT LƯU TRỮ APP ---
async function loadAppsData() {
    const local = localStorage.getItem('qal_apps');
    if (local && local !== "[]") {
        appList = JSON.parse(local);
        renderApps();
    } else {
        // Tải từ JSON mặc định nếu có
        try {
            const res = await fetch('System/appios.json');
            if(res.ok) {
                const data = await res.json();
                appList = Object.keys(data).map(key => ({
                    id: key, name: data[key].Name, icon: data[key].icon
                }));
                saveApps(); 
            }
        } catch (e) { 
            console.warn("Khởi chạy lần đầu: Kho trống"); 
        }
        renderApps(); // Chạy render để hiển thị nút + nếu mảng rỗng
    }
}

function saveApps() { 
    localStorage.setItem('qal_apps', JSON.stringify(appList)); 
}

// --- RENDER GIAO DIỆN KHUNG APP & NÚT THÊM (+) ---
function renderApps() {
    const grid = document.getElementById('app-grid');
    grid.innerHTML = '';
    
    appList.slice(0, 24).forEach(app => {
        const btn = document.createElement('button');
        btn.className = 'app-item';
        
        const icon = document.createElement('img');
        
        // Xử lý đường dẫn Icon offline & online
        if (app.icon.startsWith('http')) {
            icon.src = app.icon;
        } else {
            // Lấy tên file gốc (bỏ qua các thư mục như systemapp/ cũ)
            const fileName = app.icon.split('/').pop();
            icon.src = `icon/${fileName}`;
        }
        
        // Fallback: nếu sai tên ảnh trong json, thử gọi tên App
        icon.onerror = function() { 
            this.onerror = () => { this.src = 'image/placeholder.png'; }; // Nếu vẫn lỗi thì hiện placeholder
            this.src = `icon/${app.name}.png`; 
        };
        
        const title = document.createElement('span');
        title.textContent = app.name;
        
        btn.appendChild(icon);
        btn.appendChild(title);
        btn.onclick = () => handleAppClick(app);
        grid.appendChild(btn);
    });

    // Render nút Thêm (+) nếu chưa đủ 24 app
    if (appList.length < 24) {
        const addBtn = document.createElement('button');
        addBtn.className = 'app-item add-app-btn';
        
        const addIconBox = document.createElement('div');
        addIconBox.className = 'add-icon-box';
        addIconBox.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#007aff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
        
        const addTitle = document.createElement('span');
        addTitle.setAttribute('data-i18n', 'add_app');
        addTitle.textContent = "Thêm"; // Sẽ bị ghi đè bởi i18n nếu có

        addBtn.appendChild(addIconBox);
        addBtn.appendChild(addTitle);
        
        addBtn.onclick = () => {
            if(!isEditMode) toggleModal('store-modal', true);
        };
        grid.appendChild(addBtn);
    }
    
    grid.classList.toggle('edit-mode', isEditMode);
}

// --- LOGIC CLICK APP (CHẠY / XOÁ / SỬA TÊN) ---
function handleAppClick(app) {
    if (!isEditMode) {
        // Mở app qua shortcut
        const shortcutUrl = `shortcuts://run-shortcut?name=Open%20App%20Launcher&input=text&text=${encodeURIComponent(app.id)}`;
        window.location.href = shortcutUrl;
    } else {
        // Chế độ Edit
        if(confirm(`Bạn muốn xoá ${app.name}?\nNhấn OK để Xoá, Cancel để Đổi Tên.`)) {
            appList = appList.filter(a => a.id !== app.id);
            saveApps(); 
            renderApps();
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
                saveApps(); 
                renderApps();
                toggleModal('store-modal', false);
            };
            resultsContainer.appendChild(div);
        });
    } catch (e) { 
        resultsContainer.innerHTML = '<p>Lỗi kết nối API.</p>'; 
    }
};

// --- CHẾ ĐỘ EDIT ---
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
        saveApps(); 
        renderApps();
    }
    toggleModal('rename-modal', false);
};

document.getElementById('btn-close-rename').onclick = () => toggleModal('rename-modal', false);

// --- ĐIỀU KHIỂN MODAL ---
function toggleModal(id, show) {
    const modal = document.getElementById(id);
    if (show) modal.classList.remove('hidden'); 
    else modal.classList.add('hidden');
}

// Gắn sự kiện tắt bật Modal
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

// Init khi tải xong trang
document.addEventListener('DOMContentLoaded', () => { 
    // Dùng Promise.all để gọi cùng lúc
    Promise.all([loadTranslations(), loadAppsData()]).then(() => {
        // Cập nhật lại UI sau khi có ngôn ngữ phòng trường hợp nút thêm (+) đã render bằng tiếng Việt mặc định
        applyTranslations(document.querySelectorAll('[data-i18n]')); 
    });
});