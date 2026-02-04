let currentEditIndex = null;

async function init() {
    let data = JSON.parse(localStorage.getItem('employeeData'));
    
    // 1. Initial Data Load from JSON
    if (!data) {
        try {
            const res = await fetch('../src/employee.json');
            if (res.ok) {
                data = await res.json();
                data = data.map(e => ({ ...e, history: e.history || [] }));
                localStorage.setItem('employeeData', JSON.stringify(data));
            }
        } catch (e) { console.error("Data Load Error"); }
    }

    // 2. Page Routing
    if (document.getElementById('adminTableBody')) renderAdmin(data);
    if (document.getElementById('loginList')) renderLoginList(data);
    if (document.getElementById('firedTableBody')) renderFiredTable();
}

// --- ADMIN DASHBOARD FUNCTIONS ---
function renderAdmin(data) {
    const body = document.getElementById('adminTableBody');
    if (!body) return;
    
    // Update Stats
    const totalStaff = document.getElementById('totalStaffCount');
    const totalPayroll = document.getElementById('totalPayroll');
    if (totalStaff) totalStaff.innerText = data.length;
    if (totalPayroll) {
        const total = data.reduce((sum, emp) => sum + (emp.salary / 12), 0);
        totalPayroll.innerText = `$${total.toLocaleString(undefined, {maximumFractionDigits: 0})}`;
    }

    body.innerHTML = '';
    data.forEach((emp, i) => {
        body.innerHTML += `
            <tr>
                <td><div class="user-cell"><img src="${emp.image}" class="avatar"><span>${emp.name}</span></div></td>
                <td><span class="badge">${emp.role}</span></td>
                <td class="desktop-only">$${emp.salary.toLocaleString()}</td>
                <td><button class="btn-manage" onclick="openManager(${i})">Manage</button></td>
            </tr>`;
    });
}

window.filterStaff = () => {
    const query = document.getElementById('staffSearch').value.toLowerCase();
    const data = JSON.parse(localStorage.getItem('employeeData')) || [];
    const filtered = data.filter(emp => emp.name.toLowerCase().includes(query));
    
    const body = document.getElementById('adminTableBody');
    body.innerHTML = '';
    filtered.forEach((emp) => {
        const originalIndex = data.findIndex(e => e.name === emp.name);
        body.innerHTML += `
            <tr>
                <td><div class="user-cell"><img src="${emp.image}" class="avatar"><span>${emp.name}</span></div></td>
                <td><span class="badge">${emp.role}</span></td>
                <td class="desktop-only">$${emp.salary.toLocaleString()}</td>
                <td><button class="btn-manage" onclick="openManager(${originalIndex})">Manage</button></td>
            </tr>`;
    });
};

window.openManager = (i) => {
    currentEditIndex = i;
    const data = JSON.parse(localStorage.getItem('employeeData'));
    const modal = document.getElementById('manageModal');
    if (modal) {
        document.getElementById('modalTitle').innerText = `Manage ${data[i].name}`;
        modal.style.display = 'flex';
        document.getElementById('actionSelect').value = '';
        document.getElementById('inputArea').innerHTML = '';
    }
};

window.closeModal = () => document.getElementById('manageModal').style.display = 'none';

window.toggleActionFields = () => {
    const action = document.getElementById('actionSelect').value;
    const area = document.getElementById('inputArea');
    const data = JSON.parse(localStorage.getItem('employeeData'));
    const emp = data[currentEditIndex];
    area.innerHTML = '';

    if (action === 'pay') area.innerHTML = `<label>Bonus/Paycheck Amount:</label><input type="number" id="actionVal" value="${(emp.salary/12).toFixed(2)}">`;
    else if (action === 'raise') area.innerHTML = `<label>Annual Salary Increase:</label><input type="number" id="actionVal" placeholder="e.g. 5000">`;
    else if (action === 'promote') {
        area.innerHTML = `<label>New Title:</label>
        <select id="actionVal">
            <option>Senior Director</option>
            <option>Vice President</option>
            <option>Board Of Directors</option>
            <option>Sales Supervisor</option>
            <option>Sales Manager</option>
        </select>`;
    }
    else if (action === 'feedback') area.innerHTML = `<label>Message to Employee:</label><textarea id="actionVal" rows="3"></textarea>`;
    else if (action === 'fire') area.innerHTML = `<p style="color:red; font-weight:bold;">Warning: Moving to Archive.</p>`;
};

