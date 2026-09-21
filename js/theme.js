const shadowTemplates = [
    { id: 'inset', nameKey: 'shadow_inset', name: 'Bóng Chìm', template: 'inset {x}px {y}px {b}px {s}px {c}' },
    { id: 'outer', nameKey: 'shadow_outer', name: 'Bóng Ngoài', template: '{x}px {y}px {b}px {s}px {c}' },
    { id: 'soft', nameKey: 'shadow_soft', name: 'Mờ Diện Rộng', template: '{x}px {y}px {b}px {s}px {c}' },
    { id: 'hard', nameKey: 'shadow_hard', name: 'Nổi Khối 3D', template: '{x}px {y}px {b}px {s}px {c}' },
    { id: 'glow', nameKey: 'shadow_glow', name: 'Phát Sáng', template: '0px 0px {b}px {s}px {c}' },
    { id: 'bottom', nameKey: 'shadow_bottom', name: 'Bóng Dưới (Apple)', template: '0px {y}px {b}px {s}px {c}' },
    { id: 'floating', nameKey: 'shadow_floating', name: 'Nổi Bay', template: '0px {b}px {b}px calc(-1 * {s}px) {c}' },
    { id: 'pressed', nameKey: 'shadow_pressed', name: 'Ấn Xuống', template: 'inset 0px {y}px {b}px {s}px {c}' },
    { id: 'pop', nameKey: 'shadow_pop', name: 'Pop Bubble', template: '0px {y}px 0px 0px {c}' },
    { id: 'double', nameKey: 'shadow_double', name: 'Viền Kép', template: '{x}px {y}px {b}px {s}px {c}, inset calc(-1 * {x}px) calc(-1 * {y}px) {b}px 0px rgba(255,255,255,0.15)' },
    { id: 'neumorph', nameKey: 'shadow_neumorph', name: 'Neumorphism Nổi', template: 'calc(-1 * {x}px) calc(-1 * {y}px) {b}px rgba(255,255,255,0.4), {x}px {y}px {b}px {c}' },
    { id: 'neuro_in', nameKey: 'shadow_neuro_in', name: 'Neumorphism Chìm', template: 'inset calc(-1 * {x}px) calc(-1 * {y}px) {b}px rgba(255,255,255,0.4), inset {x}px {y}px {b}px {c}' },
    { id: 'neon', nameKey: 'shadow_neon', name: 'Neon RGB', template: '0px 0px {b}px {c}, 0px 0px {b}px {c}, 0px 0px {b}px {c}' },
    { id: 'long', nameKey: 'shadow_long', name: 'Bóng Dài Retro', template: '{x}px {y}px 0px 0px {c}' },
    { id: 'crisp', nameKey: 'shadow_crisp', name: 'Sắc Nét Nhẹ', template: '0px 1px 2px 0px {c}' },
    { id: 'ripple', nameKey: 'shadow_ripple', name: 'Sóng Nước', template: '0px {y}px {b}px {s}px {c}, 0px {y}px {b}px {s}px {c}' },
    { id: 'clay', nameKey: 'shadow_clay', name: 'Đất Sét 3D', template: 'inset 0px calc(-1 * {y}px) {b}px rgba(255,255,255,0.3), inset 0px {y}px {b}px rgba(0,0,0,0.2), 0px {y}px {b}px {c}' }
];

const root = document.documentElement;
const isLight = window.matchMedia('(prefers-color-scheme: light)').matches;

let localBase64Image = "";
let appliedIconShadows = [];
let appliedContainerShadows = [];

// ==========================================
// SAFE STORAGE HELPERS (Chống crash localStorage)
// ==========================================
function safeGetItem(key) {
    try { return localStorage.getItem(key); } catch (e) { console.warn('localStorage bị chặn:', e); return null; }
}
function safeSetItem(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (e) { console.warn('Không thể lưu localStorage:', e); return false; }
}
function safeParseJSON(str, fallback = {}) {
    if (!str) return fallback;
    try { return JSON.parse(str) || fallback; } catch (e) { console.warn('JSON lỗi:', e); return fallback; }
}
function $(id) { return document.getElementById(id); }

// ==========================================
// HỆ THỐNG INDEXED-DB LƯU ẢNH NỀN
// ==========================================
const DB_NAME = 'QAL_DB';
const DB_VERSION = 1;
const STORE_NAME = 'settings';

function initDB() {
    return new Promise((resolve, reject) => {
        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        } catch (e) { reject(e); }
    });
}

async function saveImageToDB(base64Data) {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.put(base64Data, 'bgImage');
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e.target.error);
        });
    } catch (e) { console.warn('Lỗi lưu ảnh vào DB:', e); }
}

