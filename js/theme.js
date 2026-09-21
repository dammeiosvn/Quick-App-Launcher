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
let appliedShadows = []; // Mảng chứa các lớp bóng đa tầng đã chốt

// ==========================================
// HỆ THỐNG INDEXED-DB LƯU ẢNH NỀN
// ==========================================
const DB_NAME = 'QAL_DB';
const DB_VERSION = 1;
const STORE_NAME = 'settings';

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function saveImageToDB(base64Data) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(base64Data, 'bgImage');
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
}

async function loadImageFromDB() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).get('bgImage');
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

// ==========================================
// LOGIC CẬP NHẬT GIAO DIỆN
// ==========================================
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
}

function generateCurrentShadowString() {
    const shadowType = document.getElementById('select-shadow-type').value;
    const x = document.getElementById('slider-shadow-x').value;
    const y = document.getElementById('slider-shadow-y').value;
    const b = document.getElementById('slider-shadow-b').value;
    const s = document.getElementById('slider-shadow-s').value;
    const c = document.getElementById('color-shadow').value;

    const template = shadowTemplates.find(t => t.id === shadowType)?.template;
    if (!template) return "";

    return template.replace(/{x}/g, x).replace(/{y}/g, y).replace(/{b}/g, b).replace(/{s}/g, s).replace(/{c}/g, c);
}

function updateTheme() {
    root.style.setProperty('--bg-color', document.getElementById('color-bg').value);
    root.style.setProperty('--container-color', hexToRgb(document.getElementById('color-container').value));
    root.style.setProperty('--container-opacity', document.getElementById('slider-opacity').value / 100);
    root.style.setProperty('--container-radius', document.getElementById('slider-radius-container').value + 'px');
    
    root.style.setProperty('--icon-size', document.getElementById('slider-icon-size').value + 'px');
    root.style.setProperty('--icon-radius', document.getElementById('slider-radius-icon').value + 'px');
    
    root.style.setProperty('--show-name', document.getElementById('check-show-name').checked ? 'block' : 'none');
    root.style.setProperty('--text-size', document.getElementById('slider-text-size').value + 'px');
    root.style.setProperty('--text-spacing', document.getElementById('slider-text-spacing').value + 'px');
    root.style.setProperty('--text-color', document.getElementById('color-text').value);

    // Xử lý Đổ bóng: Nếu đã có bóng được apply thì dùng mảng, nếu chưa thì hiển thị preview theo thanh trượt
    const previewShadow = generateCurrentShadowString();
    const finalShadows = appliedShadows.length > 0 ? [...appliedShadows, previewShadow] : [previewShadow];
    
    if (finalShadows.length > 0) {
        root.style.setProperty('--shadow-value', finalShadows.join(', '));
    }
    
    saveSettings();
}

function saveSettings() {
    const config = {
        bgInputVal: document.getElementById('input-bg-image').value,
        bgColor: document.getElementById('color-bg').value,
        containerColor: document.getElementById('color-container').value,
        containerOpacity: document.getElementById('slider-opacity').value,
        containerRadius: document.getElementById('slider-radius-container').value,
        iconSize: document.getElementById('slider-icon-size').value,
        iconRadius: document.getElementById('slider-radius-icon').value,
        textSize: document.getElementById('slider-text-size').value,
        textSpacing: document.getElementById('slider-text-spacing').value,
        textColor: document.getElementById('color-text').value,
        showName: document.getElementById('check-show-name').checked,
        
        appliedShadows: appliedShadows,
        shadowType: document.getElementById('select-shadow-type').value,
        shadowX: document.getElementById('slider-shadow-x').value,
        shadowY: document.getElementById('slider-shadow-y').value,
        shadowB: document.getElementById('slider-shadow-b').value,
        shadowS: document.getElementById('slider-shadow-s').value,
        shadowColor: document.getElementById('color-shadow').value
    };
    localStorage.setItem('qal_theme', JSON.stringify(config));
}

