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

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
}

function updateTheme() {
    const bgUrl = document.getElementById('input-bg-image').value;
    root.style.setProperty('--bg-image', bgUrl ? `url(${bgUrl})` : 'none');
    
    root.style.setProperty('--bg-color', document.getElementById('color-bg').value);
    root.style.setProperty('--container-color', hexToRgb(document.getElementById('color-container').value));
    root.style.setProperty('--container-opacity', document.getElementById('slider-opacity').value / 100);
    root.style.setProperty('--container-radius', document.getElementById('slider-radius-container').value + 'px');
    
    root.style.setProperty('--icon-size', document.getElementById('slider-icon-size').value + 'px');
    root.style.setProperty('--icon-radius', document.getElementById('slider-radius-icon').value + 'px');
    root.style.setProperty('--text-size', document.getElementById('slider-text-size').value + 'px');
    root.style.setProperty('--text-spacing', document.getElementById('slider-text-spacing').value + 'px');
    root.style.setProperty('--text-color', document.getElementById('color-text').value);
    root.style.setProperty('--show-name', document.getElementById('check-show-name').checked ? 'block' : 'none');

    const shadowStr = shadowTemplates.find(t => t.id === document.getElementById('select-shadow-type').value)?.template
        .replace(/{x}/g, document.getElementById('slider-shadow-x').value)
        .replace(/{y}/g, document.getElementById('slider-shadow-y').value)
        .replace(/{b}/g, document.getElementById('slider-shadow-b').value)
        .replace(/{s}/g, document.getElementById('slider-shadow-s').value)
        .replace(/{c}/g, document.getElementById('color-shadow').value);
    
    if (shadowStr) root.style.setProperty('--shadow-value', shadowStr);
    saveSettings();
}

function saveSettings() {
    const config = {
        bgUrl: document.getElementById('input-bg-image').value,
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
        shadowType: document.getElementById('select-shadow-type').value,
        shadowX: document.getElementById('slider-shadow-x').value,
        shadowY: document.getElementById('slider-shadow-y').value,
        shadowB: document.getElementById('slider-shadow-b').value,
        shadowS: document.getElementById('slider-shadow-s').value,
        shadowColor: document.getElementById('color-shadow').value
    };
    localStorage.setItem('qal_theme', JSON.stringify(config));
}

function loadSettings() {
    const shadowSelect = document.getElementById('select-shadow-type');
    shadowTemplates.forEach(t => {
        let opt = document.createElement('option'); opt.value = t.id; opt.textContent = t.name;
        opt.dataset.i18n = t.nameKey; shadowSelect.appendChild(opt);
    });

    const saved = JSON.parse(localStorage.getItem('qal_theme')) || {};
    document.getElementById('input-bg-image').value = saved.bgUrl || '';
    document.getElementById('color-bg').value = saved.bgColor || (isLight ? '#f2f2f7' : '#000000');
    document.getElementById('color-container').value = saved.containerColor || (isLight ? '#ffffff' : '#ffffff');
    document.getElementById('slider-opacity').value = saved.containerOpacity || (isLight ? 60 : 15);
    document.getElementById('slider-radius-container').value = saved.containerRadius || 35;
    
    document.getElementById('slider-icon-size').value = saved.iconSize || 60;
    document.getElementById('slider-radius-icon').value = saved.iconRadius || 14;
    document.getElementById('slider-text-size').value = saved.textSize || 11;
    document.getElementById('slider-text-spacing').value = saved.textSpacing || 0;
    document.getElementById('color-text').value = saved.textColor || (isLight ? '#000000' : '#ffffff');
    document.getElementById('check-show-name').checked = saved.showName !== false;

    document.getElementById('select-shadow-type').value = saved.shadowType || 'outer';
    document.getElementById('slider-shadow-x').value = saved.shadowX || 0;
    document.getElementById('slider-shadow-y').value = saved.shadowY || 10;
    document.getElementById('slider-shadow-b').value = saved.shadowB || 20;
    document.getElementById('slider-shadow-s').value = saved.shadowS || 0;
    document.getElementById('color-shadow').value = saved.shadowColor || (isLight ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.5)');
    
    updateTheme();
}

// Xử lý upload ảnh Local
document.getElementById('input-bg-file').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('input-bg-image').value = e.target.result;
            updateTheme();
        };
        reader.readAsDataURL(file);
    }
});

// Xử lý làm mờ Modal Setting khi kéo Slider
const settingPanel = document.getElementById('setting-panel');
document.querySelectorAll('input[type="range"]').forEach(el => {
    el.addEventListener('input', updateTheme);
    el.addEventListener('touchstart', () => settingPanel.classList.add('transparent'), {passive: true});
    el.addEventListener('touchend', () => settingPanel.classList.remove('transparent'));
    el.addEventListener('mousedown', () => settingPanel.classList.add('transparent'));
    el.addEventListener('mouseup', () => settingPanel.classList.remove('transparent'));
});
document.querySelectorAll('.modal-body input:not([type="range"]), .modal-body select').forEach(el => el.addEventListener('change', updateTheme));

document.addEventListener('DOMContentLoaded', loadSettings);
