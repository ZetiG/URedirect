// popup.js

document.addEventListener('DOMContentLoaded', function () {
    const ruleForm = document.getElementById('ruleForm');
    const sourceInput = document.getElementById('sourceDomain');
    const destinationInput = document.getElementById('destinationDomain');
    const rulesList = document.getElementById('rulesList');
    const searchInput = document.getElementById('searchInput');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');

    let rules = [];
    let currentPage = 1;
    const rulesPerPage = 5;
    let editingRuleId = null;

    // 渲染规则列表
    function renderRules() {
        rules.sort((a, b) => b.timestamp - a.timestamp); // 确保按时间倒序排列

        const searchText = searchInput.value.trim().toLowerCase();
        const filteredRules = rules.filter(rule =>
            rule.sourceDomain.toLowerCase().includes(searchText) ||
            rule.destinationDomain.toLowerCase().includes(searchText)
        );

        const start = (currentPage - 1) * rulesPerPage;
        const paginatedRules = filteredRules.slice(start, start + rulesPerPage);

        rulesList.innerHTML = '';
        if (paginatedRules.length === 0) {
            rulesList.innerHTML = '<p>No Rules Available</p>';
            return;
        }

        paginatedRules.forEach((rule) => {
            const ruleDiv = document.createElement('div');
            ruleDiv.className = 'rule';
            ruleDiv.innerHTML = `
                <div class="text-container">
                    <span title="${rule.sourceDomain}"><strong>source:</strong> ${rule.sourceDomain}</span>
                    <span title="${rule.destinationDomain}"><strong>target:</strong> ${rule.destinationDomain}</span>
                </div>
                <div class="buttons">
                    <button data-id="${rule.id}" class="toggleRule">${rule.enabled ? 'Disable' : 'Enable'}</button>
                    <button data-id="${rule.id}" class="editRule">Edit</button>
                    <button data-id="${rule.id}" class="deleteRule">Delete</button>
                </div>
            `;
            rulesList.appendChild(ruleDiv);
        });

        pageInfo.textContent = `page ${currentPage} / of ${Math.ceil(filteredRules.length / rulesPerPage)}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage * rulesPerPage >= filteredRules.length;
    }

    // 保存规则到 IndexedDB
    function saveRules() {
        const request = indexedDB.open('RedirectDB', 1);
        request.onsuccess = function (event) {
            const db = event.target.result;
            const transaction = db.transaction(['rules'], 'readwrite');
            const store = transaction.objectStore('rules');
            store.clear();
            rules.forEach(rule => store.put(rule));
        };
        chrome.runtime.sendMessage({ action: "updateRules" }); // 发送消息更新 rules
    }

    // 加载规则
    function loadRules() {
        const request = indexedDB.open('RedirectDB', 1);

        // 如果数据库版本发生变化，或首次创建数据库，则触发 onupgradeneeded 事件
        request.onupgradeneeded = function(event) {
            const db = event.target.result;

            // 检查是否已存在 'rules' 对象存储，如果没有则创建
            if (!db.objectStoreNames.contains('rules')) {
                db.createObjectStore('rules', { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = function(event) {
            const db = event.target.result;

            // 这里只执行读取操作，保证数据库已经存在 'rules' 存储
            const transaction = db.transaction(['rules'], 'readonly');
            const store = transaction.objectStore('rules');
            const getAllRequest = store.getAll();

            getAllRequest.onsuccess = function() {
                rules = getAllRequest.result ? getAllRequest.result.sort((a, b) => b.timestamp - a.timestamp) : [];
                renderRules();
            };
        };

        request.onerror = function(event) {
            console.error('Database error:', event.target.error);
        };
    }

    // 添加或更新规则
    ruleForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const sourceDomain = sourceInput.value.trim();
        const destinationDomain = destinationInput.value.trim();
        if (!sourceDomain || !destinationDomain) return;

        const existingRule = rules.find(rule => rule.sourceDomain === sourceDomain);
        if (existingRule) {
            existingRule.destinationDomain = destinationDomain;
            existingRule.timestamp = Date.now();
            existingRule.enabled = true;
        } else {
            const newRule = {
                id: Date.now(),
                sourceDomain,
                destinationDomain,
                enabled: true,
                timestamp: Date.now()
            };
            rules.push(newRule);
        }

        saveRules();
        renderRules();
        sourceInput.value = '';
        destinationInput.value = '';
        editingRuleId = null;
    });

    // 事件监听
    rulesList.addEventListener('click', function (e) {
        const id = parseInt(e.target.getAttribute('data-id'));
        if (e.target.classList.contains('deleteRule')) {
            rules = rules.filter(rule => rule.id !== id);
            saveRules();
            renderRules();
        } else if (e.target.classList.contains('toggleRule')) {
            const rule = rules.find(rule => rule.id === id);
            rule.enabled = !rule.enabled; // 切换启用/禁用状态
            saveRules(); // 更新到 IndexedDB
            renderRules(); // 更新 UI
        } else if (e.target.classList.contains('editRule')) {
            const rule = rules.find(rule => rule.id === id);
            sourceInput.value = rule.sourceDomain;
            destinationInput.value = rule.destinationDomain;
            editingRuleId = rule.id;
        }
    });

    // 搜索规则
    searchInput.addEventListener('keyup', function () {
        currentPage = 1;
        renderRules();
    });

    // 分页控制
    prevPageBtn.addEventListener('click', () => {
        currentPage--;
        renderRules();
    });

    nextPageBtn.addEventListener('click', () => {
        currentPage++;
        renderRules();
    });

    loadRules();
});