async function loadSettings() {
    const shadowSelect = document.getElementById('select-shadow-type');
    shadowSelect.innerHTML = '';
    shadowTemplates.forEach(t => {
        let opt = document.createElement('option'); opt.value = t.id; opt.textContent = t.name;
        opt.dataset.i18n = t.nameKey; shadowSelect.appendChild(opt);
    });

    const saved = JSON.parse(localStorage.getItem('qal_theme')) || {};
    
    try {
        const savedImage = await loadImageFromDB();
        if (savedImage) localBase64Image = savedImage;
    } catch(e) { console.error("Lỗi lấy ảnh từ IndexedDB", e); }
    
    const bgVal = saved.bgInputVal || '';
    document.getElementById('input-bg-image').value = bgVal;
    
    // Khôi phục ảnh nền chuẩn cú pháp CSS url('...')
    if (bgVal === "[Ảnh từ thiết bị]" && localBase64Image) {
        root.style.setProperty('--bg-image', `url('${localBase64Image}')`);
    } else if (bgVal && bgVal !== "[Ảnh từ thiết bị]") {
        root.style.setProperty('--bg-image', `url('${bgVal}')`);
    }

    document.getElementById('color-bg').value = saved.bgColor || (isLight ? '#f2f2f7' : '#000000');
    document.getElementById('color-container').value = saved.containerColor || (isLight ? '#ffffff' : '#ffffff');
    document.getElementById('slider-opacity').value = saved.containerOpacity || (isLight ? 60 : 15);
    document.getElementById('slider-radius-container').value = saved.containerRadius || 35;
    
    document.getElementById('slider-icon-size').value = saved.iconSize || 60;
    document.getElementById('slider-radius-icon').value = saved.iconRadius || 14;
    
    document.getElementById('check-show-name').checked = saved.showName !== false;
    document.getElementById('slider-text-size').value = saved.textSize || 11;
    document.getElementById('slider-text-spacing').value = saved.textSpacing || 0;
    document.getElementById('color-text').value = saved.textColor || (isLight ? '#000000' : '#ffffff');

    appliedShadows = saved.appliedShadows || [];
    document.getElementById('select-shadow-type').value = saved.shadowType || 'outer';
    document.getElementById('slider-shadow-x').value = saved.shadowX || 0;
    document.getElementById('slider-shadow-y').value = saved.shadowY || 10;
    document.getElementById('slider-shadow-b').value = saved.shadowB || 20;
    document.getElementById('slider-shadow-s').value = saved.shadowS || 0;
    document.getElementById('color-shadow').value = saved.shadowColor || (isLight ? '#cccccc' : '#000000');
    
    updateTheme();
}

// ==========================================
// XỬ LÝ SỰ KIỆN NÚT BẤM
// ==========================================

// 1. Nút Áp Dụng Nền (Chuẩn hoá cú pháp url('...'))
document.getElementById('btn-apply-bg').addEventListener('click', async () => {
    const bgInput = document.getElementById('input-bg-image').value.trim();
    let finalBgUrl = bgInput;

    if (bgInput === "[Ảnh từ thiết bị]") {
        finalBgUrl = localBase64Image;
    } else {
        if (localBase64Image !== "") {
            localBase64Image = "";
            await saveImageToDB(""); 
        }
    }

    if (finalBgUrl) {
        root.style.setProperty('--bg-image', `url('${finalBgUrl}')`);
    } else {
        root.style.setProperty('--bg-image', 'none');
    }
    
    saveSettings();
    alert("Đã áp dụng ảnh nền thành công!");
});

// 2. Chọn Ảnh Từ Thiết Bị
document.getElementById('input-bg-file').addEventListener('change', function(e) {
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
            document.getElementById('input-bg-image').value = "[Ảnh từ thiết bị]"; 
            await saveImageToDB(localBase64Image);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// 3. Nút Áp Dụng Bóng Đa Tầng
document.getElementById('btn-apply-shadow').addEventListener('click', () => {
    const newShadow = generateCurrentShadowString();
    if (newShadow) {
        appliedShadows.push(newShadow);
        updateTheme();
        alert(`Đã áp dụng thành công! Đang có ${appliedShadows.length} lớp bóng được xếp chồng.`);
    }
});

// 4. Nút Làm Mới Bóng
document.getElementById('btn-reset-shadow').addEventListener('click', () => {
    appliedShadows = []; 
    updateTheme();
    alert("Đã làm mới toàn bộ hiệu ứng đổ bóng!");
});

// Đóng bảng cài đặt bằng nút đỏ macOS
document.getElementById('mac-close-setting').onclick = () => {
    document.getElementById('setting-modal').classList.add('hidden');
};

// Hiệu ứng làm mờ khi kéo thanh trượt
const settingPanel = document.getElementById('setting-panel');
document.querySelectorAll('input[type="range"]').forEach(el => {
    el.addEventListener('input', updateTheme);
    el.addEventListener('touchstart', () => settingPanel.classList.add('transparent'), {passive: true});
    el.addEventListener('touchend', () => settingPanel.classList.remove('transparent'));
    el.addEventListener('mousedown', () => settingPanel.classList.add('transparent'));
    el.addEventListener('mouseup', () => settingPanel.classList.remove('transparent'));
});

// Lắng nghe thay đổi các ô input khác
document.querySelectorAll('.modal-body input:not([type="range"]):not([type="file"]), .modal-body select').forEach(el => {
    if(el.id !== 'input-bg-image') {
        el.addEventListener('change', updateTheme);
    }
});

document.addEventListener('DOMContentLoaded', loadSettings);