/**
 * DK Dental Studio - Booking System Core Module
 * 
 * Architecture:
 * - BookingState: Single source of truth for application state
 * - ServiceManager: Handles business rules for services and availability  
 * - CalendarRenderer: Manages calendar UI rendering and interactions
 * - BookingManager: Handles the booking flow and API integration
 * - ErrorHandler: Centralized error handling and user messaging
 */

// =============================================================================
// BOOKING STATE MANAGEMENT
// =============================================================================

const BookingState = {
    // Current selection state
    selectedService: 'dentures',
    selectedDate: null,
    selectedTime: null,
    
    // System state
    accessToken: null,
    isInitialized: false,
    isLoading: false,
    
    // Calendar state
    currentMonth: new Date(),
    busySlots: {},
    availableSlots: {},
    
    // Cache system for 6 weeks of data
    cache: {
        busyTimes: {},           // Cached busy times from Google Calendar
        loadedRange: {           // Date range currently loaded in cache
            start: null,
            end: null
        },
        lastRefresh: null,       // When cache was last refreshed
        isLoading: false         // Cache loading state
    },
    
    // UI state
    showingBookingForm: false,
    currentStep: 'service-selection', // service-selection, calendar, time-selection, booking-form
    
    // Error state
    lastError: null,
    systemStatus: 'loading' // loading, ready, error, offline
};

// =============================================================================
// SERVICE MANAGER - Business Logic
// =============================================================================

const ServiceManager = {
    // Service configuration with business hours
    services: {
        'dentures': {
            name: 'Dentures Consultation',
            duration: 60,
            schedule: {
                'monday': { start: 10, end: 16 },
                'tuesday': { start: 10, end: 16 },
                'wednesday': { start: 10, end: 16 },
                'thursday': { start: 10, end: 16 },
                'friday': { start: 10, end: 16 },
                'saturday': null,
                'sunday': null
            }
        },
        'repairs': {
            name: 'Maintenance & Repairs',
            duration: 60,
            schedule: {
                'monday': { start: 10, end: 16 },
                'tuesday': { start: 10, end: 16 },
                'wednesday': { start: 10, end: 16 },
                'thursday': { start: 10, end: 16 },
                'friday': { start: 10, end: 16 },
                'saturday': null,
                'sunday': null
            }
        },
        'mouthguards': {
            name: 'Mouthguards',
            duration: 60,
            schedule: {
                'monday': { start: 10, end: 18 },
                'tuesday': { start: 10, end: 18 },
                'wednesday': { start: 10, end: 18 },
                'thursday': { start: 10, end: 18 },
                'friday': { start: 10, end: 16 },
                'saturday': null,
                'sunday': null
            }
        }
    },

    getServiceConfig(serviceId) {
        return this.services[serviceId] || null;
    },

    getServiceName(serviceId) {
        const service = this.getServiceConfig(serviceId);
        return service ? service.name : 'Unknown Service';
    },

    isServiceAvailableOnDate(serviceId, date) {
        const service = this.getServiceConfig(serviceId);
        if (!service) return false;

        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const schedule = service.schedule[dayName];
        
        return schedule !== null;
    },

    getAvailableHoursForDate(serviceId, date) {
        const service = this.getServiceConfig(serviceId);
        if (!service) return [];

        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const schedule = service.schedule[dayName];
        
        if (!schedule) return [];

        const hours = [];
        for (let hour = schedule.start; hour < schedule.end; hour++) {
            hours.push(hour);
        }

        return hours;
    },

    filterPastSlots(slots, date) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        // If not today, return all slots
        if (targetDate.getTime() !== today.getTime()) {
            return slots;
        }

        // For today: filter out any slot whose start time has passed or is currently happening
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        return slots.filter(hour => {
            // If the slot hour is greater than current hour, it's definitely in the future
            if (hour > currentHour) {
                return true;
            }
            // If the slot hour equals current hour, check if we're still within the booking window
            // Since slots are 1-hour bookings, once the hour starts (e.g., 4:00 PM), it's no longer bookable
            if (hour === currentHour) {
                return false; // Slot has started, no longer available
            }
            // If slot hour is less than current hour, it has definitely passed
            return false;
        });
    },

    /**
     * Check if an entire day should be considered unavailable for bookings
     * This happens when all possible time slots for all services have passed
     */
    isDayCompletelyUnavailable(date) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        // If not today, the day is available (weekend/business hours will be handled elsewhere)
        if (targetDate.getTime() !== today.getTime()) {
            return false;
        }

        // For today: check if all services have no future slots
        const currentHour = now.getHours();
        let hasAnyFutureSlots = false;

        // Check each service to see if any have future slots available
        Object.keys(this.services).forEach(serviceId => {
            const service = this.services[serviceId];
            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
            const schedule = service.schedule[dayName];
            
            if (schedule) {
                // Generate potential hours for this service
                for (let hour = schedule.start; hour < schedule.end; hour++) {
                    // If any hour is still in the future, the day is not completely unavailable
                    if (hour > currentHour) {
                        hasAnyFutureSlots = true;
                        break;
                    }
                }
            }
        });

        return !hasAnyFutureSlots;
    }
};

// =============================================================================
// API INTEGRATION
// =============================================================================

