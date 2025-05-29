/**
 * DK Dental Studio - Debug Panel for Development
 * Real-time debugging information for the booking system
 */

const DebugPanel = {
    isVisible: false,
    logs: [],
    maxLogs: 50,

    init() {
        this.createDebugPanel();
        this.attachEventListeners();
        this.startMonitoring();
        
        // Show the debug panel by default
        this.show();
        
        // Add keyboard shortcut to toggle debug panel
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.toggle();
            }
        });

        console.log('Debug panel initialized and visible. Press Ctrl+Shift+D to toggle.');
    },

    createDebugPanel() {
        const panel = document.createElement('div');
        panel.id = 'debug-panel';
        panel.className = 'debug-panel';  // Remove 'hidden' class to make it visible by default
        
        panel.innerHTML = `
            <div class="debug-header">
                <h4>🔧 Debug Info</h4>
                <div class="debug-controls">
                    <button type="button" id="debug-clear" class="btn btn-sm btn-outline-light">Clear</button>
                    <button type="button" id="debug-close" class="btn btn-sm btn-outline-light">×</button>
                </div>
            </div>
            
            <div class="debug-content">
                <div id="debug-output"></div>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.panel = panel;
    },

    attachEventListeners() {
        // Close button
        document.getElementById('debug-close').addEventListener('click', () => {
            this.hide();
        });

        // Clear button
        document.getElementById('debug-clear').addEventListener('click', () => {
            this.clearLogs();
        });
    },

    startMonitoring() {
        // Update debug info every second
        this.updateInterval = setInterval(() => {
            this.updateDebugInfo();
        }, 1000);

        // Intercept console methods to capture logs
        this.interceptConsole();
    },

    interceptConsole() {
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;

        console.log = (...args) => {
            this.addLog('log', args.join(' '));
            originalLog.apply(console, args);
        };

        console.error = (...args) => {
            this.addLog('error', args.join(' '));
            originalError.apply(console, args);
        };

        console.warn = (...args) => {
            this.addLog('warn', args.join(' '));
            originalWarn.apply(console, args);
        };
    },

    addLog(type, message) {
        const timestamp = new Date().toLocaleTimeString();
        this.logs.unshift({
            type,
            message,
            timestamp
        });

        // Keep only the last N logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }

        this.updateLogsDisplay();
    },

    updateLogsDisplay() {
        // This is now handled by updateDebugInfo
    },

    updateDebugInfo() {
        if (!this.isVisible) return;

        const container = document.getElementById('debug-output');
        if (!container) return;

        let output = '';
        
        // Add timestamp
        output += `=== DEBUG OUTPUT - ${new Date().toLocaleTimeString()} ===\n\n`;
        
        // System status
        output += `SYSTEM STATUS\n`;
        output += `Status: ${BookingState?.systemStatus || 'unknown'}\n`;
        output += `Initialized: ${BookingState?.isInitialized || false}\n`;
        output += `Loading: ${BookingState?.isLoading || false}\n`;
        output += `Has Token: ${!!BookingState?.accessToken}\n\n`;
        
        // Current selection
        output += `CURRENT SELECTION\n`;
        output += `Service: ${BookingState?.selectedService || 'none'}\n`;
        output += `Date: ${BookingState?.selectedDate || 'none'}\n`;
        output += `Time: ${BookingState?.selectedTime || 'none'}\n`;
        output += `Step: ${BookingState?.currentStep || 'none'}\n\n`;
        
        // Availability data
        if (BookingState?.availableSlots) {
            output += `AVAILABILITY DATA\n`;
            output += `Available slots: ${Object.keys(BookingState.availableSlots).length} days\n`;
            Object.keys(BookingState.availableSlots).forEach(date => {
                const slots = BookingState.availableSlots[date];
                if (slots.length > 0) {
                    output += `${date}: ${slots.length} slots (${slots.join(', ')}:00)\n`;
                }
            });
            output += '\n';
        }
        
        // Recent logs
        output += `RECENT LOGS\n`;
        this.logs.slice(0, 10).forEach(log => {
            output += `${log.timestamp} [${log.type.toUpperCase()}] ${log.message}\n`;
        });
        output += '\n';
        
        container.textContent = output;
    },

    updateStateDisplay() {
        // This is now handled by updateDebugInfo
    },

    updateSystemStatus() {
        // This is now handled by updateDebugInfo
    },

    updateCurrentSelection() {
        // This is now handled by updateDebugInfo
    },

    updateConfigDisplay() {
        // This is now handled by updateDebugInfo
    },

    clearLogs() {
        this.logs = [];
        this.updateLogsDisplay();
    },

    show() {
        if (this.panel) {
            this.panel.classList.remove('hidden');
            this.isVisible = true;
            this.updateDebugInfo();
        }
    },

    hide() {
        if (this.panel) {
            this.panel.classList.add('hidden');
            this.isVisible = false;
        }
    },

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    },

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.panel) {
            this.panel.remove();
        }
    },

    // Stub method to prevent errors from booking system
    addApiCall(method, endpoint, response) {
        // Log API call as a regular log entry
        if (response && typeof response === 'object') {
            this.addLog('info', `API ${method} ${endpoint}: ${response.success ? 'SUCCESS' : 'FAILED'}`);
        } else {
            this.addLog('info', `API ${method} ${endpoint}: called`);
        }
    }
};

// Make it globally available immediately
window.DebugPanel = DebugPanel;

// Initialize debug panel when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => DebugPanel.init());
} else {
    DebugPanel.init();
} 