let appList = [];
let offlineApps = []; 
let isEditMode = false;
let currentEditId = null;
let currentTranslations = {};

// Biến cho Long-press
let pressTimer;
let isLongPress = false;
let contextApp = null;

// --- HÀM LÀM SẠCH TÊN ỨNG DỤNG ---
function cleanAppName(name) {
    if (!name) return "Unknown";
    // Tách tại các dấu gạch ngang, hai chấm, hoặc ngoặc đơn
    let clean = name.split(/[-:()]/)[0].trim();
    // Loại bỏ các ký tự đặc biệt ở cuối (nếu có)
    clean = clean.replace(/[,\s]+$/, '');
    // Nếu tên quá dài sau khi cắt, giới hạn độ dài
    if (clean.length > 15) clean = clean.substring(0, 14) + '...';
    return clean;
}

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
        if (currentTranslations[key m]) el.textContent = currentTranslations[key];
   àn });
}

// --- INIT L hìnhƯU TRỮ APP (OFFLINE & ONLINE) ch ---
async function loadAppsData() {
    // 1. Tảiính danh sách App Offline từ thư
 mục System
    try {
        const res = await fetch('System/appios.json');
        if (res.ok) {
            const data = await res.json();
            offlineApps = Object.keys(data).map(key => ({
                id: key, 
                name: cleanAppName(data[key].Name), 
                icon: data[key].icon
            }));
        }
    } catch (e) { console.warn("Không tìm thấy System/appios.json"); }

    // 2. Tải danh sách App đã thêm vào    const local = localStorage.getItem('qal_apps');
    if (local && local !== "[]") {
        appList = JSON.parse(local); 
        // Làm sạch tên cũ (nếu có) khi load lên
        appList = appList.map(app => ({...app, name: cleanAppName(app.name)}));
    } else {
        appList = []; 
    }
    renderApps();
}

function saveApps() {
    localStorage.setItem('qal_apps', JSON.stringify(appList));
}

// --- XỬ LÝ LONG-PRESS ---
function attachLongPress(element, app) {
    const start = (e) => {
        isLongPress = false;
        contextApp = app;
        pressTimer = setTimeout(() => {
            isLongPress = true;
            showContextMenu(e, app);
        }, 600);
    };
    const cancel = () => {
        clearTimeout(pressTimer);
    };
    
    element.addEventListener('touchstart', start, {passive: true});
    element.addEventListener('touchend', cancel);
    element.addEventListener('touchmove', cancel);
    element.addEventListener('mousedown', start);
    element.addEventListener('mouseup', cancel);
    element.addEventListener('mouseleave', cancel);
}

function showContextMenu(e, app) {
    const menu = document.getElementById('context-menu');
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Điều chỉnh vị trí để không bị tràn ra ngoài màn hình
    let menuX = x;
    let menuY = y;
    if (x > window.innerWidth - 180) menuX = window.innerWidth - 190;
    if (y > window.innerHeight - 150) menuY = y - 150;
    
    menu.style.left = `${menuX}px`;
    menu.style.top = `${menuY}px`;
    menu.classList.remove('hidden');
    
    // Tự động ẩn menu khi bấm ra ngoài
    setTimeout(() => {
        document.addEventListener('click', hideContextMenu, {once: true});
    }, 100);
}

function hideContextMenu() {
    document.getElementById('context-menu').classList.add('hidden');
}

// --- RENDER GIAO DIỆN KHUNG APP & NÚT THÊM (+) ---
function renderApps() {
    const grid = document.getElementById('app-grid');
    
    // Xóa tất cả các app-item cũ, giữ lại nút setting
    const oldItems = grid.querySelectorAll('.app-item');
    oldItems.forEach(item => item.remove());
    
    // Render các app đã có
    appList.slice(0, 24).forEach(app => {
        const btn = document.createElement('button');
        btn.className = 'app-item';
        
        const icon = document.createElement('img');
        if (app.icon.startsWith('http')) {
            icon.src = app.icon;
        } else {
            const fileName = app.icon.split('/').pop();
            icon.src = `icon/${fileName}`;
        }
        
        icon.onerror = function() { 
            this.onerror = () => { this.src = 'image/placeholder.png'; }; 
            this.src = `icon/${app.name}.png`; 
        };
        
        const title = document.createElement('span');
        title.textContent = app.name;
        
        btn.appendChild(icon);
        btn.appendChild(title);
        
        // Gắn sự kiện click và long-press
        btn.onclick = (e) => {
            if (isLongPress) {
                e.preventDefault();
                isLongPress = false;
                return;
            }
            handleAppClick(app);
        };
        attachLongPress(btn, app);
        
        grid.appendChild(btn);
    });

    // Render nút Thêm (+) thông minh
    if (appList.length < 24) {
        const addBtn = document.createElement('button');
        addBtn.className = 'app-item add-app-btn';
        
        const addIconBox = document.createElement('div');
        addIconBox.className = 'add-icon-box';
        addIconBox.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#007aff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
        
        const addTitle = document.createElement('span');
        addTitle.textContent = currentTranslations['add_app'] || "Thêm";

        addBtn.appendChild(addIconBox);
        addBtn.appendChild(addTitle);
        
        addBtn.onclick = () => openStore();
        grid.appendChild(addBtn);
    }
    
    // Đảm bảo nút Setting luôn nằm dưới cùng trong khung
    const btnSetting = document.getElementById('btn-setting');
    grid.appendChild(btnSetting);
    
    // Kích hoạt class CSS để rung icon nếu đang bật chế độ sửa
    grid.classList.toggle('edit-mode', isEditMode);
}

