// Calculator state
const calculatorState = {
    currentMode: 'basic',
    angleMode: 'DEG',
    memory: 0,
    currentExpression: '',
    result: '0',
    waitingForNext: false
};

// DOM Elements
const display = document.getElementById('display');
const expressionDisplay = document.getElementById('expressionDisplay');
const modeToggle = document.getElementById('modeToggle');
const scientificPanel = document.querySelector('.scientific-panel');
const historyList = document.getElementById('historyList');
const expressionInput = document.getElementById('expressionInput');
const evaluateExpressionBtn = document.getElementById('evaluateExpression');
const clearHistoryBtn = document.getElementById('clearHistory');
const errorModal = document.getElementById('errorModal');
const errorMessage = document.getElementById('errorMessage');

// Initialize calculator
function initCalculator() {
    setupEventListeners();
    loadHistory();
    updateDisplay();
}

// Setup event listeners
function setupEventListeners() {
    // Mode toggle
    modeToggle.addEventListener('change', switchMode);
    
    // Number buttons
    document.querySelectorAll('.btn.number').forEach(button => {
        button.addEventListener('click', () => handleNumber(button.dataset.value));
    });
    
    // Operation buttons
    document.querySelectorAll('.btn.operation').forEach(button => {
        button.addEventListener('click', () => handleOperation(button.dataset.action));
    });
    
    // Function buttons
    document.querySelectorAll('.btn.function').forEach(button => {
        button.addEventListener('click', () => handleFunction(button.dataset.function));
    });
    
    // Memory buttons
    document.querySelectorAll('.btn.memory').forEach(button => {
        button.addEventListener('click', () => handleMemory(button.dataset.action));
    });
    
    // Clear buttons
    document.querySelectorAll('.btn.clear').forEach(button => {
        button.addEventListener('click', () => handleClear(button.dataset.action));
    });
    
    // Constants
    document.querySelectorAll('.btn.constant-btn').forEach(button => {
        button.addEventListener('click', () => handleConstant(button.dataset.constant));
    });
    
    // Expression evaluation
    evaluateExpressionBtn.addEventListener('click', evaluateExpression);
    
    // History clear
    clearHistoryBtn.addEventListener('click', clearHistory);
    
    // Keyboard support
    document.addEventListener('keydown', handleKeyboard);
}

// Switch calculator mode
function switchMode() {
    calculatorState.currentMode = modeToggle.value;
    scientificPanel.style.display = calculatorState.currentMode === 'basic' ? 'none' : 'block';
    updateDisplay();
}

// Handle number input
function handleNumber(number) {
    if (calculatorState.waitingForNext) {
        calculatorState.result = number;
        calculatorState.waitingForNext = false;
    } else {
        if (calculatorState.result === '0' || calculatorState.result === 'Error') {
            calculatorState.result = number;
        } else {
            calculatorState.result += number;
        }
    }
    updateDisplay();
}

// Handle operations
function handleOperation(operation) {
    if (calculatorState.waitingForNext) {
        calculatorState.waitingForNext = false;
    }

    switch (operation) {
        case 'add':
            calculatorState.currentExpression += calculatorState.result + ' + ';
            break;
        case 'subtract':
            calculatorState.currentExpression += calculatorState.result + ' - ';
            break;
        case 'multiply':
            calculatorState.currentExpression += calculatorState.result + ' * ';
            break;
        case 'divide':
            calculatorState.currentExpression += calculatorState.result + ' / ';
            break;
        case 'sign':
            calculatorState.result = (-parseFloat(calculatorState.result)).toString();
            updateDisplay();
            return;
        case 'equals':
            evaluateCurrentExpression();
            return;
    }
    
    calculatorState.result = '0';
    updateDisplay();
}

// Handle functions
function handleFunction(func) {
    const value = parseFloat(calculatorState.result);
    
    fetch('/calculate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            type: 'scientific',
            num: value,
            operation: func
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            calculatorState.result = formatResult(data.result);
            calculatorState.waitingForNext = true;
            updateDisplay();
        } else {
            showError(data.error || 'Invalid operation');
        }
    })
    .catch(error => {
        showError('Error performing operation');
    });
}

// Handle memory operations
function handleMemory(action) {
    const value = parseFloat(calculatorState.result);
    
    fetch('/memory', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            operation: action.replace('memory-', ''),
            value: value
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            calculatorState.memory = data.memory;
            if (action === 'memory-recall') {
                calculatorState.result = formatResult(data.memory);
                updateDisplay();
            }
        } else {
            showError(data.error || 'Invalid memory operation');
        }
    })
    .catch(error => {
        showError('Error performing memory operation');
    });
}

