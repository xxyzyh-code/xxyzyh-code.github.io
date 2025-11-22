// main.js

// 導入所有必要的模組。
// 只需要導入 PlayerCore，因為它已經在內部導入了 Config.js 和其他所有依賴。
// 這種單一入口模式確保了正確的模組載入順序和作用域鏈接。

import './PlayerCore.js';

// PlayerCore.js 內部包含了 document.addEventListener('DOMContentLoaded', ...)
// 它會負責：
// 1. 調用 initializeDOMElements()
// 2. 調用 initializePlayer()
// 3. 啟動整個播放器流程。

// 因此，main.js 不需要任何額外的代碼。
