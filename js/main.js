let appList = [];
let offlineApps = []; 
let isEditMode = false;
let currentEditId = null;
let currentTranslations = {};

// Biến cho Long-press
let pressTimer;
let isLongPress = false;
let contextApp = null;

// Helper an toàn
function $(id) { return document.getElementById(id); }
function safeGetItem(key) {
    try { return localStorage.getItem(key); } catch (e) { console.warn('localStorage bị chặn:', e); return null; }
}
function safeSetItem(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (e) { console.warn('Không thể lưu localStorage:', e); return false; }
}
function safeParseJSON(str, fallback = []) {
    if (!str) return fallback;
    try { const r = JSON.parse(str); return r === null ? fallback : r; } catch (e) { return fallback; }
}

// --- HÀM LÀM SẠCH TÊN ỨNG DỤNG ---
function cleanAppName(name) {
    if (!name || typeof name !== 'string') return "Unknown";
    // Tách tại các dấu gạch ngang, hai chấm, hoặc ngoặc đơn
    let clean = name.split(/[-:()]/)[0].trim();
    // Loại bỏ ký tự đặc biệt ở cuối
    clean = clean.replace(/[,\s]+$/, '');
    if (clean.length === 0) clean = name.trim();
    // Giới hạn độ dài
    if (clean.length > 15) clean = clean.substring(0, 14) + '...';
    return clean;
}

// --- ĐA NGÔN NGỮ ---
async function loadTranslations() {
    const userLang = navigator.language || navigator.userLanguage;
    try {
        const res = await fetch(`Language/${userLang}.json`);
        if (!res.ok) throw new Error("Không tìm thấy file ngôn ngữ");
        currentTranslations = await res.json();
    } catch (e) {
        console.warn(`Fallback về en-GB`);
        try {
            const fallbackRes = await fetch(`Language/en-GB.json`);
            if (fallbackRes.ok) currentTranslations = await fallbackRes.json();
        } catch (err) { console.error("Lỗi Fallback", err); }
    }
    applyTranslations(document);
}

function applyTranslations(rootElement) {
    if (!rootElement) return;
    rootElement.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (currentTranslations[key]) el.textContent = currentTranslations[key];
    });
}

// --- INIT LƯU TRỮ APP ---
async function loadAppsData() {
    // 1. Tải danh sách App Offline
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

    // 2. Tải danh sách App đã thêm
    const local = safeGetItem('qal_apps');
    const parsed = safeParseJSON(local, []);
    if (Array.isArray(parsed) && parsed.length > 0) {
        appList = parsed.map(app => ({
            id: app.id || String(Math.random()),
            name: cleanAppName(app.name),
            icon: app.icon || 'image/placeholder.png'
        }));
    } else {
        appList = []; 
    }
    renderApps();
}

function saveApps() {
    safeSetItem('qal_apps', JSON.stringify(appList));
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
    const cancel = () => clearTimeout(pressTimer);
    
    element.addEventListener('touchstart', start, {passive: true});
    element.addEventListener('touchend', cancel);
    element.addEventListener('touchmove', cancel);
    element.addEventListener('mousedown', start);
    element.addEventListener('mouseup', cancel);
    element.addEventListener('mouseleave', cancel);
}

function showContextMenu(e, app) {
    const menu = $('context-menu');
    if (!menu) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    
    let menuX = x;
    let menuY = y;
    if (x > window.innerWidth - 180) menuX = window.innerWidth - 190;
    if (y > window.innerHeight - 150) menuY = y - 150;
    
    menu.style.left = `${menuX}px`;
    menu.style.top = `${menuY}px`;
    menu.classList.remove('hidden');
    
    setTimeout(() => {
        document.addEventListener('click', hideContextMenu, {once: true});
    }, 100);
}

function hideContextMenu() {
    const menu = $('context-menu');
    if (menu) menu.classList.add('hidden');
}