// Handle clear operations
function handleClear(action) {
    switch (action) {
        case 'clear':
            calculatorState.result = '0';
            calculatorState.currentExpression = '';
            calculatorState.waitingForNext = false;
            break;
        case 'clear-entry':
            calculatorState.result = '0';
            break;
        case 'backspace':
            calculatorState.result = calculatorState.result.slice(0, -1) || '0';
            break;
    }
    updateDisplay();
}

// Handle constants
function handleConstant(constant) {
    fetch('/constants')
        .then(response => response.json())
        .then(data => {
            if (data.constants && data.constants[constant] !== undefined) {
                calculatorState.result = formatResult(data.constants[constant]);
                calculatorState.waitingForNext = true;
                updateDisplay();
            }
        })
        .catch(error => {
            showError('Error getting constant value');
        });
}

// Evaluate current expression
function evaluateCurrentExpression() {
    const expression = calculatorState.currentExpression + calculatorState.result;
    
    fetch('/calculate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            type: 'expression',
            expression: expression
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            calculatorState.result = formatResult(data.result);
            calculatorState.currentExpression = '';
            calculatorState.waitingForNext = true;
            updateDisplay();
        } else {
            showError(data.error || 'Invalid expression');
        }
    })
    .catch(error => {
        showError('Error evaluating expression');
    });
}

// Evaluate complex expression
function evaluateExpression() {
    const expression = expressionInput.value.trim();
    if (!expression) return;
    
    fetch('/calculate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            type: 'expression',
            expression: expression
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            calculatorState.result = formatResult(data.result);
            calculatorState.waitingForNext = true;
            updateDisplay();
        } else {
            showError(data.error || 'Invalid expression');
        }
    })
    .catch(error => {
        showError('Error evaluating expression');
    });
}

// Format result for display
function formatResult(number) {
    if (typeof number !== 'number') {
        return number.toString();
    }
    
    if (!isFinite(number)) {
        return 'Error';
    }
    
    if (Math.abs(number) > 1e10 || (Math.abs(number) < 1e-10 && number !== 0)) {
        return number.toExponential(10);
    }
    
    return number.toString();
}

// Update display
function updateDisplay() {
    display.textContent = calculatorState.result;
    expressionDisplay.textContent = calculatorState.currentExpression;
}

// Show error modal
function showError(message) {
    errorMessage.textContent = message;
    errorModal.style.display = 'flex';
}

// Close error modal
function closeModal() {
    errorModal.style.display = 'none';
}

// Add to history
function addToHistory(expression, result) {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    historyItem.innerHTML = `
        <div class="history-expression">${expression}</div>
        <div class="history-result">= ${formatResult(result)}</div>
    `;
    
    historyList.insertBefore(historyItem, historyList.firstChild);
}

// Load history
function loadHistory() {
    fetch('/history')
        .then(response => response.json())
        .then(data => {
            historyList.innerHTML = '';
            data.history.forEach(item => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                historyItem.innerHTML = `
                    <div class="history-expression">${item.expression}</div>
                    <div class="history-result">= ${formatResult(item.result)}</div>
                `;
                historyList.appendChild(historyItem);
            });
        })
        .catch(error => {
            showError('Error loading history');
        });
}

// Clear history
function clearHistory() {
    fetch('/clear-history', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                historyList.innerHTML = '';
            }
        })
        .catch(error => {
            showError('Error clearing history');
        });
}

// Handle keyboard input
function handleKeyboard(event) {
    const key = event.key;
    
    // Numbers and operators
    if (/[\d+\-*/.=]/.test(key)) {
        event.preventDefault();
        if (key === '=') {
            handleOperation('equals');
        } else {
            handleNumber(key);
        }
    }
    
    // Enter key
    if (key === 'Enter') {
        event.preventDefault();
        handleOperation('equals');
    }
    
    // Escape key
    if (key === 'Escape') {
        event.preventDefault();
        handleClear('clear');
    }
    
    // Backspace key
    if (key === 'Backspace') {
        event.preventDefault();
        handleClear('backspace');
    }
}

// Initialize calculator when DOM is loaded
document.addEventListener('DOMContentLoaded', initCalculator); 