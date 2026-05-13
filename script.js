// ==========================================
// ESTADO DO BANCO DE DADOS (LOCALSTORAGE)
// ==========================================
let db = {
    sectors: JSON.parse(localStorage.getItem('jmsg_ent_sectors')) || ['P&D', 'Logística', 'Diretoria'],
    tasks: JSON.parse(localStorage.getItem('jmsg_ent_tasks')) || [],
    cycleStart: localStorage.getItem('jmsg_ent_cycle_start') || null // Null identifica aparelhos novos
};

// Sanitização de dados antigos
db.tasks = db.tasks.map(t => {
    if (!t.timeStart) {
        t.timeStart = t.time || '00:00';
        t.timeEnd = t.timeEnd || '00:00';
        t.color = t.color || 'var(--navy)';
    }
    t.cycleDay = t.cycleDay || 1;
    return t;
});

function getCurrentCycleDay() {
    if (!db.cycleStart) return 1;
    const start = new Date(db.cycleStart);
    const diffTime = Math.abs(new Date() - start);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

// ==========================================
// 1. RELÓGIO E CICLO DE 28 DIAS
// ==========================================
function updateClock() {
    const now = new Date();
    document.getElementById('clock').innerText = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Trava a execução do ciclo se o Onboarding não foi concluído
    if (!db.cycleStart) return;

    let currentDay = getCurrentCycleDay();
    
    // Reseta o ciclo se passar de 28 dias
    if (currentDay > 28) {
        db.tasks = [];
        db.cycleStart = new Date().toISOString();
        saveDB();
        currentDay = 1;
    }
    document.getElementById('cycle-counter').innerText = `Dia ${currentDay}/28`;

    // Motor de Falha Automática
    const todayStr = now.toISOString().split('T')[0];
    const timeOnly = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    let changed = false;

    db.tasks.forEach(t => {
        if (t.status === 'pending') {
            if (t.date < todayStr || (t.date === todayStr && t.timeEnd < timeOnly)) {
                t.status = 'failed';
                changed = true;
            }
        }
    });

    if (changed) { 
        saveDB(); 
        renderTasks(); 
    }
}
setInterval(updateClock, 1000);
updateClock();

// ==========================================
// 2. MOTOR DE TEMA (SÓLIDO)
// ==========================================
const themeToggle = document.getElementById('themeToggle');
const iconSun = document.getElementById('theme-icon-sun');
const iconMoon = document.getElementById('theme-icon-moon');
let isDark = localStorage.getItem('jmsg_ent_theme') === 'dark';

function applyTheme() {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    if (isDark) { 
        iconSun.classList.remove('hidden'); 
        iconMoon.classList.add('hidden'); 
    } else { 
        iconSun.classList.add('hidden'); 
        iconMoon.classList.remove('hidden'); 
    }
}

themeToggle.addEventListener('click', () => {
    isDark = !isDark;
    localStorage.setItem('jmsg_ent_theme', isDark ? 'dark' : 'light');
    applyTheme();
});
applyTheme();

// ==========================================
// 3. ROTEAMENTO DE ABAS
// ==========================================
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        document.getElementById(e.currentTarget.dataset.target).classList.add('active');
    });
});

// ==========================================
// 4. GESTÃO DE SETORES
// ==========================================
function renderSectors() {
    const select = document.getElementById('op-sector');
    const list = document.getElementById('sector-list');
    
    if (select && list) {
        select.innerHTML = ''; 
        list.innerHTML = '';
        
        db.sectors.forEach((sector, i) => {
            select.innerHTML += `<option value="${sector}">${sector}</option>`;
            list.innerHTML += `
                <div class="sector-item" id="sector-item-${i}">
                    <span>${sector}</span>
                    <div class="sector-actions">
                        <button class="edit-btn" onclick="inlineEditSector(${i})">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="del-btn" onclick="removeSector(${i})">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </div>`;
        });
    }
}

document.getElementById('btn-add-sector').addEventListener('click', () => {
    const input = document.getElementById('new-sector');
    const val = input.value.trim();
    if (val) {
        db.sectors.push(val);
        saveDB();
        renderSectors();
        input.value = '';
    }
});

