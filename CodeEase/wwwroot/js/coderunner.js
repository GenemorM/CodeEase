// Code Runner JavaScript
let supportedLanguages = [];
let currentExecution = null;

// Code templates for different languages
const codeTemplates = {
    java: {
        'Hello World': `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,
        'Input/Output': `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        System.out.print("Enter your name: ");
        String name = scanner.nextLine();
        System.out.println("Hello, " + name + "!");
        scanner.close();
    }
}`,
        'Loop Example': `public class Main {
    public static void main(String[] args) {
        for (int i = 1; i <= 10; i++) {
            System.out.println("Number: " + i);
        }
    }
}`
    },
    csharp: {
        'Hello World': `using System;

class Program {
    static void Main() {
        Console.WriteLine("Hello, World!");
    }
}`,
        'Input/Output': `using System;

class Program {
    static void Main() {
        Console.Write("Enter your name: ");
        string name = Console.ReadLine();
        Console.WriteLine($"Hello, {name}!");
    }
}`,
        'Loop Example': `using System;

class Program {
    static void Main() {
        for (int i = 1; i <= 10; i++) {
            Console.WriteLine($"Number: {i}");
        }
    }
}`
    },
    javascript: {
        'Hello World': `console.log("Hello, World!");`,
        'Input/Output': `// Note: Input handling in Node.js
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Enter your name: ', (name) => {
    console.log(\`Hello, \${name}!\`);
    rl.close();
});`,
        'Loop Example': `for (let i = 1; i <= 10; i++) {
    console.log(\`Number: \${i}\`);
}`
    },
    python: {
        'Hello World': `print("Hello, World!")`,
        'Input/Output': `name = input("Enter your name: ")
print(f"Hello, {name}!")`,
        'Loop Example': `for i in range(1, 11):
    print(f"Number: {i}")`
    }
};

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    loadSupportedLanguages();
    loadCodeTemplates();
    setupEventListeners();
    
    // Load default template
    onLanguageChange();
});

// Setup event listeners
function setupEventListeners() {
    const codeEditor = document.getElementById('codeEditor');
    const autoRunCheck = document.getElementById('autoRunCheck');
    
    // Auto-run functionality
    let autoRunTimeout;
    codeEditor.addEventListener('input', function() {
        if (autoRunCheck.checked) {
            clearTimeout(autoRunTimeout);
            autoRunTimeout = setTimeout(() => {
                runCode();
            }, 2000); // Run after 2 seconds of no typing
        }
    });
    
    // Keyboard shortcuts
    codeEditor.addEventListener('keydown', function(e) {
        // Ctrl+Enter or Cmd+Enter to run
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            runCode();
        }
        
        // Tab key for indentation
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;
            
            this.value = this.value.substring(0, start) + '    ' + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + 4;
        }
    });
}

// Load supported languages from API
async function loadSupportedLanguages() {
    try {
        const response = await makeAuthenticatedRequest('/api/coderunner/languages');
        if (response.ok) {
            supportedLanguages = await response.json();
            updateLanguageSelect();
        }
    } catch (error) {
        console.error('Error loading supported languages:', error);
        showToast('Failed to load supported languages', 'error');
    }
}

// Update language select dropdown
function updateLanguageSelect() {
    const select = document.getElementById('languageSelect');
    select.innerHTML = '';
    
    supportedLanguages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang.name;
        option.textContent = lang.displayName;
        select.appendChild(option);
    });
}

// Load code templates for current language
function loadCodeTemplates() {
    const container = document.getElementById('codeTemplates');
    const language = document.getElementById('languageSelect').value;
    const templates = codeTemplates[language] || {};
    
    container.innerHTML = '';
    
    Object.entries(templates).forEach(([name, code]) => {
        const col = document.createElement('div');
        col.className = 'col-md-4 mb-2';
        
        col.innerHTML = `
            <div class="card template-card" onclick="loadTemplate('${language}', '${name}')">
                <div class="card-body py-2">
                    <h6 class="card-title mb-1">${name}</h6>
                    <small class="text-muted">${getTemplateDescription(name)}</small>
                </div>
            </div>
        `;
        
        container.appendChild(col);
    });
}

// Get template description
function getTemplateDescription(name) {
    const descriptions = {
        'Hello World': 'Basic output example',
        'Input/Output': 'Reading user input',
        'Loop Example': 'Iteration and loops'
    };
    return descriptions[name] || 'Code template';
}

// Load a specific template
function loadTemplate(language, templateName) {
    const code = codeTemplates[language]?.[templateName];
    if (code) {
        document.getElementById('codeEditor').value = code;
        showToast(`Loaded ${templateName} template`, 'success');
    }
}

// Handle language change
function onLanguageChange() {
    loadCodeTemplates();
    
    // Load default template for the language
    const language = document.getElementById('languageSelect').value;
    const defaultTemplate = codeTemplates[language]?.['Hello World'];
    if (defaultTemplate && !document.getElementById('codeEditor').value.trim()) {
        document.getElementById('codeEditor').value = defaultTemplate;
    }
}

