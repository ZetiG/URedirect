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

    // 保存规则
    function saveRules() {
        chrome.storage.local.set({ redirectRules: rules });
    }

    // 加载规则
    function loadRules() {
        chrome.storage.local.get({ redirectRules: [] }, function (data) {
            rules = data.redirectRules.sort((a, b) => b.timestamp - a.timestamp);
            renderRules();
        });
    }

    // 添加或更新规则
    ruleForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const sourceDomain = sourceInput.value.trim();
        const destinationDomain = destinationInput.value.trim();
        if (!sourceDomain || !destinationDomain) return;

        // 查找是否已有相同源域名规则
        const existingRule = rules.find(rule => rule.sourceDomain === sourceDomain);

        if (existingRule) {
            // 更新已有规则
            existingRule.destinationDomain = destinationDomain;
            existingRule.timestamp = Date.now();
            existingRule.enabled = true; // 编辑时默认重新启用
        } else {
            // 添加新规则
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
        editingRuleId = null;  // 清除编辑状态
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
            rule.enabled = !rule.enabled;
            saveRules();
            renderRules();
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