// --- RENDER GIAO DIỆN ---
function renderApps() {
    const grid = $('app-grid');
    if (!grid) return;
    
    // Xóa app-item cũ, giữ lại nút setting
    grid.querySelectorAll('.app-item').forEach(item => item.remove());
    
    // Render app
    appList.slice(0, 24).forEach(app => {
        const btn = document.createElement('button');
        btn.className = 'app-item';
        
        const icon = document.createElement('img');
        if (app.icon && app.icon.startsWith('http')) {
            icon.src = app.icon;
        } else {
            const fileName = (app.icon || '').split('/').pop();
            icon.src = `icon/${fileName}`;
        }
        
        icon.onerror = function() { 
            this.onerror = null; 
            this.src = 'image/placeholder.png'; 
        };
        
        const title = document.createElement('span');
        title.textContent = app.name;
        
        btn.appendChild(icon);
        btn.appendChild(title);
        
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

    // Nút Thêm (+)
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
    
    // Đảm bảo nút Setting luôn nằm cuối
    const btnSetting = $('btn-setting');
    if (btnSetting) grid.appendChild(btnSetting);
    
    grid.classList.toggle('edit-mode', isEditMode);
}

// --- CLICK APP (CHẠY) ---
function handleAppClick(app) {
    if (!isEditMode) {
        const shortcutUrl = `shortcuts://run-shortcut?name=Open%20App%20Launcher&input=text&text=${encodeURIComponent(app.id)}`;
        window.location.href = shortcutUrl;
    }
}

// --- CONTEXT MENU ACTIONS ---
const ctxRename = $('ctx-rename');
if (ctxRename) {
    ctxRename.onclick = () => {
        if (contextApp) {
            currentEditId = contextApp.id;
            const inp = $('input-rename');
            if (inp) inp.value = contextApp.name;
            toggleModal('rename-modal', true);
        }
        hideContextMenu();
    };
}

const ctxDelete = $('ctx-delete');
if (ctxDelete) {
    ctxDelete.onclick = () => {
        if (contextApp) {
            if (confirm(`Bạn có chắc muốn xoá ${contextApp.name}?`)) {
                appList = appList.filter(a => a.id !== contextApp.id);
                saveApps();
                renderApps();
            }
        }
        hideContextMenu();
    };
}

const ctxShare = $('ctx-share');
if (ctxShare) {
    ctxShare.onclick = () => {
        if (contextApp) {
            if (navigator.share) {
                navigator.share({
                    title: 'Quick App Launcher',
                    text: `Ứng dụng: ${contextApp.name}`,
                    url: window.location.href
                }).catch(() => {});
            } else {
                alert(`Đã copy tên app: ${contextApp.name}`);
            }
        }
        hideContextMenu();
    };
}

// --- BẬT / TẮT CHẾ ĐỘ SỬA ---
const btnEnterEdit = $('btn-enter-edit-mode');
if (btnEnterEdit) {
    btnEnterEdit.onclick = () => {
        isEditMode = true; 
        toggleModal('setting-modal', false);
        const done = $('btn-done-edit'); if (done) done.classList.remove('hidden');
        const st = $('btn-setting'); if (st) st.classList.add('hidden');
        renderApps();
    };
}

const btnDoneEdit = $('btn-done-edit');
if (btnDoneEdit) {
    btnDoneEdit.onclick = () => {
        isEditMode = false; 
        btnDoneEdit.classList.add('hidden');
        const st = $('btn-setting'); if (st) st.classList.remove('hidden');
        renderApps();
    };
}

// --- ĐỔI TÊN APP ---
const btnSaveRename = $('btn-save-rename');
if (btnSaveRename) {
    btnSaveRename.onclick = () => {
        const inp = $('input-rename');
        const newName = inp ? inp.value.trim() : '';
        if (currentEditId && newName) {
            appList = appList.map(a => a.id === currentEditId ? {...a, name: cleanAppName(newName)} : a);
            saveApps();
            renderApps();
        }
        toggleModal('rename-modal', false);
    };
}
const btnCloseRename = $('btn-close-rename');
if (btnCloseRename) {
    btnCloseRename.onclick = () => toggleModal('rename-modal', false);
}

// --- KHO ỨNG DỤNG ---
function openStore() {
    toggleModal('store-modal', true);
    renderOfflineStore();
}

function renderOfflineStore() {
    const resultsContainer = $('store-results');
    if (!resultsContainer) return;
    const statusText = $('store-status-text');
    if (statusText) statusText.textContent = "Ứng dụng có sẵn (Offline):";
    resultsContainer.innerHTML = '';
    
    offlineApps.forEach(app => {
        const div = document.createElement('button');
        div.className = 'menu-item';
        
        let iconSrc = app.icon;
        if (!iconSrc.startsWith('http')) {
            const fileName = iconSrc.split('/').pop();
            iconSrc = `icon/${fileName}`;
        }

        div.innerHTML = `<img src="${iconSrc}" onerror="this.onerror=null;this.src='image/placeholder.png'"> <span>${app.name}</span>`;
        div.onclick = () => addAppToGrid(app);
        resultsContainer.appendChild(div);
    });
}

function addAppToGrid(app) {
    if (appList.length >= 24) return alert("Đã đầy 24 ứng dụng!");
    if (appList.find(a => a.id === app.id)) return alert("App đã tồn tại!");
    
    const cleanApp = { 
        id: app.id || String(Math.random()),
        name: cleanAppName(app.name), 
        icon: app.icon 
    };
    appList.push(cleanApp);
    saveApps();
    renderApps();
    toggleModal('store-modal', false);
}

// Tìm kiếm iTunes
const btnSearchApp = $('btn-search-app');
if (btnSearchApp) {
    btnSearchApp.onclick = async () => {
        const inp = $('input-search-app');
        const query = inp ? inp.value.trim() : '';
        const sel = $('select-store-region');
        const region = sel ? sel.value : 'VN';
        
        if (!query) {
            renderOfflineStore();
            return;
        }
        
        const resultsContainer = $('store-results');
        const statusText = $('store-status-text');
        if (statusText) statusText.textContent = "Kết quả từ iTunes API (Online):";
        if (resultsContainer) resultsContainer.innerHTML = '<p style="padding: 10px; text-align: center;">Đang tìm kiếm...</p>';
        
        try {
            const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&country=${region}&entity=software&limit=15`);
            const data = await res.json();
            if (!resultsContainer) return;
            resultsContainer.innerHTML = '';
            
            if (data.results.length === 0) {
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
            if (resultsContainer) resultsContainer.innerHTML = '<p style="padding: 10px; text-align: center;">Lỗi kết nối API iTunes.</p>'; 
        }
    };
}

// --- XUẤT / NHẬP CẤU HÌNH ---
const btnExport = $('btn-export-config');
if (btnExport) {
    btnExport.onclick = async () => {
        const data = {
            apps: safeGetItem('qal_apps'),
            theme: safeGetItem('qal_theme')
        };
        const filename = `QAL_Backup_${new Date().toISOString().slice(0,10)}.json`;
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const file = new File([blob], filename, { type: 'application/json' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file],
                    title: 'QAL Backup',
                    text: 'Sao lưu cấu hình Quick App Launcher'
                });
            } catch (err) {
                // Người dùng bấm Cancel cũng vào đây, không cần báo lỗi
                console.log('Share bị hủy hoặc lỗi:', err);
            }
        } else {
            // Fallback
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
}

const btnImport = $('btn-import-config');
if (btnImport) {
    btnImport.onclick = () => {
        const inp = $('input-import-config');
        if (inp) inp.click();
    };
}

const inputImport = $('input-import-config');
if (inputImport) {
    inputImport.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.apps) safeSetItem('qal_apps', data.apps);
                if (data.theme) safeSetItem('qal_theme', data.theme);
                alert('Nhập cấu hình thành công! Trang sẽ tải lại để áp dụng.');
                location.reload();
            } catch (err) {
                alert('File không hợp lệ hoặc bị lỗi!');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };
}

// --- ĐIỀU KHIỂN MODAL ---
function toggleModal(id, show) {
    const modal = $(id);
    if (!modal) return;
    if (show) modal.classList.remove('hidden'); 
    else modal.classList.add('hidden');
}

const btnSetting = $('btn-setting');
if (btnSetting) btnSetting.onclick = () => toggleModal('setting-modal', true);

const macCloseStore = $('mac-close-store');
if (macCloseStore) macCloseStore.onclick = () => toggleModal('store-modal', false);

const btnInfo = $('btn-info');
if (btnInfo) {
    btnInfo.onclick = () => { 
        toggleModal('setting-modal', false); 
        toggleModal('info-modal', true); 
    };
}

const macCloseInfo = $('mac-close-info');
if (macCloseInfo) macCloseInfo.onclick = () => toggleModal('info-modal', false);

const btnAbout = $('btn-about');
if (btnAbout) {
    btnAbout.onclick = () => { 
        toggleModal('info-modal', false); 
        toggleModal('about-popup', true); 
    };
}
const btnCloseAbout = $('btn-close-about');
if (btnCloseAbout) btnCloseAbout.onclick = () => toggleModal('about-popup', false);

// --- INIT ---
async function initApp() {
    try {
        await loadTranslations();
    } catch (e) { console.error('Lỗi loadTranslations:', e); }
    try {
        await loadAppsData();
    } catch (e) { console.error('Lỗi loadAppsData:', e); }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}