document.addEventListener('DOMContentLoaded', function () {
    const ruleForm = document.getElementById('ruleForm');
    const sourceInput = document.getElementById('sourceDomain');
    const destinationInput = document.getElementById('destinationDomain');
    const rulesList = document.getElementById('rulesList');

    // 渲染规则列表
    function renderRules(rules) {
        rulesList.innerHTML = '';
        if (rules.length === 0) {
            rulesList.innerHTML = '<p>暂无规则</p>';
            return;
        }
        rules.forEach((rule, index) => {
            const ruleDiv = document.createElement('div');
            ruleDiv.className = 'rule';
            ruleDiv.innerHTML = `<strong>源域名:</strong> ${rule.sourceDomain}<br/><strong>目标域名:</strong> ${rule.destinationDomain} 
        <button data-index="${index}" class="deleteRule">删除</button>`;
            rulesList.appendChild(ruleDiv);
        });
    }

    // 从 storage 中加载规则
    function loadRules() {
        chrome.storage.local.get({ redirectRules: [] }, function(data) {
            renderRules(data.redirectRules);
        });
    }

    loadRules();

    // 表单提交，添加新规则
    ruleForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const sourceDomain = sourceInput.value.trim();
        const destinationDomain = destinationInput.value.trim();
        if (!sourceDomain || !destinationDomain) return;
        chrome.storage.local.get({ redirectRules: [] }, function(data) {
            let rules = data.redirectRules;
            rules.push({ sourceDomain, destinationDomain });
            chrome.storage.local.set({ redirectRules: rules }, function() {
                sourceInput.value = '';
                destinationInput.value = '';
                loadRules();
            });
        });
    });

    // 删除规则
    rulesList.addEventListener('click', function(e) {
        if (e.target.classList.contains('deleteRule')) {
            const index = parseInt(e.target.getAttribute('data-index'));
            chrome.storage.local.get({ redirectRules: [] }, function(data) {
                let rules = data.redirectRules;
                rules.splice(index, 1);
                chrome.storage.local.set({ redirectRules: rules }, loadRules);
            });
        }
    });
});