const confirmBtn = document.getElementById('confirmBtn');
if (confirmBtn) {
    confirmBtn.onclick = () => {
        let data = JSON.parse(localStorage.getItem('employeeData'));
        let firedData = JSON.parse(localStorage.getItem('firedEmployees')) || [];
        const action = document.getElementById('actionSelect').value;
        const val = document.getElementById('actionVal')?.value;
        const today = new Date().toLocaleDateString();

        if (!data[currentEditIndex].history) data[currentEditIndex].history = [];

        if (action === 'pay') data[currentEditIndex].history.push({ date: today, type: "Paycheck", detail: `$${val}` });
        else if (action === 'raise') {
            data[currentEditIndex].salary += parseInt(val || 0);
            data[currentEditIndex].history.push({ date: today, type: "Raise", detail: `+$${val}/yr` });
        } else if (action === 'promote') {
            data[currentEditIndex].role = val;
            data[currentEditIndex].history.push({ date: today, type: "Promotion", detail: val });
        } else if (action === 'feedback') {
            data[currentEditIndex].history.push({ date: today, type: "Feedback", detail: val });
        } else if (action === 'fire') {
            const terminated = data.splice(currentEditIndex, 1)[0];
            terminated.history.push({ date: today, type: "Termination", detail: "Archived" });
            firedData.push(terminated);
            localStorage.setItem('firedEmployees', JSON.stringify(firedData));
        }

        localStorage.setItem('employeeData', JSON.stringify(data));
        renderAdmin(data);
        closeModal();
    };
}

// --- ARCHIVE FUNCTIONS ---
function renderFiredTable() {
    const body = document.getElementById('firedTableBody');
    const firedData = JSON.parse(localStorage.getItem('firedEmployees')) || [];
    if (!body) return;
    body.innerHTML = '';
    firedData.forEach((emp, i) => {
        body.innerHTML += `
            <tr>
                <td><div class="user-cell"><img src="${emp.image}" class="avatar"><span>${emp.name}</span></div></td>
                <td><span class="badge danger">Terminated</span></td>
                <td><button class="btn-primary" onclick="rehire(${i})">Rehire</button></td>
            </tr>`;
    });
}

window.rehire = (i) => {
    let data = JSON.parse(localStorage.getItem('employeeData'));
    let firedData = JSON.parse(localStorage.getItem('firedEmployees')) || [];
    const person = firedData.splice(i, 1)[0];
    person.history.push({ date: new Date().toLocaleDateString(), type: "Rehired", detail: "Active" });
    data.push(person);
    localStorage.setItem('employeeData', JSON.stringify(data));
    localStorage.setItem('firedEmployees', JSON.stringify(firedData));
    renderFiredTable();
};

// --- EMPLOYEE LOGIN FUNCTIONS ---
function renderLoginList(data) {
    const list = document.getElementById('loginList');
    if (!list) return;
    list.innerHTML = '';
    data.forEach((emp, i) => {
        list.innerHTML += `
            <label class="login-option">
                <input type="radio" name="employeeSelect" value="${i}">
                <img src="${emp.image}" class="avatar-sm">
                <span>${emp.name}</span>
            </label>`;
    });
}

window.loginEmployee = () => {
    const selected = document.querySelector('input[name="employeeSelect"]:checked');
    if (!selected) return alert("Select your name.");
    const data = JSON.parse(localStorage.getItem('employeeData'));
    const user = data[selected.value];
    document.getElementById('loginSection').style.display = 'none';
    const profile = document.getElementById('profileSection');
    profile.style.display = 'block';
    profile.innerHTML = `
        <div class="profile-header text-center">
            <img src="${user.image}" class="large-avatar">
            <h2>${user.name}</h2>
            <span class="badge">${user.role}</span>
        </div>
        <div class="history-section">
            <h3>My History & Feedback</h3>
            <div class="history-list">
                ${user.history.slice().reverse().map(h => `
                    <div class="history-item ${h.type.toLowerCase()}">
                        <div class="history-date">${h.date}</div>
                        <div class="history-main"><strong>${h.type}</strong><p>${h.detail}</p></div>
                    </div>`).join('')}
            </div>
        </div>
        <button onclick="location.reload()" class="btn-secondary full-width">Sign Out</button>`;
};

document.addEventListener('DOMContentLoaded', init);