async function loadImageFromDB() {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const request = tx.objectStore(STORE_NAME).get('bgImage');
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    } catch (e) { console.warn('Lỗi đọc ảnh từ DB:', e); return null; }
}

// ==========================================
// LOGIC CẬP NHẬT GIAO DIỆN
// ==========================================
function hexToRgb(hex) {
    if (!hex) return '255, 255, 255';
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
}

function generateCurrentShadowString() {
    const shadowType = $('select-shadow-type')?.value;
    if (!shadowType) return "";
    const x = $('slider-shadow-x')?.value || 0;
    const y = $('slider-shadow-y')?.value || 0;
    const b = $('slider-shadow-b')?.value || 0;
    const s = $('slider-shadow-s')?.value || 0;
    const c = $('color-shadow')?.value || '#000000';

    const template = shadowTemplates.find(t => t.id === shadowType)?.template;
    if (!template) return "";
    return template.replace(/{x}/g, x).replace(/{y}/g, y).replace(/{b}/g, b).replace(/{s}/g, s).replace(/{c}/g, c);
}

// Áp dụng ảnh nền trực tiếp vào DOM (tránh lỗi WebClip không nhận biến CSS)
function applyBackground(url) {
    const bgEl = $('app-background');
    if (!bgEl) return;
    if (url && url !== 'none') {
        bgEl.style.backgroundImage = `url('${url}')`;
    } else {
        bgEl.style.backgroundImage = 'none';
    }
}

function updateTheme() {
    try {
        // Màu nền & khung
        if ($('color-bg')) root.style.setProperty('--bg-color', $('color-bg').value);
        if ($('color-container')) root.style.setProperty('--container-color', hexToRgb($('color-container').value));
        if ($('slider-opacity')) root.style.setProperty('--container-opacity', $('slider-opacity').value / 100);
        if ($('slider-radius-container')) root.style.setProperty('--container-radius', $('slider-radius-container').value + 'px');
        if ($('slider-container-gap')) root.style.setProperty('--container-gap', $('slider-container-gap').value + 'px');
        if ($('slider-setting-size')) root.style.setProperty('--setting-size', $('slider-setting-size').value + 'px');
        
        // Kích thước icon
        if ($('slider-icon-size')) root.style.setProperty('--icon-size', $('slider-icon-size').value + 'px');
        if ($('slider-radius-icon')) root.style.setProperty('--icon-radius', $('slider-radius-icon').value + 'px');
        if ($('slider-icon-gap')) root.style.setProperty('--icon-gap', $('slider-icon-gap').value + 'px');
        
        // Chữ
        if ($('check-show-name')) root.style.setProperty('--show-name', $('check-show-name').checked ? 'block' : 'none');
        if ($('slider-text-size')) root.style.setProperty('--text-size', $('slider-text-size').value + 'px');
        if ($('slider-text-spacing')) root.style.setProperty('--text-spacing', $('slider-text-spacing').value + 'px');
        if ($('color-text')) root.style.setProperty('--text-color', $('color-text').value);

        // Đổ bóng độc lập
        const previewShadow = generateCurrentShadowString();
        const target = $('select-shadow-target')?.value;
        
        const iconShadows = [...appliedIconShadows];
        if (previewShadow && target === 'icon') iconShadows.push(previewShadow);
        root.style.setProperty('--icon-shadow', iconShadows.length > 0 ? iconShadows.join(', ') : '0px 10px 20px 0px rgba(0,0,0,0.5)');

        const containerShadows = [...appliedContainerShadows];
        if (previewShadow && target === 'container') containerShadows.push(previewShadow);
        root.style.setProperty('--container-shadow', containerShadows.length > 0 ? containerShadows.join(', ') : '0px 10px 20px 0px rgba(0,0,0,0.5)');
        
        saveSettings();
    } catch (e) { console.error('Lỗi updateTheme:', e); }
}