window.removeSector = (i) => {
    db.sectors.splice(i, 1);
    saveDB();
    renderSectors();
};

window.inlineEditSector = (i) => {
    const item = document.getElementById(`sector-item-${i}`);
    item.innerHTML = `
        <div class="input-row-flex" style="width:100%; gap:8px;">
            <input type="text" id="edit-sec-${i}" value="${db.sectors[i]}" style="padding: 8px 12px; flex: 1;">
            <button class="btn-inline-icon btn-inline-ok" onclick="saveInlineSector(${i})" title="Confirmar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </button>
            <button class="btn-inline-icon btn-inline-cancel" onclick="renderSectors()" title="Cancelar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
    `;
};

window.saveInlineSector = (i) => {
    const val = document.getElementById(`edit-sec-${i}`).value.trim();
    if (val) { 
        db.sectors[i] = val; 
        saveDB(); 
        renderSectors(); 
    }
};

// ==========================================
// 5. MOTOR DE OPERAÇÕES
// ==========================================
let editingTaskId = null;

document.getElementById('task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const taskData = {
        date: new Date().toISOString().split('T')[0],
        week: getWeek(new Date()),
        cycleDay: getCurrentCycleDay(),
        title: document.getElementById('op-title').value,
        timeStart: document.getElementById('op-time-start').value,
        timeEnd: document.getElementById('op-time-end').value,
        sector: document.getElementById('op-sector').value,
        color: document.getElementById('op-color').value,
        details: {
            what: document.getElementById('gc-what').value || 'N/A',
            how: document.getElementById('gc-how').value || 'N/A',
            why: document.getElementById('gc-why').value || 'N/A',
            trigger: document.getElementById('hl-trigger').value || 'N/A',
            reward: document.getElementById('hl-reward').value || 'N/A',
            effort: document.getElementById('auto-effort').value || 'N/A',
            steps: document.getElementById('auto-steps').value || 'N/A',
            confidence: document.getElementById('auto-confidence').value || 'N/A',
            realReward: document.getElementById('auto-realreward').value || 'N/A'
        }
    };

    if (editingTaskId) {
        const index = db.tasks.findIndex(t => t.id === editingTaskId);
        if (index > -1) {
            db.tasks[index] = { ...db.tasks[index], ...taskData };
        }
        editingTaskId = null;
        
        document.querySelector('#task-form button[type="submit"]').innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Deploy Operacional
        `;
        const delBtn = document.getElementById('btn-del-editing');
        if (delBtn) delBtn.style.display = 'none';
    } else {
        taskData.id = Date.now();
        taskData.status = 'pending';
        db.tasks.push(taskData);
    }
    
    saveDB(); 
    e.target.reset(); 
    renderTasks();
    document.querySelector('[data-target="agenda"]').click();
});

function getWeek(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    return Math.ceil((((d - new Date(Date.UTC(d.getUTCFullYear(),0,1))) / 86400000) + 1)/7);
}

function renderTasks() {
    const list = document.getElementById('task-list'); 
    list.innerHTML = '';
    
    const pendingTasks = db.tasks.filter(t => t.status === 'pending');
    const sorted = [...pendingTasks].sort((a,b) => a.timeStart.localeCompare(b.timeStart));

    if (sorted.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <p>Nenhuma operação ativa na sua janela.</p>
                <span style="font-size: 12px; margin-top: 4px;">Acesse "NEW OPS" no menu superior para iniciar um deploy.</span>
            </div>
        `;
    } else {
        sorted.forEach(task => {
            const el = document.createElement('div');
            el.className = 'task-item';
            el.innerHTML = `
                <div class="task-header">
                    <div class="task-tag" style="background-color: ${task.color || 'var(--navy)'};">
                        D-${task.cycleDay} | ${task.sector}
                    </div>
                    <div class="task-time-box">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        <span class="task-time">${task.timeStart} - ${task.timeEnd}</span>
                    </div>
                </div>
                <h4>${task.title}</h4>
            `;
            el.onclick = () => openTaskModal(task);
            list.appendChild(el);
        });
    }
    
    updateKPIs();
    renderHistory();
}

