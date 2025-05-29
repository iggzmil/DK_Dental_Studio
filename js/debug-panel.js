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
        panel.className = 'debug-panel';
        
        panel.innerHTML = `
            <div class="debug-header">
                <h4>🔧 Booking System Debug</h4>
                <div class="debug-controls">
                    <button type="button" id="debug-clear" class="btn btn-sm btn-outline-light">Clear</button>
                    <button type="button" id="debug-export" class="btn btn-sm btn-outline-light">Export</button>
                    <button type="button" id="debug-close" class="btn btn-sm btn-outline-light">×</button>
                </div>
            </div>
            
            <div class="debug-content">
                <div class="debug-tabs">
                    <button class="debug-tab active" data-tab="state">State</button>
                    <button class="debug-tab" data-tab="logs">Logs</button>
                    <button class="debug-tab" data-tab="api">API</button>
                    <button class="debug-tab" data-tab="config">Config</button>
                </div>
                
                <div class="debug-tab-content">
                    <!-- State Tab -->
                    <div id="debug-state" class="debug-tab-panel active">
                        <h5>Booking State</h5>
                        <pre id="debug-state-content"></pre>
                        
                        <h5>System Status</h5>
                        <div id="debug-system-status"></div>
                        
                        <h5>Current Selection</h5>
                        <div id="debug-current-selection"></div>
                    </div>
                    
                    <!-- Logs Tab -->
                    <div id="debug-logs" class="debug-tab-panel">
                        <h5>System Logs</h5>
                        <div id="debug-logs-content"></div>
                    </div>
                    
                    <!-- API Tab -->
                    <div id="debug-api" class="debug-tab-panel">
                        <h5>API Calls</h5>
                        <div id="debug-api-content"></div>
                        
                        <h5>Quick Tests</h5>
                        <div class="debug-quick-tests">
                            <button class="btn btn-sm btn-primary" onclick="DebugPanel.testAccessToken()">Test Access Token</button>
                            <button class="btn btn-sm btn-primary" onclick="DebugPanel.testCalendarAPI()">Test Calendar API</button>
                            <button class="btn btn-sm btn-primary" onclick="DebugPanel.testAvailability()">Test Availability</button>
                        </div>
                    </div>
                    
                    <!-- Config Tab -->
                    <div id="debug-config" class="debug-tab-panel">
                        <h5>Service Configuration</h5>
                        <pre id="debug-config-content"></pre>
                        
                        <h5>Business Hours</h5>
                        <div id="debug-business-hours"></div>
                    </div>
                </div>
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

        // Export button
        document.getElementById('debug-export').addEventListener('click', () => {
            this.exportDebugInfo();
        });

        // Tab switching
        document.querySelectorAll('.debug-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
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
        const container = document.getElementById('debug-logs-content');
        if (!container) return;

        container.innerHTML = this.logs.map(log => {
            const className = `debug-log debug-log-${log.type}`;
            return `
                <div class="${className}">
                    <span class="debug-log-time">${log.timestamp}</span>
                    <span class="debug-log-message">${log.message}</span>
                </div>
            `;
        }).join('');

        // Auto-scroll to top (newest logs)
        container.scrollTop = 0;
    },

    updateDebugInfo() {
        if (!this.isVisible || typeof BookingState === 'undefined') return;

        // Update state
        this.updateStateDisplay();
        this.updateSystemStatus();
        this.updateCurrentSelection();
        this.updateConfigDisplay();
    },

    updateStateDisplay() {
        const container = document.getElementById('debug-state-content');
        if (!container) return;

        const state = {
            selectedService: BookingState.selectedService,
            selectedDate: BookingState.selectedDate,
            selectedTime: BookingState.selectedTime,
            currentStep: BookingState.currentStep,
            isInitialized: BookingState.isInitialized,
            isLoading: BookingState.isLoading,
            systemStatus: BookingState.systemStatus,
            hasAccessToken: !!BookingState.accessToken,
            availableSlotCount: Object.keys(BookingState.availableSlots).length,
            busySlotCount: Object.keys(BookingState.busySlots).length
        };

        container.textContent = JSON.stringify(state, null, 2);
    },

    updateSystemStatus() {
        const container = document.getElementById('debug-system-status');
        if (!container) return;

        const status = BookingState.systemStatus || 'unknown';
        const statusClass = {
            'loading': 'badge-warning',
            'ready': 'badge-success',
            'error': 'badge-danger',
            'offline': 'badge-secondary'
        }[status] || 'badge-secondary';

        container.innerHTML = `
            <span class="badge ${statusClass}">${status.toUpperCase()}</span>
            <small class="ml-2">
                Initialized: ${BookingState.isInitialized ? '✅' : '❌'} | 
                Loading: ${BookingState.isLoading ? '⏳' : '✅'} |
                Token: ${BookingState.accessToken ? '✅' : '❌'}
            </small>
        `;
    },

    updateCurrentSelection() {
        const container = document.getElementById('debug-current-selection');
        if (!container) return;

        const serviceName = BookingState.selectedService ? 
            ServiceManager.getServiceName(BookingState.selectedService) : 'None';

        container.innerHTML = `
            <div><strong>Service:</strong> ${serviceName}</div>
            <div><strong>Date:</strong> ${BookingState.selectedDate || 'None'}</div>
            <div><strong>Time:</strong> ${BookingState.selectedTime || 'None'}</div>
            <div><strong>Step:</strong> ${BookingState.currentStep}</div>
        `;
    },

    updateConfigDisplay() {
        const configContainer = document.getElementById('debug-config-content');
        const hoursContainer = document.getElementById('debug-business-hours');
        
        if (!configContainer || !hoursContainer) return;

        if (typeof ServiceManager !== 'undefined') {
            configContainer.textContent = JSON.stringify(ServiceManager.services, null, 2);

            // Generate business hours summary
            let hoursHtml = '';
            Object.keys(ServiceManager.services).forEach(serviceId => {
                const service = ServiceManager.services[serviceId];
                hoursHtml += `<h6>${service.name}</h6><ul>`;
                
                Object.keys(service.schedule).forEach(day => {
                    const schedule = service.schedule[day];
                    const hours = schedule ? `${schedule.start}:00 - ${schedule.end}:00` : 'Closed';
                    hoursHtml += `<li><strong>${day}:</strong> ${hours}</li>`;
                });
                
                hoursHtml += '</ul>';
            });
            
            hoursContainer.innerHTML = hoursHtml;
        }
    },

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.debug-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab panels
        document.querySelectorAll('.debug-tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`debug-${tabName}`).classList.add('active');
    },

    clearLogs() {
        this.logs = [];
        this.updateLogsDisplay();
    },

    exportDebugInfo() {
        const debugData = {
            timestamp: new Date().toISOString(),
            bookingState: BookingState,
            logs: this.logs,
            serviceConfig: ServiceManager?.services,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        const blob = new Blob([JSON.stringify(debugData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `booking-debug-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Quick test functions
    async testAccessToken() {
        this.addLog('info', 'Testing access token...');
        try {
            const response = await fetch('script/calendar/get-access-token.php');
            const data = await response.json();
            this.addLog('info', `Access token test: ${data.success ? 'SUCCESS' : 'FAILED'}`);
            this.addApiCall('GET', 'get-access-token.php', data);
        } catch (error) {
            this.addLog('error', `Access token test failed: ${error.message}`);
        }
    },

    async testCalendarAPI() {
        this.addLog('info', 'Testing Google Calendar API...');
        try {
            const month = new Date();
            const busyTimes = await ApiClient.getCalendarBusyTimes(month);
            this.addLog('info', `Calendar API test: SUCCESS (${Object.keys(busyTimes).length} busy days)`);
        } catch (error) {
            this.addLog('error', `Calendar API test failed: ${error.message}`);
        }
    },

    testAvailability() {
        this.addLog('info', 'Testing availability calculation...');
        try {
            const service = BookingState.selectedService || 'dentures';
            const today = new Date();
            const available = ServiceManager.getAvailableHoursForDate(service, today);
            this.addLog('info', `Availability test: ${available.length} slots available for ${service} today`);
        } catch (error) {
            this.addLog('error', `Availability test failed: ${error.message}`);
        }
    },

    addApiCall(method, endpoint, response) {
        const apiContainer = document.getElementById('debug-api-content');
        if (!apiContainer) return;

        const timestamp = new Date().toLocaleTimeString();
        const statusClass = response.success ? 'text-success' : 'text-danger';
        
        const callHtml = `
            <div class="debug-api-call">
                <div class="debug-api-header">
                    <span class="badge badge-primary">${method}</span>
                    <span class="debug-api-endpoint">${endpoint}</span>
                    <span class="debug-api-time">${timestamp}</span>
                </div>
                <div class="debug-api-response ${statusClass}">
                    <pre>${JSON.stringify(response, null, 2)}</pre>
                </div>
            </div>
        `;
        
        apiContainer.insertAdjacentHTML('afterbegin', callHtml);
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
    }
};

// Initialize debug panel when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => DebugPanel.init());
} else {
    DebugPanel.init();
}

// Make it globally available
window.DebugPanel = DebugPanel; 