const ApiClient = {
    async getAccessToken() {
        try {
            const response = await fetch('script/calendar/get-access-token.php');
            const data = await response.json();
            
            // Log API call to debug panel
            if (window.DebugPanel && typeof window.DebugPanel.addApiCall === 'function') {
                window.DebugPanel.addApiCall('GET', 'get-access-token.php', data);
            }
            
            if (data.success) {
                BookingState.accessToken = data.access_token;
                return data.access_token;
            } else {
                throw new Error(data.error || 'Failed to get access token');
            }
        } catch (error) {
            console.error('Error getting access token:', error);
            throw error;
        }
    },

    async getCalendarBusyTimes(month) {
        if (!BookingState.accessToken) {
            await this.getAccessToken();
        }

        try {
            // Calculate month start and end for API call
            const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
            const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);
            
            // Try direct Google Calendar API call first
            try {
                const params = new URLSearchParams({
                    calendarId: 'info@dkdental.au',
                    timeMin: startOfMonth.toISOString(),
                    timeMax: endOfMonth.toISOString(),
                    singleEvents: 'true',
                    orderBy: 'startTime'
                });

                const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/info@dkdental.au/events?${params}`, {
                    headers: {
                        'Authorization': `Bearer ${BookingState.accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`Google Calendar API error: ${response.status}`);
                }

                const data = await response.json();
                return this.parseBusyTimes(data.items || []);
                
            } catch (corsError) {
                console.warn('Direct Google Calendar API failed, using server-side proxy:', corsError);
                
                // Fallback: Use server-side proxy if direct call fails due to CORS
                const proxyResponse = await fetch('script/calendar/get-busy-times.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        startDate: startOfMonth.toISOString(),
                        endDate: endOfMonth.toISOString()
                    })
                });

                if (!proxyResponse.ok) {
                    throw new Error(`Server proxy error: ${proxyResponse.status}`);
                }

                const proxyData = await proxyResponse.json();
                if (!proxyData.success) {
                    throw new Error(proxyData.error || 'Failed to get busy times');
                }

                return proxyData.busyTimes || {};
            }
        } catch (error) {
            console.error('Error fetching calendar busy times:', error);
            // Return empty busy times so calendar still works
            return {};
        }
    },

    parseBusyTimes(events) {
        const busySlots = {};

        events.forEach(event => {
            if (!event.start || !event.start.dateTime) return;

            const startDate = new Date(event.start.dateTime);
            const dateKey = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
            const hour = startDate.getHours();

            if (!busySlots[dateKey]) {
                busySlots[dateKey] = new Set();
            }
            busySlots[dateKey].add(hour);
        });

        // Convert Sets to Arrays for easier handling
        Object.keys(busySlots).forEach(dateKey => {
            busySlots[dateKey] = Array.from(busySlots[dateKey]);
        });

        return busySlots;
    },

    async createBooking(bookingData) {
        try {
            const response = await fetch('script/calendar/create-event.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bookingData)
            });

            const result = await response.json();
            
            // Log API call to debug panel
            if (window.DebugPanel && typeof window.DebugPanel.addApiCall === 'function') {
                window.DebugPanel.addApiCall('POST', 'create-event.php', result);
            }
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to create booking');
            }

            return result;
        } catch (error) {
            console.error('Error creating booking:', error);
            throw error;
        }
    }
};

// =============================================================================
// CALENDAR RENDERER
// =============================================================================

const CalendarRenderer = {
    renderCalendar(date) {
        const container = document.getElementById('appointment-calendar');
        if (!container) return;

        const year = date.getFullYear();
        const month = date.getMonth();
        
        // Create calendar structure
        const calendarHtml = this.generateCalendarHTML(year, month);
        container.innerHTML = calendarHtml;
        
        // Attach event listeners
        this.attachCalendarEventListeners();
        
        // Load availability for current month
        AvailabilityManager.loadMonthAvailability(BookingState.selectedService, date);
    },

    generateCalendarHTML(year, month) {
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        // Adjust for Monday start (0=Sunday, 1=Monday, etc.)
        // Convert JavaScript's 0=Sunday to 0=Monday by subtracting 1 and handling Sunday wrap-around
        let startingDayOfWeek = firstDay.getDay() - 1;
        if (startingDayOfWeek < 0) startingDayOfWeek = 6; // Sunday becomes 6

        let calendarHTML = `
            <div class="calendar-widget">
                <div class="calendar-header">
                    <button type="button" class="btn btn-sm btn-outline-primary" id="prev-month">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <h4 class="calendar-month-year">${monthNames[month]} ${year}</h4>
                    <button type="button" class="btn btn-sm btn-outline-primary" id="next-month">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                <div class="calendar-grid">
                    <div class="calendar-weekdays">
                        <div class="weekday">Mon</div>
                        <div class="weekday">Tue</div>
                        <div class="weekday">Wed</div>
                        <div class="weekday">Thu</div>
                        <div class="weekday">Fri</div>
                        <div class="weekday">Sat</div>
                        <div class="weekday">Sun</div>
                    </div>
                    <div class="calendar-days">`;

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            calendarHTML += '<div class="calendar-day empty"></div>';
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            // Use local date formatting instead of toISOString() to avoid timezone shifts
            const dateString = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const isToday = this.isToday(date);
            const isPast = this.isPast(date);
            
            calendarHTML += `
                <div class="calendar-day ${isPast ? 'past' : ''} ${isToday ? 'today' : ''}" 
                     data-date="${dateString}" 
                     data-day="${day}">
                    <span class="day-number">${day}</span>
                    <div class="availability-indicator" id="avail-${dateString}">
                        <div class="loading-spinner"></div>
                    </div>
                </div>`;
        }

        calendarHTML += `
                    </div>
                </div>
            </div>
            
            <!-- Time Slots Container (appears below calendar when date is selected) -->
            <div id="time-slots-container" class="time-slots-container"></div>
            
            <!-- Booking Form Container (appears below time slots when time is selected) -->
            <div id="booking-form-container" class="booking-form-container" style="display: none;"></div>
        `;

        return calendarHTML;
    },

    attachCalendarEventListeners() {
        // Month navigation
        const prevButton = document.getElementById('prev-month');
        const nextButton = document.getElementById('next-month');
        
        if (prevButton) {
            prevButton.addEventListener('click', () => {
                BookingState.currentMonth.setMonth(BookingState.currentMonth.getMonth() - 1);
                this.renderCalendar(BookingState.currentMonth);
            });
        }
        
        if (nextButton) {
            nextButton.addEventListener('click', () => {
                BookingState.currentMonth.setMonth(BookingState.currentMonth.getMonth() + 1);
                this.renderCalendar(BookingState.currentMonth);
            });
        }

        // Date selection
        document.querySelectorAll('.calendar-day:not(.past):not(.empty)').forEach(dayElement => {
            dayElement.addEventListener('click', (e) => {
                const dateString = e.currentTarget.dataset.date;
                if (dateString) {
                    BookingFlow.selectDate(dateString);
                }
            });
        });
    },

    updateDateAvailability(dateString, availableSlots, isPastDate = false) {
        const indicator = document.getElementById(`avail-${dateString}`);
        if (!indicator) return;

        // Parse date in local timezone to avoid dayOfWeek calculation errors
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day); // month is 0-indexed in Date constructor
        const dayOfWeek = date.getDay();
        
        // For past dates, show no text
        if (isPastDate) {
            indicator.innerHTML = '';
            indicator.parentElement.classList.add('past-date');
            return;
        }

        // For future dates, check if there are available slots
        if (availableSlots.length > 0) {
            // Business day with slots - show "Available"
            indicator.innerHTML = '<span class="available-text">Available</span>';
            indicator.parentElement.classList.add('available');
            indicator.parentElement.classList.remove('unavailable', 'closed');
        } else {
            // No slots available - determine if weekend (closed) or business day (blank)
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                // Weekend - show "Closed"
                indicator.innerHTML = '<span class="closed-text">Closed</span>';
                indicator.parentElement.classList.add('closed');
                indicator.parentElement.classList.remove('available', 'unavailable');
            } else {
                // Business day with no slots - show nothing (blank but potentially bookable)
                indicator.innerHTML = '';
                indicator.parentElement.classList.remove('available', 'unavailable', 'closed');
            }
        }
    },

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    },

    isPast(date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    }
};