function saveSettings() {
    try {
        const config = {
            bgInputVal: $('input-bg-image')?.value || '',
            bgColor: $('color-bg')?.value || '#000000',
            containerColor: $('color-container')?.value || '#ffffff',
            containerOpacity: $('slider-opacity')?.value || 15,
            containerRadius: $('slider-radius-container')?.value || 35,
            containerGap: $('slider-container-gap')?.value || 15,
            settingSize: $('slider-setting-size')?.value || 40,
            iconSize: $('slider-icon-size')?.value || 60,
            iconRadius: $('slider-radius-icon')?.value || 14,
            iconGap: $('slider-icon-gap')?.value || 0,
            textSize: $('slider-text-size')?.value || 11,
            textSpacing: $('slider-text-spacing')?.value || 0,
            textColor: $('color-text')?.value || '#ffffff',
            showName: $('check-show-name')?.checked !== false,
            
            appliedIconShadows: appliedIconShadows,
            appliedContainerShadows: appliedContainerShadows,
            shadowTarget: $('select-shadow-target')?.value || 'icon',
            shadowType: $('select-shadow-type')?.value || 'outer',
            shadowX: $('slider-shadow-x')?.value || 0,
            shadowY: $('slider-shadow-y')?.value || 10,
            shadowB: $('slider-shadow-b')?.value || 20,
            shadowS: $('slider-shadow-s')?.value || 0,
            shadowColor: $('color-shadow')?.value || '#000000'
        };
        safeSetItem('qal_theme', JSON.stringify(config));
    } catch (e) { console.error('Lỗi saveSettings:', e); }
}

async function loadSettings() {
    try {
        // Render dropdown kiểu bóng
        const shadowSelect = $('select-shadow-type');
        if (shadowSelect) {
            shadowSelect.innerHTML = '';
            shadowTemplates.forEach(t => {
                let opt = document.createElement('option'); 
                opt.value = t.id; 
                opt.textContent = t.name;
                opt.dataset.i18n = t.nameKey; 
                shadowSelect.appendChild(opt);
            });
        }

        const saved = safeParseJSON(safeGetItem('qal_theme'), {});
        
        try {
            const savedImage = await loadImageFromDB();
            if (savedImage) localBase64Image = savedImage;
        } catch(e) { console.warn("Lỗi lấy ảnh từ IndexedDB", e); }
        
        const bgVal = saved.bgInputVal || '';
        if ($('input-bg-image')) $('input-bg-image').value = bgVal;
        
        // Khôi phục ảnh nền
        if (bgVal === "[Ảnh từ thiết bị]" && localBase64Image) {
            applyBackground(localBase64Image);
        } else if (bgVal && bgVal !== "[Ảnh từ thiết bị]") {
            applyBackground(bgVal);
        }

        // Gán giá trị đã lưu vào các input (dùng if để tránh crash)
        if ($('color-bg')) $('color-bg').value = saved.bgColor || (isLight ? '#f2f2f7' : '#000000');
        if ($('color-container')) $('color-container').value = saved.containerColor || '#ffffff';
        if ($('slider-opacity')) $('slider-opacity').value = saved.containerOpacity || (isLight ? 60 : 15);
        if ($('slider-radius-container')) $('slider-radius-container').value = saved.containerRadius || 35;
        if ($('slider-container-gap')) $('slider-container-gap').value = saved.containerGap || 15;
        if ($('slider-setting-size')) $('slider-setting-size').value = saved.settingSize || 40;
        
        if ($('slider-icon-size')) $('slider-icon-size').value = saved.iconSize || 60;
        if ($('slider-radius-icon')) $('slider-radius-icon').value = saved.iconRadius || 14;
        if ($('slider-icon-gap')) $('slider-icon-gap').value = saved.iconGap || 0;
        
        if ($('check-show-name')) $('check-show-name').checked = saved.showName !== false;
        if ($('slider-text-size')) $('slider-text-size').value = saved.textSize || 11;
        if ($('slider-text-spacing')) $('slider-text-spacing').value = saved.textSpacing || 0;
        if ($('color-text')) $('color-text').value = saved.textColor || (isLight ? '#000000' : '#ffffff');

        appliedIconShadows = Array.isArray(saved.appliedIconShadows) ? saved.appliedIconShadows : [];
        appliedContainerShadows = Array.isArray(saved.appliedContainerShadows) ? saved.appliedContainerShadows : [];
        
        if ($('select-shadow-target')) $('select-shadow-target').value = saved.shadowTarget || 'icon';
        if ($('select-shadow-type')) $('select-shadow-type').value = saved.shadowType || 'outer';
        if ($('slider-shadow-x')) $('slider-shadow-x').value = saved.shadowX || 0;
        if ($('slider-shadow-y')) $('slider-shadow-y').value = saved.shadowY || 10;
        if ($('slider-shadow-b')) $('slider-shadow-b').value = saved.shadowB || 20;
        if ($('slider-shadow-s')) $('slider-shadow-s').value = saved.shadowS || 0;
        if ($('color-shadow')) $('color-shadow').value = saved.shadowColor || '#000000';
        
        updateTheme();
    } catch (e) {
        console.error('Lỗi loadSettings:', e);
    }
}

// ==========================================
// XỬ LÝ SỰ KIỆN
// ==========================================

