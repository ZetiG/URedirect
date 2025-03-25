// background.js

// 打开 IndexedDB 数据库
function openDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('RedirectDB', 1);
        request.onupgradeneeded = (event) => {
            let db = event.target.result;
            if (!db.objectStoreNames.contains('rules')) {
                db.createObjectStore('rules', { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

// 从 IndexedDB 加载规则
function loadRules(callback) {
    openDb().then(db => {
        const transaction = db.transaction(['rules'], 'readonly');
        const store = transaction.objectStore('rules');
        const request = store.getAll();
        request.onsuccess = () => callback(request.result);
        request.onerror = (event) => console.error('Error loading rules:', event.target.error);
    });
}

// 采用 declarativeNetRequest 的 transform 属性替换原来的 regexSubstitution 方法
function buildDynamicRules(redirectRules) {
    let dynamicRules = [];
    let ruleId = 1;
    for (const rule of redirectRules) {
        // 仅构建启用状态的规则
        if (!rule.enabled) continue;

        try {
            let sourceUrl = new URL(rule.sourceDomain);
            let destUrl = new URL(rule.destinationDomain);
            // 构造 URL 过滤器，匹配源域名及其所有路径
            let urlFilter = sourceUrl.origin + "/*";

            let dynamicRule = {
                id: ruleId++,
                priority: 1,
                action: {
                    type: "redirect",
                    redirect: {
                        transform: {
                            // 将请求 URL 的协议和主机部分替换为目标 URL 的对应值，
                            // 未指定 path、query、fragment 时，原始值会被保留
                            scheme: destUrl.protocol.replace(":", ""),
                            host: destUrl.hostname,
                            // 如果目标 URL 中未指定端口，则设为空字符串，表示移除原来的端口
                            port: destUrl.port || ""
                        }
                    }
                },
                condition: {
                    urlFilter: urlFilter,
                    resourceTypes: ["main_frame"] // 只匹配主框架请求
                }
            };
            dynamicRules.push(dynamicRule);
        } catch (e) {
            console.error("Rule processing error: ", rule, e);
        }
    }
    return dynamicRules;
}


// 更新动态规则
function updateDynamicRules() {
    loadRules((rules) => {
        console.log("Loading rules from IndexedDB:", rules); // Debug log
        chrome.declarativeNetRequest.getDynamicRules((existingRules) => {
            const existingIds = existingRules.map(rule => rule.id);
            console.log("Existing rules:", existingRules); // Debug log

            chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: existingIds,
                addRules: buildDynamicRules(rules)
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Updating rules error:", chrome.runtime.lastError);
                } else {
                    console.log("Rules updated successfully."); // Debug log
                }
            });
        });
    });
}

// 监听 IndexedDB 变化的方式：popup.js 修改数据后手动通知 background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "updateRules") {
        updateDynamicRules(); // 更新动态规则
        sendResponse({ status: "Rules updated" });
    }
});

// 初始加载规则并更新动态规则
updateDynamicRules();