// =============================================================================
// AVAILABILITY MANAGER
// =============================================================================

const AvailabilityManager = {
    async loadMonthAvailability(serviceId, month) {
        try {
            BookingState.isLoading = true;
            this.showLoadingState();

            // Check if we need to refresh our cache
            if (CacheManager.needsRefresh()) {
                console.log('Cache refresh needed, loading fresh data...');
                await CacheManager.loadSixWeeksData();
            }

            // Use cached data instead of making API calls
            this.calculateAndDisplayAvailability(serviceId, month);

        } catch (error) {
            console.error('Error loading availability:', error);
            ErrorHandler.handleAvailabilityError(error);
        } finally {
            BookingState.isLoading = false;
        }
    },

    calculateAndDisplayAvailability(serviceId, month) {
        const year = month.getFullYear();
        const monthIndex = month.getMonth();
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

        // Clear existing slots for this month to prevent stale data
        const monthKey = `${year}-${(monthIndex + 1).toString().padStart(2, '0')}`;
        Object.keys(BookingState.availableSlots).forEach(dateKey => {
            if (dateKey.startsWith(monthKey)) {
                delete BookingState.availableSlots[dateKey];
            }
        });

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, monthIndex, day);
            // Use local date formatting instead of toISOString() to avoid timezone shifts
            const dateString = `${year}-${(monthIndex + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const isPastDate = CalendarRenderer.isPast(date);
            const isToday = CalendarRenderer.isToday(date);
            const dayOfWeek = date.getDay();

            // For past dates, always show no availability
            if (isPastDate) {
                CalendarRenderer.updateDateAvailability(dateString, [], true);
                BookingState.availableSlots[dateString] = [];
                continue;
            }

            // Check if it's a weekend first (applies to all services)
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                // Weekend - no services available
                CalendarRenderer.updateDateAvailability(dateString, [], false);
                BookingState.availableSlots[dateString] = [];
                continue;
            }

            // For today: check if entire day should be unavailable due to all slots being past
            if (isToday && ServiceManager.isDayCompletelyUnavailable(date)) {
                // All time slots for all services have passed - day is effectively over
                CalendarRenderer.updateDateAvailability(dateString, [], true);
                BookingState.availableSlots[dateString] = [];
                continue;
            }

            // Calculate available hours for the selected service on this date
            let availableHours = [];
            
            if (ServiceManager.isServiceAvailableOnDate(serviceId, date)) {
                // Get potential hours for this service
                availableHours = ServiceManager.getAvailableHoursForDate(serviceId, date);
                
                // Apply current day filtering if today
                if (isToday) {
                    availableHours = ServiceManager.filterPastSlots(availableHours, date);
                }

                // Remove busy slots using cached calendar data
                const busyHours = CacheManager.getBusyTimesForDate(dateString);
                availableHours = availableHours.filter(hour => !busyHours.includes(hour));
            }

            // Update UI with availability
            CalendarRenderer.updateDateAvailability(dateString, availableHours, false);
            
            // Store in state
            BookingState.availableSlots[dateString] = availableHours;
        }
    },

    showLoadingState() {
        document.querySelectorAll('.availability-indicator').forEach(indicator => {
            indicator.innerHTML = '<div class="loading-spinner"></div>';
        });
    }
};

// =============================================================================
// BOOKING FLOW MANAGER
// =============================================================================

const BookingFlow = {
    selectService(serviceId) {
        BookingState.selectedService = serviceId;
        BookingState.selectedDate = null;
        BookingState.selectedTime = null;
        BookingState.currentStep = 'calendar';

        // Update UI
        this.updateServiceSelection(serviceId);
        
        // Load calendar for current month
        CalendarRenderer.renderCalendar(BookingState.currentMonth);
    },

    selectDate(dateString) {
        const availableSlots = BookingState.availableSlots[dateString];
        
        if (!availableSlots || availableSlots.length === 0) {
            ErrorHandler.showSystemUnavailableMessage();
            return;
        }

        // Clear any previous selections
        this.clearTimeSlots();
        this.clearBookingForm();
        
        // Update state
        BookingState.selectedDate = dateString;
        BookingState.selectedTime = null;
        BookingState.currentStep = 'time-selection';
        
        // Highlight selected date in calendar
        document.querySelectorAll('.calendar-day.selected').forEach(day => {
            day.classList.remove('selected');
        });
        
        const selectedDayElement = document.querySelector(`[data-date="${dateString}"]`);
        if (selectedDayElement) {
            selectedDayElement.classList.add('selected');
        }
        
        this.showTimeSlotSelection(dateString, availableSlots);
    },

    selectTime(hour) {
        // Validate that the selected time is still available
        const selectedDate = new Date(BookingState.selectedDate + 'T00:00:00');
        const dateString = BookingState.selectedDate;
        const isToday = CalendarRenderer.isToday(selectedDate);
        
        // Double-check availability before proceeding
        if (isToday) {
            // For today, ensure the slot hasn't passed since the page was loaded
            const now = new Date();
            const currentHour = now.getHours();
            
            if (hour <= currentHour) {
                // This slot is no longer available - refresh the time slots
                alert('This time slot is no longer available. Please select a different time.');
                
                // Recalculate and show updated time slots
                let availableHours = [];
                if (ServiceManager.isServiceAvailableOnDate(BookingState.selectedService, selectedDate)) {
                    availableHours = ServiceManager.getAvailableHoursForDate(BookingState.selectedService, selectedDate);
                    availableHours = ServiceManager.filterPastSlots(availableHours, selectedDate);
                    
                    // Remove busy slots
                    const busyHours = CacheManager.getBusyTimesForDate(dateString);
                    availableHours = availableHours.filter(h => !busyHours.includes(h));
                }
                
                // Update stored availability
                BookingState.availableSlots[dateString] = availableHours;
                
                if (availableHours.length > 0) {
                    // Show updated time slots
                    this.showTimeSlotSelection(dateString, availableHours);
                } else {
                    // No slots left for today
                    alert('No more time slots are available for today. Please select a different date.');
                    this.backToCalendar();
                }
                return;
            }
        }
        
        // Clear previous time slot selections
        document.querySelectorAll('.time-slot.selected').forEach(slot => {
            slot.classList.remove('selected');
        });
        
        // Mark the selected time slot
        const selectedSlot = document.querySelector(`.time-slot[data-time="${hour}"]`);
        if (selectedSlot) {
            selectedSlot.classList.add('selected');
        }
        
        // Slot is valid, proceed with selection
        BookingState.selectedTime = hour;
        BookingState.currentStep = 'booking-form';
        
        this.showBookingForm();
    },

    showTimeSlotSelection(dateString, availableSlots) {
        const timeSlotsContainer = document.getElementById('time-slots-container');
        if (!timeSlotsContainer) return;

        // Clear any previous booking form
        const bookingFormContainer = document.getElementById('booking-form-container');
        if (bookingFormContainer) {
            bookingFormContainer.style.display = 'none';
        }

        const date = new Date(dateString + 'T00:00:00');
        const formattedDate = date.toLocaleDateString('en-AU', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        if (!availableSlots || availableSlots.length === 0) {
            timeSlotsContainer.innerHTML = `
                <h4 class="text-center mb-4">Available Times for ${formattedDate}</h4>
                <div class="alert alert-info text-center">
                    <p class="mb-0">No available appointments for this date. Please select another date.</p>
                </div>
            `;
        } else {
            // Sort time slots chronologically
            const sortedSlots = [...availableSlots].sort((a, b) => a - b);

            let slotsHTML = `
                <h4 class="text-center mb-4">Available Times for ${formattedDate}</h4>
                <div class="time-slots-grid">`;

            sortedSlots.forEach(hour => {
                const timeString = `${hour.toString().padStart(2, '0')}:00`;
                const displayTime = this.formatTime12Hour(hour);
                slotsHTML += `
                    <div class="time-slot" onclick="BookingFlow.selectTime(${hour})" 
                         data-time="${hour}">
                        ${displayTime}
                    </div>
                `;
            });

            slotsHTML += `</div>`;
            timeSlotsContainer.innerHTML = slotsHTML;
        }

        // Scroll to time slots smoothly
        timeSlotsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    /**
     * Format hour (24h) to 12h format for display
     */
    formatTime12Hour(hour) {
        if (hour === 0) return '12:00 AM';
        if (hour < 12) return `${hour}:00 AM`;
        if (hour === 12) return '12:00 PM';
        return `${hour - 12}:00 PM`;
    },

    showBookingForm() {
        const bookingFormContainer = document.getElementById('booking-form-container');
        if (!bookingFormContainer) return;

        const selectedDate = new Date(BookingState.selectedDate + 'T00:00:00');
        const formattedDate = selectedDate.toLocaleDateString('en-AU', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        const displayTime = this.formatTime12Hour(BookingState.selectedTime);
        const serviceName = ServiceManager.getServiceName(BookingState.selectedService);

        const formHTML = `
            <div class="booking-form-content">
                <div class="booking-summary">
                    <h4 class="text-center mb-3">Complete Your Booking</h4>
                    <div class="text-center mb-4">
                        <p class="mb-1"><strong>Service:</strong> ${serviceName}</p>
                        <p class="mb-1"><strong>Date:</strong> ${formattedDate}</p>
                        <p class="mb-1"><strong>Time:</strong> ${displayTime}</p>
                        <p class="mb-0"><strong>Duration:</strong> 1 hour</p>
                    </div>
                </div>
                
                <form id="booking-form" class="booking-form">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group mb-3">
                                <label for="firstName">First Name *</label>
                                <input type="text" class="form-control" id="firstName" name="firstName" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group mb-3">
                                <label for="lastName">Last Name *</label>
                                <input type="text" class="form-control" id="lastName" name="lastName" required>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group mb-3">
                                <label for="email">Email Address *</label>
                                <input type="email" class="form-control" id="email" name="email" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group mb-3">
                                <label for="phone">Phone Number *</label>
                                <input type="tel" class="form-control" id="phone" name="phone" required>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group mb-4">
                        <label for="notes">Additional Notes (Optional)</label>
                        <textarea class="form-control" id="notes" name="notes" rows="3" 
                                  placeholder="Any specific requirements or questions?"></textarea>
                    </div>
                    
                    <div class="form-actions text-center">
                        <button type="button" class="btn btn-outline-secondary me-3" onclick="BookingFlow.clearBookingForm()">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-calendar-check"></i> Confirm Booking
                        </button>
                    </div>
                </form>
            </div>`;

        bookingFormContainer.innerHTML = formHTML;
        bookingFormContainer.style.display = 'block';

        // Attach form submission handler
        document.getElementById('booking-form').addEventListener('submit', this.handleBookingSubmission.bind(this));
        
        // Scroll to booking form smoothly
        bookingFormContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    async handleBookingSubmission(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const bookingData = {
            service: BookingState.selectedService,
            event: this.createGoogleEventData(formData),
            customerData: {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                notes: formData.get('notes') || ''
            }
        };

        try {
            // Show loading state
            const submitButton = e.target.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Booking...';
            submitButton.disabled = true;

            // Create the booking
            const result = await ApiClient.createBooking(bookingData);
            
            // Show success message
            this.showBookingConfirmation(result, bookingData.customerData);

        } catch (error) {
            console.error('Booking submission error:', error);
            ErrorHandler.handleBookingError(error);
            
            // Reset button
            const submitButton = e.target.querySelector('button[type="submit"]');
            submitButton.innerHTML = '<i class="fas fa-calendar-check"></i> Confirm Booking';
            submitButton.disabled = false;
        }
    },

    createGoogleEventData(formData) {
        const startDateTime = new Date(BookingState.selectedDate + `T${BookingState.selectedTime.toString().padStart(2, '0')}:00:00`);
        const endDateTime = new Date(startDateTime.getTime() + (60 * 60 * 1000)); // Add 1 hour

        return {
            summary: `${ServiceManager.getServiceName(BookingState.selectedService)} - ${formData.get('firstName')} ${formData.get('lastName')}`,
            description: `Booking Details:\n\nService: ${ServiceManager.getServiceName(BookingState.selectedService)}\nCustomer: ${formData.get('firstName')} ${formData.get('lastName')}\nEmail: ${formData.get('email')}\nPhone: ${formData.get('phone')}\n\nNotes: ${formData.get('notes') || 'None'}`,
            start: {
                dateTime: startDateTime.toISOString(),
                timeZone: 'Australia/Sydney'
            },
            end: {
                dateTime: endDateTime.toISOString(),
                timeZone: 'Australia/Sydney'
            },
            attendees: [
                { email: formData.get('email') }
            ]
        };
    },

    showBookingConfirmation(result, customerData) {
        const bookingFormContainer = document.getElementById('booking-form-container');
        if (!bookingFormContainer) return;

        const selectedDate = new Date(BookingState.selectedDate + 'T00:00:00');
        const formattedDate = selectedDate.toLocaleDateString('en-AU', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        const displayTime = this.formatTime12Hour(BookingState.selectedTime);
        const serviceName = ServiceManager.getServiceName(BookingState.selectedService);

        bookingFormContainer.innerHTML = `
            <div class="booking-success">
                <div class="text-center mb-4">
                    <i class="fas fa-check-circle text-success" style="font-size: 48px;"></i>
                </div>
                <h4 class="text-center mb-3">Booking Request Submitted!</h4>
                <p class="text-center mb-3">We've received your appointment request for <strong>${serviceName}</strong> on <strong>${formattedDate}</strong> at <strong>${displayTime}</strong>.</p>
                <p class="text-center mb-4">A confirmation email has been sent to <strong>${customerData.email}</strong>.</p>
                
                <div class="alert alert-info">
                    <h6 class="mb-2"><i class="fas fa-info-circle"></i> What happens next:</h6>
                    <ul class="mb-0">
                        <li>Our team will review your booking request</li>
                        <li>You'll receive a confirmation email with appointment details</li>
                        <li>You'll receive a reminder email 24 hours before your appointment</li>
                        <li>If you need to change your appointment, please call us at <a href="tel:0293987578">(02) 9398 7578</a></li>
                    </ul>
                </div>
                
                <div class="text-center mt-4">
                    <button type="button" class="btn btn-primary" onclick="BookingFlow.resetBooking()">
                        <i class="fas fa-plus"></i> Book Another Appointment
                    </button>
                </div>
            </div>`;

        // Scroll to confirmation message
        bookingFormContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    updateServiceSelection(serviceId) {
        // Update appointment type text
        const appointmentTypeText = document.getElementById('appointment-type-text');
        if (appointmentTypeText) {
            appointmentTypeText.textContent = `Booking: ${ServiceManager.getServiceName(serviceId)}`;
        }
    },

    backToCalendar() {
        BookingState.selectedDate = null;
        BookingState.selectedTime = null;
        BookingState.currentStep = 'calendar';
        
        // Clear time slots and booking form
        this.clearTimeSlots();
        this.clearBookingForm();
        
        CalendarRenderer.renderCalendar(BookingState.currentMonth);
    },

    backToTimeSelection() {
        BookingState.selectedTime = null;
        BookingState.currentStep = 'time-selection';
        
        // Clear booking form and show time slots again
        this.clearBookingForm();
        
        const availableSlots = BookingState.availableSlots[BookingState.selectedDate];
        this.showTimeSlotSelection(BookingState.selectedDate, availableSlots);
    },

    clearTimeSlots() {
        const timeSlotsContainer = document.getElementById('time-slots-container');
        if (timeSlotsContainer) {
            timeSlotsContainer.innerHTML = '';
        }
    },

    clearBookingForm() {
        const bookingFormContainer = document.getElementById('booking-form-container');
        if (bookingFormContainer) {
            bookingFormContainer.style.display = 'none';
            bookingFormContainer.innerHTML = '';
        }
    },

    resetBooking() {
        // Reset booking state
        BookingState.selectedDate = null;
        BookingState.selectedTime = null;
        BookingState.currentStep = 'calendar';
        
        // Clear all containers
        this.clearTimeSlots();
        this.clearBookingForm();
        
        // Re-render calendar to refresh availability data
        CalendarRenderer.renderCalendar(BookingState.currentMonth);
        
        // Scroll back to top of calendar
        const calendarContainer = document.getElementById('appointment-calendar');
        if (calendarContainer) {
            calendarContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
};

// =============================================================================
// ERROR HANDLER
// =============================================================================

const ErrorHandler = {
    showSystemUnavailableMessage() {
        const container = document.getElementById('appointment-calendar');
        if (!container) return;

        container.innerHTML = `
            <div class="alert alert-warning text-center system-unavailable-message">
                <div class="mb-4">
                    <i class="fas fa-tools fa-3x text-muted mb-3"></i>
                    <h4 class="text-dark">Our Booking System is Temporarily Unavailable</h4>
                </div>
                
                <div class="message-content text-left">
                    <p>We're currently experiencing a technical issue and are unable to process online bookings at the moment. We understand this may be inconvenient, and we're working to resolve the issue as quickly as possible.</p>
                    
                    <p>In the meantime, we're here to help you book your appointment directly. Please don't hesitate to contact our friendly team.</p>
                    
                    <div class="contact-options mt-4 mb-4">
                        <h6>You can reach us via:</h6>
                        <div class="contact-item">
                            <i class="fas fa-phone"></i> <strong>Phone:</strong> <a href="tel:0293987578">(02) 9398 7578</a>
                        </div>
                        <div class="contact-item">
                            <i class="fas fa-envelope"></i> <strong>Email:</strong> <a href="mailto:info@dkdental.au">info@dkdental.au</a>
                        </div>
                    </div>
                    
                    <p class="mb-0"><em>Thank you for your patience and understanding. We look forward to speaking with you soon and getting your appointment scheduled.</em></p>
                </div>
                
                <div class="mt-4">
                    <a href="contact-us.html" class="btn btn-outline-primary">
                        <i class="fas fa-envelope"></i> Contact Us
                    </a>
                </div>
            </div>`;
    },

    handleAvailabilityError(error) {
        console.error('Availability error:', error);
        this.showSystemUnavailableMessage();
    },

    handleBookingError(error) {
        console.error('Booking error:', error);
        this.showSystemUnavailableMessage();
    }
};

// =============================================================================
// CACHE MANAGER - 6 Week Data Loading
// =============================================================================

const CacheManager = {
    // Load 6 weeks of busy times starting from current date
    async loadSixWeeksData() {
        try {
            console.log('Loading 6 weeks of calendar data...');
            BookingState.cache.isLoading = true;

            // Calculate 6 weeks range starting from today
            const today = new Date();
            const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + (6 * 7)); // 6 weeks = 42 days

            // Store the range we're loading
            BookingState.cache.loadedRange.start = new Date(startDate);
            BookingState.cache.loadedRange.end = new Date(endDate);
            BookingState.cache.lastRefresh = new Date();

            // Get busy times from Google Calendar for the entire 6-week period
            const busyTimes = await this.fetchBusyTimesRange(startDate, endDate);
            
            // Store in cache
            BookingState.cache.busyTimes = busyTimes;

            console.log(`✅ Loaded 6 weeks of data (${startDate.toDateString()} to ${endDate.toDateString()})`);
            console.log(`📊 Found busy slots for ${Object.keys(busyTimes).length} days`);

            // Log cache status to debug panel
            if (window.DebugPanel && typeof window.DebugPanel.addLog === 'function') {
                const cacheInfo = `📊 Cache loaded: ${BookingState.cache.loadedRange.start?.toDateString()} to ${BookingState.cache.loadedRange.end?.toDateString()}`;
                window.DebugPanel.addLog(cacheInfo);
                window.DebugPanel.addLog(`🗄️ Cached ${Object.keys(BookingState.cache.busyTimes).length} days with busy slots`);
            }

            return busyTimes;

        } catch (error) {
            console.error('Error loading 6 weeks data:', error);
            throw error;
        } finally {
            BookingState.cache.isLoading = false;
        }
    },

    async fetchBusyTimesRange(startDate, endDate) {
        if (!BookingState.accessToken) {
            await ApiClient.getAccessToken();
        }

        try {
            // Try direct Google Calendar API call first
            try {
                const params = new URLSearchParams({
                    calendarId: 'info@dkdental.au',
                    timeMin: startDate.toISOString(),
                    timeMax: endDate.toISOString(),
                    singleEvents: 'true',
                    orderBy: 'startTime'
                });

                const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/info@dkdental.au/events?${params}`, {
                    headers: {
                        'Authorization': `Bearer ${BookingState.accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`Google Calendar API error: ${response.status}`);
                }

                const data = await response.json();
                return ApiClient.parseBusyTimes(data.items || []);
                
            } catch (corsError) {
                console.warn('Direct Google Calendar API failed, using server-side proxy:', corsError);
                
                // Fallback: Use server-side proxy if direct call fails due to CORS
                const proxyResponse = await fetch('script/calendar/get-busy-times.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        startDate: startDate.toISOString(),
                        endDate: endDate.toISOString()
                    })
                });

                if (!proxyResponse.ok) {
                    throw new Error(`Server proxy error: ${proxyResponse.status}`);
                }

                const proxyData = await proxyResponse.json();
                if (!proxyData.success) {
                    throw new Error(proxyData.error || 'Failed to get busy times');
                }

                return proxyData.busyTimes || {};
            }
        } catch (error) {
            console.error('Error fetching busy times range:', error);
            // Return empty busy times so calendar still works
            return {};
        }
    },

    // Get busy times for a specific date from cache
    getBusyTimesForDate(dateString) {
        return BookingState.cache.busyTimes[dateString] || [];
    },

    // Check if we have cached data for a specific date
    hasDataForDate(dateString) {
        const targetDate = new Date(dateString + 'T00:00:00');
        const start = BookingState.cache.loadedRange.start;
        const end = BookingState.cache.loadedRange.end;
        
        return start && end && targetDate >= start && targetDate <= end;
    },

    // Check if cache needs refresh (older than 1 hour or missing data)
    needsRefresh() {
        if (!BookingState.cache.lastRefresh) return true;
        
        const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000));
        return BookingState.cache.lastRefresh < oneHourAgo;
    }
};

// =============================================================================
// REAL-TIME AVAILABILITY MANAGER
// =============================================================================

const RealTimeManager = {
    intervalId: null,
    
    /**
     * Start monitoring current day availability and update in real-time
     */
    startMonitoring() {
        // Check every minute for current day availability changes
        this.intervalId = setInterval(() => {
            this.checkAndUpdateCurrentDay();
        }, 60000); // 60 seconds
        
        console.log('✅ Real-time availability monitoring started');
    },
    
    /**
     * Stop the real-time monitoring
     */
    stopMonitoring() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('⏹️ Real-time availability monitoring stopped');
        }
    },
    
    /**
     * Check if today's availability has changed and update if necessary
     */
    checkAndUpdateCurrentDay() {
        const today = new Date();
        const todayString = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
        
        // Only update if we're currently showing today and user hasn't selected a date/time yet
        if (BookingState.currentStep !== 'calendar') {
            return; // User is in booking flow, don't disrupt
        }
        
        // Check if today should now be completely unavailable
        if (ServiceManager.isDayCompletelyUnavailable(today)) {
            // Update the calendar display for today
            CalendarRenderer.updateDateAvailability(todayString, [], true);
            BookingState.availableSlots[todayString] = [];
            
            console.log(`📅 Today (${todayString}) is now completely unavailable - all time slots have passed`);
        } else {
            // Recalculate today's availability for the current service
            const currentService = BookingState.selectedService;
            
            let availableHours = [];
            if (ServiceManager.isServiceAvailableOnDate(currentService, today)) {
                availableHours = ServiceManager.getAvailableHoursForDate(currentService, today);
                availableHours = ServiceManager.filterPastSlots(availableHours, today);
                
                // Remove busy slots
                const busyHours = CacheManager.getBusyTimesForDate(todayString);
                availableHours = availableHours.filter(hour => !busyHours.includes(hour));
            }
            
            // Update only if availability has changed
            const currentAvailability = BookingState.availableSlots[todayString] || [];
            if (JSON.stringify(availableHours) !== JSON.stringify(currentAvailability)) {
                CalendarRenderer.updateDateAvailability(todayString, availableHours, false);
                BookingState.availableSlots[todayString] = availableHours;
                
                console.log(`📅 Updated today's availability: ${availableHours.length} slots remaining`);
            }
        }
    }
};