// Nút Áp Dụng Nền
const btnApplyBg = $('btn-apply-bg');
if (btnApplyBg) {
    btnApplyBg.addEventListener('click', async () => {
        const bgInput = $('input-bg-image').value.trim();
        let finalBgUrl = bgInput;

        if (bgInput === "[Ảnh từ thiết bị]") {
            finalBgUrl = localBase64Image;
        } else {
            if (localBase64Image !== "") {
                localBase64Image = "";
                await saveImageToDB(""); 
            }
        }

        if (finalBgUrl) applyBackground(finalBgUrl);
        else applyBackground('none');
        
        saveSettings();
        alert("Đã áp dụng ảnh nền thành công!");
    });
}

// Chọn Ảnh Từ Thiết Bị
const inputBgFile = $('input-bg-file');
if (inputBgFile) {
    inputBgFile.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = async function() {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1280; 
                const scaleSize = MAX_WIDTH / img.width;
                
                if (scaleSize < 1) {
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;
                } else {
                    canvas.width = img.width;
                    canvas.height = img.height;
                }

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                localBase64Image = canvas.toDataURL('image/jpeg', 0.85);
                if ($('input-bg-image')) $('input-bg-image').value = "[Ảnh từ thiết bị]"; 
                await saveImageToDB(localBase64Image);
                
                applyBackground(localBase64Image);
                saveSettings();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Áp Dụng Bóng Đa Tầng
const btnApplyShadow = $('btn-apply-shadow');
if (btnApplyShadow) {
    btnApplyShadow.addEventListener('click', () => {
        const newShadow = generateCurrentShadowString();
        const target = $('select-shadow-target').value;
        
        if (newShadow) {
            if (target === 'icon') appliedIconShadows.push(newShadow);
            else appliedContainerShadows.push(newShadow);
            updateTheme();
            alert(`Đã áp dụng thành công cho ${target === 'icon' ? 'Icon' : 'Khung'}!\nĐang có ${target === 'icon' ? appliedIconShadows.length : appliedContainerShadows.length} lớp bóng.`);
        }
    });
}

// Làm Mới Bóng
const btnResetShadow = $('btn-reset-shadow');
if (btnResetShadow) {
    btnResetShadow.addEventListener('click', () => {
        const target = $('select-shadow-target').value;
        if (target === 'icon') appliedIconShadows = [];
        else appliedContainerShadows = [];
        updateTheme();
        alert(`Đã làm mới toàn bộ hiệu ứng đổ bóng cho ${target === 'icon' ? 'Icon' : 'Khung'}!`);
    });
}

// Đóng bảng cài đặt
const macCloseSetting = $('mac-close-setting');
if (macCloseSetting) {
    macCloseSetting.onclick = () => {
        const m = $('setting-modal');
        if (m) m.classList.add('hidden');
    };
}

// Hiệu ứng làm mờ khi kéo thanh trượt
const settingPanel = $('setting-panel');
document.querySelectorAll('input[type="range"]').forEach(el => {
    el.addEventListener('input', updateTheme);
    if (settingPanel) {
        el.addEventListener('touchstart', () => settingPanel.classList.add('transparent'), {passive: true});
        el.addEventListener('touchend', () => settingPanel.classList.remove('transparent'));
        el.addEventListener('mousedown', () => settingPanel.classList.add('transparent'));
        el.addEventListener('mouseup', () => settingPanel.classList.remove('transparent'));
    }
});

// Lắng nghe thay đổi các ô input khác
document.querySelectorAll('.modal-body input:not([type="range"]):not([type="file"]), .modal-body select').forEach(el => {
    if (el.id !== 'input-bg-image') {
        el.addEventListener('change', updateTheme);
    }
});

// Tooltip cho Slider
const tooltip = $('slider-tooltip');
if (tooltip) {
    document.querySelectorAll('input[type="range"]').forEach(el => {
        el.addEventListener('input', (e) => {
            const val = e.target.value;
            const rect = e.target.getBoundingClientRect();
            const min = parseFloat(e.target.min);
            const max = parseFloat(e.target.max);
            const percent = (parseFloat(val) - min) / (max - min);
            const x = rect.left + (rect.width * percent);
            const y = rect.top;
            
            tooltip.style.left = `${x}px`;
            tooltip.style.top = `${y}px`;
            tooltip.textContent = val;
            tooltip.classList.remove('hidden');
        });
        el.addEventListener('change', () => tooltip.classList.add('hidden'));
        el.addEventListener('touchend', () => tooltip.classList.add('hidden'));
        el.addEventListener('mouseup', () => tooltip.classList.add('hidden'));
    });
}

// Init an toàn - chạy sau khi DOM sẵn sàng
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSettings);
} else {
    loadSettings();
}