// ==========================================
// 6. HISTÓRICO DE OPERAÇÕES
// ==========================================
function renderHistory() {
    const list = document.getElementById('history-list');
    if (!list) return;
    list.innerHTML = '';

    const historyTasks = db.tasks.filter(t => t.status === 'done' || t.status === 'failed').sort((a,b) => b.id - a.id);

    if (historyTasks.length === 0) {
        list.innerHTML = '<p style="font-size: 13px; color: var(--text-muted); text-align: center; margin-top: 16px;">Nenhum log registrado neste ciclo.</p>';
        return;
    }

    historyTasks.forEach(t => {
        const isSuccess = t.status === 'done';
        const statusClass = isSuccess ? 'success' : 'failed';
        const statusText = isSuccess ? 'Concluída' : 'Falhou';
        
        const el = document.createElement('div');
        el.className = 'task-item';
        el.style.borderColor = isSuccess ? '#047857' : 'var(--bordeaux)';
        el.style.marginBottom = '8px';
        el.innerHTML = `
            <div class="task-header">
                <div style="font-size: 11px; font-weight: 800; color: var(--text-muted);">
                    D-${t.cycleDay} | ${t.date.split('-').reverse().join('/')}
                </div>
                <div class="status-badge ${statusClass}">${statusText}</div>
            </div>
            <h4 style="margin: 8px 0;">${t.title}</h4>
            <div class="task-time-box" style="display: inline-flex; width: auto; background: transparent; padding: 0; border: none;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <span class="task-time" style="font-size: 12px; margin-left: 6px;">${t.timeStart} - ${t.timeEnd}</span>
            </div>
        `;
        el.onclick = () => openTaskModal(t, true); // True sinaliza que é Histórico
        list.appendChild(el);
    });
}

// ==========================================
// 7. ATUALIZAÇÃO TRIPLA DE KPIs (NOVA LÓGICA)
// ==========================================
function updateKPIs() {
    if (!db.cycleStart) return;

    const today = new Date().toISOString().split('T')[0];
    const currentDay = getCurrentCycleDay(); // 1 a 28

    // --- 1. DIÁRIO: Baseado nas tarefas estipuladas para hoje ---
    const dailyTasks = db.tasks.filter(t => t.date === today);
    let dVal = 0;
    if (dailyTasks.length > 0) {
        const done = dailyTasks.filter(t => t.status === 'done').length;
        dVal = Math.round((done / dailyTasks.length) * 100);
    }

    // --- 2. SEMANAL: Baseado no tempo corrido (1 a 7 dias) ---
    let dayOfWeekCycle = currentDay % 7;
    if (dayOfWeekCycle === 0) dayOfWeekCycle = 7;
    const wVal = Math.round((dayOfWeekCycle / 7) * 100);

    // --- 3. MENSAL: Baseado no tempo corrido do ciclo (1 a 28 dias) ---
    const mVal = Math.round((currentDay / 28) * 100);

    setRadial('daily', dVal);
    setRadial('weekly', wVal);
    setRadial('monthly', mVal);
}

function setRadial(id, val) {
    document.getElementById(`radial-${id}`).setAttribute('stroke-dasharray', `${val}, 100`);
    document.getElementById(`txt-${id}`).innerText = `${val}%`;
    document.getElementById(`txt-${id}`).dataset.val = val; 
}

// ==========================================
// 8. MODAIS (TAREFAS, HISTÓRICO E AUDITORIA)
// ==========================================
const tModal = document.getElementById('task-modal');
const kModal = document.getElementById('kpi-modal');