// =============================================================================
// BUSINESS LOGIC TESTING & DEBUGGING
// =============================================================================

const BusinessLogicTester = {
    /**
     * Test the business rules for a specific date and service
     */
    testBusinessRules(serviceId, dateString) {
        const date = new Date(dateString + 'T00:00:00');
        const dayOfWeek = date.getDay();
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const isToday = CalendarRenderer.isToday(date);
        const isPast = CalendarRenderer.isPast(date);
        
        console.log(`\n🧪 Testing Business Rules for ${serviceId} on ${dateString} (${dayName})`);
        console.log(`📅 Is Today: ${isToday}, Is Past: ${isPast}, Day of Week: ${dayOfWeek}`);
        
        // Test 1: Weekend Check
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            console.log(`❌ Weekend Day - No services available`);
            return [];
        }
        
        // Test 2: Past Date Check
        if (isPast) {
            console.log(`❌ Past Date - No services available`);
            return [];
        }
        
        // Test 3: Service Availability
        const service = ServiceManager.getServiceConfig(serviceId);
        if (!service) {
            console.log(`❌ Invalid Service ID: ${serviceId}`);
            return [];
        }
        
        const schedule = service.schedule[dayName.toLowerCase()];
        if (!schedule) {
            console.log(`❌ Service not available on ${dayName}`);
            return [];
        }
        
        console.log(`✅ Service Schedule: ${schedule.start}:00 - ${schedule.end}:00`);
        
        // Test 4: Generate potential slots
        let potentialSlots = [];
        for (let hour = schedule.start; hour < schedule.end; hour++) {
            potentialSlots.push(hour);
        }
        console.log(`📋 Potential Slots: ${potentialSlots.map(h => h + ':00').join(', ')}`);
        
        // Test 5: Current Day Logic
        if (isToday) {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            
            console.log(`⏰ Current Time: ${currentHour}:${currentMinute.toString().padStart(2, '0')}`);
            
            const futureSlots = potentialSlots.filter(hour => hour > currentHour);
            console.log(`🔮 Future Slots After Current Hour: ${futureSlots.map(h => h + ':00').join(', ') || 'None'}`);
            
            // Test if day is completely unavailable
            const isDayUnavailable = ServiceManager.isDayCompletelyUnavailable(date);
            console.log(`🚫 Is Day Completely Unavailable: ${isDayUnavailable}`);
            
            potentialSlots = futureSlots;
        }
        
        // Test 6: Busy Times Check
        const busyHours = CacheManager.getBusyTimesForDate(dateString);
        console.log(`🗓️  Busy Hours from Calendar: ${busyHours.map(h => h + ':00').join(', ') || 'None'}`);
        
        const finalSlots = potentialSlots.filter(hour => !busyHours.includes(hour));
        console.log(`✅ Final Available Slots: ${finalSlots.map(h => h + ':00').join(', ') || 'None'}`);
        
        return finalSlots;
    },
    
    /**
     * Test all services for a given date
     */
    testAllServicesForDate(dateString) {
        console.log(`\n🔍 Testing all services for ${dateString}`);
        const services = ['dentures', 'repairs', 'mouthguards'];
        
        services.forEach(serviceId => {
            this.testBusinessRules(serviceId, dateString);
        });
    },
    
    /**
     * Test the current day scenario with different times
     */
    testCurrentDayScenarios() {
        const today = new Date();
        const todayString = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
        
        console.log(`\n📊 Current Day Business Logic Test for ${todayString}`);
        
        // Test each service
        const services = ['dentures', 'repairs', 'mouthguards'];
        services.forEach(serviceId => {
            console.log(`\n--- Testing ${serviceId.toUpperCase()} ---`);
            const slots = this.testBusinessRules(serviceId, todayString);
            
            if (slots.length === 0) {
                console.log(`🔴 No slots available for ${serviceId} today`);
            } else {
                console.log(`🟢 ${slots.length} slots available for ${serviceId} today`);
            }
        });
    },
    
    /**
     * Verify the example from business rules (Thursday, May 29, 2025, 5:41:21 PM AEST)
     */
    testBusinessRuleExample() {
        // Test the original example (4:23 PM)
        console.log('\n📋 Testing Business Rule Example 1: Thursday, May 29, 2025, 4:23:39 PM AEST');
        
        // Create a mock current time for testing
        const originalNow = Date.now;
        const mockTime1 = new Date('2025-05-29T16:23:39+10:00'); // 4:23 PM AEST
        Date.now = () => mockTime1.getTime();
        
        // Test each service
        console.log('\n--- Dentures (closes 4 PM) ---');
        const dentureSlots1 = this.testBusinessRules('dentures', '2025-05-29');
        console.log(`Expected: No slots (closes at 4 PM, current time 4:23 PM)`);
        console.log(`Actual: ${dentureSlots1.length} slots`);
        
        console.log('\n--- Maintenance & Repairs (closes 4 PM) ---');
        const repairSlots1 = this.testBusinessRules('repairs', '2025-05-29');
        console.log(`Expected: No slots (closes at 4 PM, current time 4:23 PM)`);
        console.log(`Actual: ${repairSlots1.length} slots`);
        
        console.log('\n--- Mouthguards (closes 6 PM) ---');
        const mouthguardSlots1 = this.testBusinessRules('mouthguards', '2025-05-29');
        console.log(`Expected: Only 5:00 PM slot available`);
        console.log(`Actual: ${mouthguardSlots1.map(h => h + ':00').join(', ')}`);
        
        // Test the new example (5:41 PM)
        console.log('\n📋 Testing Business Rule Example 2: Thursday, May 29, 2025, 5:41:21 PM AEST');
        
        const mockTime2 = new Date('2025-05-29T17:41:21+10:00'); // 5:41 PM AEST
        Date.now = () => mockTime2.getTime();
        
        console.log('\n--- Dentures (closes 4 PM) ---');
        const dentureSlots2 = this.testBusinessRules('dentures', '2025-05-29');
        console.log(`Expected: No slots (closes at 4 PM, last slot 3 PM, current time 5:41 PM)`);
        console.log(`Actual: ${dentureSlots2.length} slots`);
        
        console.log('\n--- Maintenance & Repairs (closes 4 PM) ---');
        const repairSlots2 = this.testBusinessRules('repairs', '2025-05-29');
        console.log(`Expected: No slots (closes at 4 PM, last slot 3 PM, current time 5:41 PM)`);
        console.log(`Actual: ${repairSlots2.length} slots`);
        
        console.log('\n--- Mouthguards (closes 6 PM) ---');
        const mouthguardSlots2 = this.testBusinessRules('mouthguards', '2025-05-29');
        console.log(`Expected: No slots (closes at 6 PM, last slot 5 PM, current time 5:41 PM)`);
        console.log(`Actual: ${mouthguardSlots2.length} slots`);
        
        // Test if entire day becomes unavailable at 5:41 PM
        const isDayUnavailable = ServiceManager.isDayCompletelyUnavailable(new Date('2025-05-29T17:41:21+10:00'));
        console.log(`\n🚫 Is entire day unavailable at 5:41 PM: ${isDayUnavailable}`);
        console.log(`Expected: true (all services have no future slots)`);
        
        // Restore original Date.now
        Date.now = originalNow;
    }
};

