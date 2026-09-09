// DOM Elements
const els = {
    statWaiting: document.getElementById('stat-waiting'),
    statTreated: document.getElementById('stat-treated'),
    statCritical: document.getElementById('stat-critical'),
    statBeds: document.getElementById('stat-beds'),
    queueCount: document.getElementById('queue-count'),
    queueContainer: document.getElementById('queue-container'),
    emptyState: document.getElementById('empty-state'),
    doctorsContainer: document.getElementById('doctors-container'),
    wardsContainer: document.getElementById('wards-container'),
    btnSimulate: document.getElementById('btn-simulate'),
    btnProcess: document.getElementById('btn-process'),
    btnDischarge: document.getElementById('btn-discharge')
};

// Utilities
const getSeverityDetails = (level) => {
    switch (level) {
        case 100: return { name: 'CRITICAL', color: 'var(--severity-critical)' };
        case 80: return { name: 'HIGH', color: 'var(--severity-high)' };
        case 50: return { name: 'MEDIUM', color: 'var(--severity-medium)' };
        case 20: return { name: 'LOW', color: 'var(--severity-low)' };
        default: return { name: 'UNKNOWN', color: 'var(--text-muted)' };
    }
};

const formatTime = (timestamp) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

// Update UI from state
function updateUI(state) {
    // Stats
    els.statWaiting.textContent = state.stats.waiting;
    els.statTreated.textContent = state.stats.treated;
    els.statCritical.textContent = state.stats.critical;
    els.statBeds.textContent = state.stats.bedsAvailable;
    
    const count = state.stats.waiting;
    els.queueCount.textContent = `${count} ${count === 1 ? 'UNIT' : 'UNITS'}`;

    // Queue
    Array.from(els.queueContainer.children).forEach(child => {
        if (child.id !== 'empty-state') child.remove();
    });

    if (state.queue.length === 0) {
        els.emptyState.style.display = 'block';
    } else {
        els.emptyState.style.display = 'none';
        
        state.queue.forEach(patient => {
            const sev = getSeverityDetails(patient.severityLevel);
            const div = document.createElement('div');
            div.className = 'f1-panel patient-card';
            div.style.borderLeftColor = sev.color;
            div.innerHTML = `
                <div style="display: flex; gap: 1.5rem; align-items: center;">
                    <div style="width: 50px; height: 50px; background: rgba(255,255,255,0.02); display: flex; align-items: center; justify-content: center; border: 1px solid ${sev.color}50; transform: skewX(-10deg);">
                        <div style="transform: skewX(10deg); color: ${sev.color};">
                            <i data-lucide="user" width="24" height="24"></i>
                        </div>
                    </div>
                    <div>
                        <h4 style="margin: 0 0 0.15rem 0; font-weight: 700; font-size: 1.4rem; letter-spacing: 0.02em; color: var(--text-main);">
                            ${patient.name.toUpperCase()} <span style="font-size: 1rem; color: var(--text-muted); font-weight: 400;">[${patient.patientID}]</span>
                        </h4>
                        <div style="display: flex; gap: 1.5rem; font-size: 0.85rem; color: var(--text-muted); font-family: 'Inter', sans-serif;">
                            <span><strong style="color: var(--text-main);">AGE</strong> ${patient.age}</span>
                            <span><strong style="color: var(--text-main);">BLD</strong> ${patient.bloodGroup}</span>
                            <span><strong style="color: var(--text-main);">SYM</strong> ${patient.symptoms}</span>
                        </div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(0,0,0,0.5); padding: 0.25rem 1rem; border: 1px solid ${sev.color}; margin-bottom: 0.5rem; transform: skewX(-10deg); box-shadow: 0 0 10px ${sev.color}40;">
                        <div style="transform: skewX(10deg); display: flex; align-items: center; gap: 0.5rem; color: ${sev.color};">
                            <i data-lucide="alert-triangle" width="16" height="16"></i>
                            <span style="font-size: 1.1rem; font-weight: 700; font-family: 'Teko', sans-serif; letter-spacing: 0.05em;">
                                ${sev.name} <span style="opacity: 0.7;">(PTS: ${patient.priorityScore})</span>
                            </span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; color: var(--text-muted); justify-content: flex-end; font-family: 'Inter', sans-serif; font-weight: 600;">
                        <i data-lucide="clock" width="12" height="12" style="color: var(--accent-color)"></i>
                        T+ ${formatTime(patient.arrivalTime)}
                    </div>
                </div>
            `;
            els.queueContainer.appendChild(div);
        });
        lucide.createIcons();
    }

    // Doctors
    els.doctorsContainer.innerHTML = state.doctors.map(doc => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; background: #000; border-left: 2px solid ${doc.available ? '#10b981' : 'var(--severity-critical)'};">
            <div>
                <div style="font-weight: 600; font-family: 'Inter', sans-serif; font-size: 0.85rem;">${doc.name.toUpperCase()}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-family: 'Inter', sans-serif;">${doc.dept.toUpperCase()}</div>
            </div>
            <div style="font-size: 1.1rem; font-family: 'Teko', sans-serif; color: ${doc.available ? '#10b981' : 'var(--severity-critical)'};">
                ${doc.available ? 'READY' : 'ENGAGED'}
            </div>
        </div>
    `).join('');

    // Wards
    els.wardsContainer.innerHTML = state.wards.map(ward => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; background: #000; border-left: 2px solid ${ward.beds > 0 ? 'var(--text-muted)' : 'var(--severity-critical)'};">
            <div style="font-weight: 600; font-family: 'Inter', sans-serif; font-size: 0.85rem;">${ward.type.toUpperCase()}</div>
            <div style="font-size: 1.2rem; font-family: 'Teko', sans-serif; color: ${ward.beds === 0 ? 'var(--severity-critical)' : 'var(--text-main)'};">
                ${ward.beds} BEDS
            </div>
        </div>
    `).join('');

    // Buttons
    els.btnProcess.disabled = state.queue.length === 0;
    els.btnDischarge.disabled = state.doctors.every(d => d.available);
}

// API Calls
async function fetchState() {
    try {
        const res = await fetch('/api/state');
        const state = await res.json();
        updateUI(state);
    } catch (e) {
        console.error("Failed to connect to C++ backend", e);
    }
}

async function simulate() {
    const res = await fetch('/api/simulate', { method: 'POST' });
    updateUI(await res.json());
}

async function processNext() {
    const res = await fetch('/api/process', { method: 'POST' });
    updateUI(await res.json());
}

async function discharge() {
    const res = await fetch('/api/discharge', { method: 'POST' });
    updateUI(await res.json());
}

// Event Listeners
els.btnSimulate.addEventListener('click', simulate);
els.btnProcess.addEventListener('click', processNext);
els.btnDischarge.addEventListener('click', discharge);

// Init
lucide.createIcons();
fetchState(); // Initial load from C++ server
