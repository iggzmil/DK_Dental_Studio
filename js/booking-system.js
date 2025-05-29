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

        // Filter out past hours for today
        const currentHour = now.getHours();
        return slots.filter(hour => hour > currentHour);
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
            const dateString = date.toISOString().split('T')[0];
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
            </div>`;

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

        // For past dates, show no text
        if (isPastDate) {
            indicator.innerHTML = '';
            indicator.parentElement.classList.add('past-date');
            return;
        }

        const date = new Date(dateString + 'T00:00:00');
        const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
        
        // Debug Saturday processing specifically
        if (dayOfWeek === 6) {
            console.log(`DEBUG SAT ${dateString}: dayOfWeek=${dayOfWeek}, availableSlots=${availableSlots.length}`);
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
                
                if (dayOfWeek === 6) {
                    console.log(`DEBUG SAT ${dateString}: SET TO CLOSED`);
                }
            } else {
                // Business day with no slots - show nothing (blank but potentially bookable)
                indicator.innerHTML = '';
                indicator.parentElement.classList.remove('available', 'unavailable', 'closed');
                
                if (dayOfWeek === 6) {
                    console.log(`DEBUG SAT ${dateString}: WENT TO BUSINESS DAY BRANCH - THIS IS WRONG!`);
                }
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

            // Get busy times from Google Calendar
            const busySlots = await ApiClient.getCalendarBusyTimes(month);
            BookingState.busySlots = busySlots;

            // Calculate available slots for each day
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
            const dateString = date.toISOString().split('T')[0];
            const isPastDate = CalendarRenderer.isPast(date);
            const dayOfWeek = date.getDay();
            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

            // For past dates, always show no text regardless of service
            if (isPastDate) {
                CalendarRenderer.updateDateAvailability(dateString, [], true);
                continue;
            }

            // For future dates, get available hours based on service schedule
            let availableHours = [];
            
            if (ServiceManager.isServiceAvailableOnDate(serviceId, date)) {
                // Business day - get potential hours
                availableHours = ServiceManager.getAvailableHoursForDate(serviceId, date);
                
                // Filter out past slots if today
                availableHours = ServiceManager.filterPastSlots(availableHours, date);

                // Remove busy slots
                const busyHours = BookingState.busySlots[dateString] || [];
                availableHours = availableHours.filter(hour => !busyHours.includes(hour));
            }
            
            // Force weekends to have no available hours (double-check)
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                availableHours = [];
                
                // Debug the actual HTML being generated
                setTimeout(() => {
                    const dayElement = document.querySelector(`[data-date="${dateString}"]`);
                    if (dayElement) {
                        const dayName = dayOfWeek === 0 ? 'SUNDAY' : 'SATURDAY';
                        console.log(`${dayName} ${dateString}:`, dayElement.outerHTML);
                    }
                }, 100);
            }

            // Update UI - this will show "Available", "Closed", or nothing based on the day and slots
            CalendarRenderer.updateDateAvailability(dateString, availableHours, false);
            
            // Debug what's happening with Saturday calls
            if (dayOfWeek === 6) {
                console.log(`SATURDAY ${dateString}: Called updateDateAvailability with ${availableHours.length} hours`);
            }

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

        BookingState.selectedDate = dateString;
        BookingState.currentStep = 'time-selection';
        
        this.showTimeSlotSelection(dateString, availableSlots);
    },

    selectTime(hour) {
        BookingState.selectedTime = hour;
        BookingState.currentStep = 'booking-form';
        
        this.showBookingForm();
    },

    showTimeSlotSelection(dateString, availableSlots) {
        const container = document.getElementById('appointment-calendar');
        if (!container) return;

        const date = new Date(dateString + 'T00:00:00');
        const formattedDate = date.toLocaleDateString('en-AU', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        let slotsHTML = `
            <div class="time-slot-selection">
                <div class="selection-header">
                    <button type="button" class="btn btn-outline-secondary btn-sm" onclick="BookingFlow.backToCalendar()">
                        <i class="fas fa-arrow-left"></i> Back to Calendar
                    </button>
                    <h4>Select Time - ${formattedDate}</h4>
                </div>
                <div class="time-slots-grid">`;

        availableSlots.forEach(hour => {
            const timeString = `${hour.toString().padStart(2, '0')}:00`;
            slotsHTML += `
                <button type="button" class="btn btn-outline-primary time-slot-btn" 
                        onclick="BookingFlow.selectTime(${hour})">
                    ${timeString}
                </button>`;
        });

        slotsHTML += `
                </div>
            </div>`;

        container.innerHTML = slotsHTML;
    },

    showBookingForm() {
        const container = document.getElementById('appointment-calendar');
        if (!container) return;

        const selectedDate = new Date(BookingState.selectedDate + 'T00:00:00');
        const formattedDate = selectedDate.toLocaleDateString('en-AU', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        const timeString = `${BookingState.selectedTime.toString().padStart(2, '0')}:00`;
        const serviceName = ServiceManager.getServiceName(BookingState.selectedService);

        const formHTML = `
            <div class="booking-form-container">
                <div class="booking-summary">
                    <h4>Booking Summary</h4>
                    <p><strong>Service:</strong> ${serviceName}</p>
                    <p><strong>Date:</strong> ${formattedDate}</p>
                    <p><strong>Time:</strong> ${timeString}</p>
                    <p><strong>Duration:</strong> 1 hour</p>
                </div>
                
                <form id="booking-form" class="booking-form">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="firstName">First Name *</label>
                                <input type="text" class="form-control" id="firstName" name="firstName" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="lastName">Last Name *</label>
                                <input type="text" class="form-control" id="lastName" name="lastName" required>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="email">Email Address *</label>
                                <input type="email" class="form-control" id="email" name="email" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="phone">Phone Number *</label>
                                <input type="tel" class="form-control" id="phone" name="phone" required>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="notes">Additional Notes (Optional)</label>
                        <textarea class="form-control" id="notes" name="notes" rows="3" 
                                  placeholder="Any specific requirements or questions?"></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-outline-secondary" onclick="BookingFlow.backToTimeSelection()">
                            <i class="fas fa-arrow-left"></i> Back
                        </button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-calendar-check"></i> Confirm Booking
                        </button>
                    </div>
                </form>
            </div>`;

        container.innerHTML = formHTML;

        // Attach form submission handler
        document.getElementById('booking-form').addEventListener('submit', this.handleBookingSubmission.bind(this));
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
        const container = document.getElementById('appointment-calendar');
        if (!container) return;

        const selectedDate = new Date(BookingState.selectedDate + 'T00:00:00');
        const formattedDate = selectedDate.toLocaleDateString('en-AU', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        const timeString = `${BookingState.selectedTime.toString().padStart(2, '0')}:00`;

        container.innerHTML = `
            <div class="booking-confirmation">
                <div class="alert alert-success text-center">
                    <i class="fas fa-check-circle fa-3x text-success mb-3"></i>
                    <h4>Booking Confirmed!</h4>
                    <p class="mb-3">Your appointment has been successfully booked.</p>
                    
                    <div class="confirmation-details">
                        <p><strong>Service:</strong> ${ServiceManager.getServiceName(BookingState.selectedService)}</p>
                        <p><strong>Date:</strong> ${formattedDate}</p>
                        <p><strong>Time:</strong> ${timeString}</p>
                        <p><strong>Name:</strong> ${customerData.firstName} ${customerData.lastName}</p>
                    </div>
                    
                    <p class="mt-3">A confirmation email has been sent to <strong>${customerData.email}</strong></p>
                    
                    <div class="mt-4">
                        <button type="button" class="btn btn-primary" onclick="location.reload()">
                            Book Another Appointment
                        </button>
                    </div>
                </div>
            </div>`;
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
        CalendarRenderer.renderCalendar(BookingState.currentMonth);
    },

    backToTimeSelection() {
        BookingState.selectedTime = null;
        BookingState.currentStep = 'time-selection';
        const availableSlots = BookingState.availableSlots[BookingState.selectedDate];
        this.showTimeSlotSelection(BookingState.selectedDate, availableSlots);
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
            
            // Initialize with default service
            BookingFlow.selectService(BookingState.selectedService);
            
            BookingState.systemStatus = 'ready';
            BookingState.isInitialized = true;
            
            console.log('Booking system initialized successfully');

        } catch (error) {
            console.error('Failed to initialize booking system:', error);
            BookingState.systemStatus = 'error';
            ErrorHandler.showSystemUnavailableMessage();
        }
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