// =============================================================================
// INITIALIZATION
// =============================================================================

const BookingSystem = {
    async initialize() {
        try {
            console.log('Initializing booking system...');
            
            // Set initial state
            BookingState.systemStatus = 'loading';
            BookingState.isInitialized = false;

            // Get access token
            await ApiClient.getAccessToken();
            
            // Load 6 weeks of calendar data upfront
            console.log('Loading 6 weeks of calendar data...');
            await CacheManager.loadSixWeeksData();
            
            // Log cache status to debug panel
            if (window.DebugPanel && typeof window.DebugPanel.addLog === 'function') {
                const cacheInfo = `📊 Cache loaded: ${BookingState.cache.loadedRange.start?.toDateString()} to ${BookingState.cache.loadedRange.end?.toDateString()}`;
                window.DebugPanel.addLog(cacheInfo);
                window.DebugPanel.addLog(`🗄️ Cached ${Object.keys(BookingState.cache.busyTimes).length} days with busy slots`);
            }
            
            // Initialize with default service
            BookingFlow.selectService(BookingState.selectedService);
            
            // Start real-time availability monitoring
            RealTimeManager.startMonitoring();
            
            BookingState.systemStatus = 'ready';
            BookingState.isInitialized = true;
            
            console.log('✅ Booking system initialized successfully with 6 weeks of cached data');

        } catch (error) {
            console.error('Failed to initialize booking system:', error);
            BookingState.systemStatus = 'error';
            ErrorHandler.showSystemUnavailableMessage();
            
            // Stop monitoring if initialization failed
            RealTimeManager.stopMonitoring();
        }
    },

    /**
     * Clean shutdown of the booking system
     */
    shutdown() {
        RealTimeManager.stopMonitoring();
        console.log('📴 Booking system shut down');
    }
};