// A função agora atende a Criação (Ações) e Histórico (Somente Leitura)
function openTaskModal(task, isHistory = false) {
    document.getElementById('modal-sector').innerText = task.sector;
    document.getElementById('modal-title').innerText = task.title;
    
    let buttonsHtml = '';
    
    if (isHistory) {
        const statusColor = task.status === 'done' ? '#047857' : 'var(--bordeaux)';
        const statusText = task.status === 'done' ? 'OPERAÇÃO CONCLUÍDA' : 'OPERAÇÃO FALHOU';
        buttonsHtml = `
            <div style="margin-top: 16px; padding: 12px; border-radius: 12px; background: var(--bg-element); border: 2px solid ${statusColor}; color: ${statusColor}; text-align: center; font-weight: 800; text-transform: uppercase;">
                ${statusText}
            </div>
        `;
    } else {
        buttonsHtml = `
            <div style="display:flex; gap:8px; margin-top:8px;">
                <button class="btn-solid" onclick="completeTask(${task.id})" style="flex:1;">Concluir</button>
                <button class="btn-outline" onclick="editTask(${task.id})" style="flex:1; margin-top:0;">Editar</button>
                <button class="btn-outline" onclick="deleteTask(${task.id})" style="flex:0 0 50px; margin-top:0; border-color: var(--bordeaux); color: var(--bordeaux); padding: 0; display: flex; align-items: center; justify-content: center;" title="Excluir">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;
    }

    document.getElementById('modal-body').innerHTML = `
        <div class="info-box">
            <h5>Golden Circle</h5>
            <p><strong>O quê:</strong> ${task.details.what}</p>
            <p><strong>Como:</strong> ${task.details.how}</p>
            <p><strong>Por quê:</strong> ${task.details.why}</p>
        </div>
        <div class="info-box">
            <h5>Loop do Hábito</h5>
            <p><strong>Gatilho:</strong> ${task.details.trigger}</p>
            <p><strong>Recompensa:</strong> ${task.details.reward}</p>
        </div>
        <div class="info-box">
            <h5>Automação</h5>
            <p>Esforço: ${task.details.effort} | Confiança: ${task.details.confidence}</p>
        </div>
        ${buttonsHtml}
    `;
    tModal.classList.remove('hidden');
}

window.editTask = (id) => {
    const task = db.tasks.find(t => t.id === id);
    if (!task) return;
    
    editingTaskId = id;
    
    document.getElementById('op-title').value = task.title;
    document.getElementById('op-time-start').value = task.timeStart;
    document.getElementById('op-time-end').value = task.timeEnd;
    document.getElementById('op-sector').value = task.sector;
    document.getElementById('op-color').value = task.color || 'var(--navy)';
    
    document.getElementById('gc-what').value = task.details.what !== 'N/A' ? task.details.what : '';
    document.getElementById('gc-how').value = task.details.how !== 'N/A' ? task.details.how : '';
    document.getElementById('gc-why').value = task.details.why !== 'N/A' ? task.details.why : '';
    document.getElementById('hl-trigger').value = task.details.trigger !== 'N/A' ? task.details.trigger : '';
    document.getElementById('hl-reward').value = task.details.reward !== 'N/A' ? task.details.reward : '';
    document.getElementById('auto-effort').value = task.details.effort !== 'N/A' ? task.details.effort : '';
    document.getElementById('auto-steps').value = task.details.steps !== 'N/A' ? task.details.steps : '';
    document.getElementById('auto-confidence').value = task.details.confidence !== 'N/A' ? task.details.confidence : '';
    document.getElementById('auto-realreward').value = task.details.realReward !== 'N/A' ? task.details.realReward : '';
    
    const submitBtn = document.querySelector('#task-form button[type="submit"]');
    submitBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
        Atualizar Operação
    `;
    
    let delBtn = document.getElementById('btn-del-editing');
    if (!delBtn) {
        delBtn = document.createElement('button');
        delBtn.id = 'btn-del-editing';
        delBtn.className = 'btn-outline';
        delBtn.style.borderColor = 'var(--bordeaux)';
        delBtn.style.color = 'var(--bordeaux)';
        delBtn.type = 'button';
        delBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            Excluir Operação
        `;
        submitBtn.insertAdjacentElement('afterend', delBtn);
    }
    delBtn.style.display = 'flex';
    delBtn.onclick = () => deleteTask(id);
    
    tModal.classList.add('hidden');
    document.querySelector('[data-target="nova-op"]').click();
};

window.completeTask = (id) => {
    const task = db.tasks.find(t => t.id === id);
    if (task) {
        task.status = 'done';
        saveDB(); 
        renderTasks(); 
        tModal.classList.add('hidden');
    }
};

window.deleteTask = (id) => {
    if (confirm("Confirma a exclusão permanente desta operação?")) {
        db.tasks = db.tasks.filter(t => t.id !== id);
        saveDB(); 
        renderTasks();
        
        if (editingTaskId === id) {
            editingTaskId = null;
            document.getElementById('task-form').reset();
            document.querySelector('#task-form button[type="submit"]').innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                Deploy Operacional
            `;
            const delBtn = document.getElementById('btn-del-editing');
            if (delBtn) delBtn.style.display = 'none';
            document.querySelector('[data-target="agenda"]').click();
        }
        tModal.classList.add('hidden');
    }
};