// Run code
async function runCode() {
    const code = document.getElementById('codeEditor').value.trim();
    const language = document.getElementById('languageSelect').value;
    const input = document.getElementById('inputEditor').value;
    const timeout = parseInt(document.getElementById('timeoutInput').value) || 30000;
    
    if (!code) {
        showToast('Please enter some code to run', 'warning');
        return;
    }
    
    try {
        showExecutionStatus('Running...', true);
        clearOutput();
        
        const startTime = Date.now();
        
        const response = await makeAuthenticatedRequest('/api/coderunner/execute', 'POST', {
            code: code,
            language: language,
            input: input,
            timeout: timeout
        });
        
        const result = await response.json();
        const executionTime = Date.now() - startTime;
        
        displayExecutionResult(result, executionTime);
        
    } catch (error) {
        console.error('Error running code:', error);
        showExecutionStatus('Error', false);
        displayError('Failed to execute code: ' + error.message);
        showToast('Error executing code', 'error');
    }
}

// Validate code
async function validateCode() {
    const code = document.getElementById('codeEditor').value.trim();
    const language = document.getElementById('languageSelect').value;
    
    if (!code) {
        showToast('Please enter some code to validate', 'warning');
        return;
    }
    
    try {
        showExecutionStatus('Validating...', true);
        
        const response = await makeAuthenticatedRequest('/api/coderunner/validate', 'POST', {
            code: code,
            language: language
        });
        
        const result = await response.json();
        
        if (result.isValid) {
            showToast('Code validation passed!', 'success');
            showExecutionStatus('Valid', false);
        } else {
            showToast('Code validation failed', 'error');
            showExecutionStatus('Invalid', false);
            displayError(result.errorMessage || 'Validation failed');
        }
        
    } catch (error) {
        console.error('Error validating code:', error);
        showExecutionStatus('Error', false);
        showToast('Error validating code', 'error');
    }
}

// Display execution result
function displayExecutionResult(result, clientExecutionTime) {
    if (result.success) {
        showExecutionStatus(`Completed (${result.executionTime}ms)`, false);
        
        // Display output
        document.getElementById('outputContent').textContent = result.output || '(no output)';
        
        // Display errors if any
        if (result.error) {
            document.getElementById('errorContent').textContent = result.error;
            // Switch to error tab if there are errors
            const errorTab = new bootstrap.Tab(document.getElementById('stderr-tab'));
            errorTab.show();
        } else {
            document.getElementById('errorContent').textContent = '(no errors)';
        }
        
        // Update execution info
        document.getElementById('executionTime').textContent = `Execution: ${result.executionTime}ms`;
        document.getElementById('executionId').textContent = `ID: ${result.executionId}`;
        
        // Show success message
        if (result.exitCode === 0) {
            showToast('Code executed successfully!', 'success');
        } else {
            showToast(`Code executed with exit code: ${result.exitCode}`, 'warning');
        }
        
    } else {
        showExecutionStatus('Failed', false);
        displayError(result.error || 'Execution failed');
        showToast('Code execution failed', 'error');
    }
    
    document.getElementById('executionStatus').style.display = 'block';
}

// Display error
function displayError(error) {
    document.getElementById('errorContent').textContent = error;
    document.getElementById('outputContent').textContent = '(execution failed)';
    
    // Switch to error tab
    const errorTab = new bootstrap.Tab(document.getElementById('stderr-tab'));
    errorTab.show();
}

// Show execution status
function showExecutionStatus(status, isRunning) {
    document.getElementById('statusText').textContent = status;
    document.getElementById('executionSpinner').style.display = isRunning ? 'inline-block' : 'none';
    document.getElementById('executionStatus').style.display = 'block';
}

// Clear all content
function clearAll() {
    document.getElementById('codeEditor').value = '';
    document.getElementById('inputEditor').value = '';
    clearOutput();
    document.getElementById('executionStatus').style.display = 'none';
    showToast('Cleared all content', 'info');
}

// Clear output
function clearOutput() {
    document.getElementById('outputContent').textContent = '';
    document.getElementById('errorContent').textContent = '';
    
    // Switch back to output tab
    const outputTab = new bootstrap.Tab(document.getElementById('stdout-tab'));
    outputTab.show();
}

// Copy output to clipboard
async function copyOutput() {
    const output = document.getElementById('outputContent').textContent;
    
    if (!output || output === '(no output)' || output === '(execution failed)') {
        showToast('No output to copy', 'warning');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(output);
        showToast('Output copied to clipboard!', 'success');
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        showToast('Failed to copy output', 'error');
    }
}

// Check code runner service health
async function checkCodeRunnerHealth() {
    try {
        const response = await makeAuthenticatedRequest('/api/coderunner/health');
        const result = await response.json();
        
        if (result.status === 'healthy') {
            showToast('Code runner service is healthy', 'success');
        } else {
            showToast('Code runner service is unhealthy', 'error');
        }
    } catch (error) {
        console.error('Error checking health:', error);
        showToast('Failed to check code runner health', 'error');
    }
}

// Export functions for global access
window.CodeRunner = {
    runCode,
    validateCode,
    clearAll,
    clearOutput,
    copyOutput,
    loadTemplate,
    onLanguageChange,
    checkCodeRunnerHealth
};