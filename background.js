// background.js

// 从 storage 中加载规则
function loadRules(callback) {
    chrome.storage.local.get({ redirectRules: [] }, (data) => {
        callback(data.redirectRules);
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
                    resourceTypes: ["main_frame"]
                }
            };
            dynamicRules.push(dynamicRule);
        } catch (e) {
            console.error("规则处理错误:", rule, e);
        }
    }
    return dynamicRules;
}


// 更新动态规则：先移除现有规则，再添加新规则
function updateDynamicRules(rules) {
    chrome.declarativeNetRequest.getDynamicRules((existingRules) => {
        const existingIds = existingRules.map(rule => rule.id);
        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: existingIds,
            addRules: buildDynamicRules(rules)
        }, () => {
            if (chrome.runtime.lastError) {
                console.error("更新规则出错:", chrome.runtime.lastError);
            }
        });
    });
}

// 监听 storage 中规则的变化，实时更新动态规则
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.redirectRules) {
        updateDynamicRules(changes.redirectRules.newValue);
    }
});

// 初始加载规则并更新动态规则
loadRules((rules) => {
    updateDynamicRules(rules);
});