// --- LOGIC CLICK APP (CHẠY) ---
function handleAppClick(app) {
    if (!isEditMode) {
        const shortcutUrl = `shortcuts://run-shortcut?name=Open%20App%20Launcher&input=text&text=${encodeURIComponent(app.id)}`;
        window.location.href = shortcutUrl;
    }
}

// --- XỬ LÝ SỰ KIỆN CONTEXT MENU ---
document.getElementById('ctx-rename').onclick = () => {
    if (contextApp) {
        currentEditId = contextApp.id;
        document.getElementById('input-rename').value = contextApp.name;
        toggleModal('rename-modal', true);
    }
    hideContextMenu();
};

document.getElementById('ctx-delete').onclick = () => {
    if (contextApp) {
        if (confirm(`Bạn có chắc muốn xoá ${contextApp.name}?`)) {
            appList = appList.filter(a => a.id !== contextApp.id);
            saveApps();
            renderApps();
        }
    }
    hideContextMenu();
};

document.getElementById('ctx-share').onclick = () => {
    if (contextApp) {
        if (navigator.share) {
            navigator.share({
                title: 'Quick App Launcher',
                text: `Ứng dụng: ${contextApp.name}`,
                url: window.location.href
            }).catch(console.error);
        } else {
            alert(`Đã copy tên app: ${contextApp.name}`);
        }
    }
    hideContextMenu();
};

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
    const newName = document.getElementById('input-rename').value.trim();
    if (currentEditId && newName) {
        appList = appList.map(a => a.id === currentEditId ? {...a, name: cleanAppName(newName)} : a);
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
    
    // Làm sạch tên trước khi thêm vào lưới
    const cleanApp = { ...app, name: cleanAppName(app.name) };
    appList.push(cleanApp);
    saveApps();
    renderApps();
    toggleModal('store-modal', false);
}

// Tìm kiếm Online API iTunes
document.getElementById('btn-search-app').onclick = async () => {
    const query = document.getElementById('input-search-app').value.trim();
    const region = document.getElementById('select-store-region').value;
    
    if(!query) {
        renderOfflineStore();
        return;
    }
    
    const resultsContainer = document.getElementById('store-results');
    document.getElementById('store-status-text').textContent = "Kết quả từ iTunes API (Online):";
    resultsContainer.innerHTML = '<p style="padding: 10px; text-align: center;">Đang tìm kiếm...</p>';
    
    try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&country=${region}&entity=software&limit=15`);
        const data = await res.json();
        resultsContainer.innerHTML = '';
        
        if(data.results.length === 0) {
            resultsContainer.innerHTML = '<p style="padding: 10px; text-align: center;">Không tìm thấy ứng dụng nào.</p>';
            return;
        }

        data.results.forEach(app => {
            const div = document.createElement('button');
            div.className = 'menu-item';
            const cleanName = cleanAppName(app.trackName);
            div.innerHTML = `<img src="${app.artworkUrl100}"> <span>${cleanName}</span>`;
            div.onclick = () => addAppToGrid({ id: app.bundleId, name: cleanName, icon: app.artworkUrl100 });
            resultsContainer.appendChild(div);
        });
    } catch (e) { 
        resultsContainer.innerHTML = '<p style="padding: 10px; text-align: center;">Lỗi kết nối API iTunes.</p>'; 
    }
};

// --- XUẤT / NHẬP CẤU HÌNH (ĐÃ SỬA LỖI KẸT TRÊN IOS) ---
document.getElementById('btn-export-config').onclick = async () => {
    const data = {
        apps: localStorage.getItem('qal_apps'),
        theme: localStorage.getItem('qal_theme')
    };
    const filename = `QAL_Backup_${new Date().toISOString().slice(0,10)}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const file = new File([blob], filename, { type: 'application/json' });

    // Sử dụng Web Share API để tránh bị kẹt ở màn hình Files trên iOS
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title: 'QAL Backup',
                text: 'Sao lưu cấu hình Quick App Launcher'
            });
        } catch (err) {
            console.error('Lỗi chia sẻ file:', err);
        }
    } else {
        // Phương án dự phòng cho trình duyệt không hỗ trợ share file
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};

document.getElementById('btn-import-config').onclick = () => {
    document.getElementById('input-import-config').click();
};

document.getElementById('input-import-config').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if (data.apps) localStorage.setItem('qal_apps', data.apps);
            if (data.theme) localStorage.setItem('qal_theme', data.theme);
            alert('Nhập cấu hình thành công! Trang sẽ tải lại để áp dụng.');
            location.reload();
        } catch (err) {
            alert('File không hợp lệ hoặc bị lỗi!');
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
};

// --- ĐIỀU KHIỂN MODAL CHUNG ---
function toggleModal(id, show) {
    const modal = document.getElementById(id);
    if (show) modal.classList.remove('hidden'); 
    else modal.classList.add('hidden');
}

// Bắt sự kiện tắt bật Modal
document.getElementById('btn-setting').onclick = () => toggleModal('setting-modal', true);

// Nút đỏ macOS đóng kho ứng dụng
document.getElementById('mac-close-store').onclick = () => toggleModal('store-modal', false);

document.getElementById('btn-info').onclick = () => { 
    toggleModal('setting-modal', false); 
    toggleModal('info-modal', true); 
};

// Nút đỏ macOS đóng Info
document.getElementById('mac-close-info').onclick = () => toggleModal('info-modal', false);

document.getElementById('btn-about').onclick = () => { 
    toggleModal('info-modal', false); 
    toggleModal('about-popup', true); 
};
document.getElementById('btn-close-about').onclick = () => toggleModal('about-popup', false);

// Init khi tải xong trang
document.addEventListener('DOMContentLoaded', async () => { 
    await loadTranslations();
    await loadAppsData(); 
});