document.querySelectorAll('.close-modal').forEach(b => b.onclick = () => tModal.classList.add('hidden'));

// Auditoria de KPI (Modal Customizado Inteligente)
window.openKPIModal = (label, id) => {
    const progress = parseInt(document.getElementById(`txt-${id}`).dataset.val || 0);
    const hour = new Date().getHours();
    
    document.getElementById('kpi-modal-title').innerText = `Auditoria ${label}`;
    
    const iconContainer = document.getElementById('kpi-modal-icon');
    const msgContainer = document.getElementById('kpi-modal-message');

    if (progress < 50 && hour >= 18 && id === 'daily') {
        // Trocado de #7A003C para var(--bordeaux)
        iconContainer.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--bordeaux)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
        msgContainer.innerHTML = `<span style="color: var(--bordeaux);">Aviso Crítico:</span> Progresso atual é de <strong>${progress}%</strong>. A métrica está abaixo do limiar operacional esperado para o fechamento da janela das 18h.`;
    } else {
        // A MÁGICA ESTÁ AQUI: Trocado de #0F172A para var(--navy). Ele vai ficar branco no Dark Mode!
        iconContainer.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
        msgContainer.innerHTML = `Sistema operando em parâmetros nominais. O progresso do ciclo ${label.toLowerCase()} está em <strong>${progress}%</strong>.`;
    }
    
    kModal.classList.remove('hidden');
};

document.querySelectorAll('.close-kpi').forEach(b => b.onclick = () => kModal.classList.add('hidden'));

// ==========================================
// 9. PERSISTÊNCIA E ZONA DE PERIGO
// ==========================================
function saveDB() {
    localStorage.setItem('jmsg_ent_sectors', JSON.stringify(db.sectors));
    localStorage.setItem('jmsg_ent_tasks', JSON.stringify(db.tasks));
    if (db.cycleStart) localStorage.setItem('jmsg_ent_cycle_start', db.cycleStart);
}

// Exportação (Backup)
document.getElementById('btn-export').onclick = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; 
    a.download = `JMSG_OS_BACKUP_${new Date().toISOString().slice(0,10)}.json`;
    a.click(); 
    URL.revokeObjectURL(url);
};

// Reset Geral (Apaga tudo)
const btnReset = document.getElementById('btn-reset-db');
if (btnReset) {
    btnReset.addEventListener('click', () => {
        const confirmar = confirm("ALERTA CRÍTICO: Você está prestes a apagar TODOS os dados do sistema. Esta ação NÃO pode ser desfeita. Deseja continuar?");
        
        if (confirmar) {
            localStorage.removeItem('jmsg_ent_sectors');
            localStorage.removeItem('jmsg_ent_tasks');
            localStorage.removeItem('jmsg_ent_cycle_start');
            location.reload(); 
        }
    });
}

// ==========================================
// 10. ONBOARDING E IMPORTAÇÃO
// ==========================================
const fileImport = document.getElementById('file-import');
const btnImport = document.getElementById('btn-import');