// Make global functions available for HTML onclick handlers
window.BookingFlow = BookingFlow;
window.BookingSystem = BookingSystem;
window.BookingState = BookingState;
window.ServiceManager = ServiceManager;
window.AvailabilityManager = AvailabilityManager;
window.CalendarRenderer = CalendarRenderer;
window.ErrorHandler = ErrorHandler;
window.CacheManager = CacheManager;
window.RealTimeManager = RealTimeManager;
window.BusinessLogicTester = BusinessLogicTester;

// Quick test function for verifying business logic
window.testBusinessLogic = () => {
    console.log('🧪 Running Business Logic Tests...');
    
    // Test current day scenarios
    BusinessLogicTester.testCurrentDayScenarios();
    
    // Test the business rule example
    BusinessLogicTester.testBusinessRuleExample();
    
    // Test a weekend
    const nextSaturday = new Date();
    nextSaturday.setDate(nextSaturday.getDate() + (6 - nextSaturday.getDay()));
    const saturdayString = `${nextSaturday.getFullYear()}-${(nextSaturday.getMonth() + 1).toString().padStart(2, '0')}-${nextSaturday.getDate().toString().padStart(2, '0')}`;
    BusinessLogicTester.testAllServicesForDate(saturdayString);
    
    console.log('\n✅ Business Logic Tests Complete! Check the output above for results.');
    console.log('💡 To test a specific date, use: BusinessLogicTester.testBusinessRules("mouthguards", "2024-12-25")');
};

// Clean up monitoring when page is unloaded
window.addEventListener('beforeunload', () => {
    BookingSystem.shutdown();
}); 