// Lógica de importação a partir do botão do relatório ou do onboarding
function handleJSONImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedDB = JSON.parse(e.target.result);
            if (importedDB.sectors && Array.isArray(importedDB.tasks) && importedDB.cycleStart) {
                db = importedDB;
                saveDB();
                alert("Operação bem-sucedida! Banco de dados restaurado.");
                location.reload(); 
            } else {
                alert("FALHA CRÍTICA: Arquivo JSON corrompido ou formato incompatível.");
            }
        } catch (err) {
            alert("Erro ao decodificar o arquivo JSON.");
        }
    };
    reader.readAsText(file);
}

if (btnImport && fileImport) {
    btnImport.addEventListener('click', () => fileImport.click());
    fileImport.addEventListener('change', handleJSONImport);
}

// Checagem de primeiro uso
function checkOnboarding() {
    if (!db.cycleStart) {
        // Trava a interface com a tela de boas-vindas
        const overlay = document.createElement('div');
        overlay.className = 'custom-modal';
        overlay.style.zIndex = '9999';
        overlay.innerHTML = `
            <div class="modal-card kpi-card-focus" style="text-align: center; padding: 40px 24px;">
                <!-- SVG Centralizado -->
                <svg width="64" height="64" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto 24px auto;">
                    <path fill="var(--bordeaux)" d="M19 13v-3h-1V9h-1V6h-1V4h-1V3h-1V2h-1V1h-2v1h1v2h-1v2h-1v1H9v1H8v1H7v1H6v3h1v2H6v-1H5v-2H4v2H3v3h1v2h1v1h1v1h1v1h1v1h8v-1h1v-1h1v-1h1v-2h1v-5zm-2 7h-1v1h-2v1h-4v-1H9v-4h1v-1h1v-1h1v-1h1v-3h-1v-1h-1V9h1v1h2v2h1v5h-1v2h1v-1h1v-1h1z"/>
                </svg>
                
                <h2 style="font-size: 26px; font-weight: 800; color: var(--navy); margin-bottom: 12px;">SySMATIK OS</h2>
                <p style="font-size: 15px; color: var(--text-muted); margin-bottom: 32px; line-height: 1.5;">Sistema operacional centralizado detectado. Para começar, inicie um novo ciclo de produtividade ou restaure um backup prévio.</p>
                
                <button class="btn-solid" id="btn-start-fresh" style="margin-bottom: 16px;">Iniciar Novo Ciclo (28 Dias)</button>
                <button class="btn-outline" id="btn-import-first" style="margin-top: 0;">Restaurar de JSON</button>

                <!-- Dica para Instalar como App -->
                <div style="margin-top: 28px; padding: 16px; background-color: var(--bg-element); border: 2px dashed var(--border); border-radius: 16px; display: flex; align-items: flex-start; gap: 12px; text-align: left;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                        <line x1="12" y1="18" x2="12.01" y2="18"></line>
                    </svg>
                    <p style="font-size: 12px; font-weight: 700; color: var(--text-muted); line-height: 1.4; margin: 0;">
                        <strong>Dica do Sistema:</strong> Adicione esta página à <span style="color: var(--navy);">Tela Inicial</span> do seu smartphone para utilizar como um App nativo (Fullscreen).
                    </p>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('btn-start-fresh').addEventListener('click', () => {
            db.cycleStart = new Date().toISOString();
            saveDB();
            document.body.removeChild(overlay);
            renderSectors();
            renderTasks();
            updateClock();
        });

        document.getElementById('btn-import-first').addEventListener('click', () => {
            // Reaproveita o input de arquivo invisível
            fileImport.click();
        });
    } else {
        // Fluxo normal para quem já iniciou o ciclo
        renderSectors(); 
        renderTasks();
    }
}

// ==========================================
// FECHAR MODAIS AO CLICAR NO FUNDO ESCURO
// ==========================================
document.querySelectorAll('.custom-modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        // Se o clique foi exatamente no fundo (e não dentro do card)
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
});

// ==========================================
// INICIALIZAÇÃO GERAL
// ==========================================
checkOnboarding();
