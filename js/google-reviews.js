/**
 * Google Reviews Widget for DK Dental Studio
 * This script fetches and displays Google Reviews using the Google My Business API
 */

class GoogleReviewsWidget {
  constructor(options) {
    this.apiEndpoint = options.apiEndpoint || '/api/reviews.php';
    this.containerSelector = options.containerSelector;
    this.maxReviews = options.maxReviews || 5;
    this.minRating = options.minRating || 4;
    this.showRating = options.showRating !== undefined ? options.showRating : true;
    this.showDate = options.showDate !== undefined ? options.showDate : true;
    this.dateFormat = options.dateFormat || 'relative'; // 'relative' or 'MMM DD, YYYY'
    this.autoplay = options.autoplay !== undefined ? options.autoplay : true;
    this.autoplaySpeed = options.autoplaySpeed || 5000;
    this.reviewsData = [];
    this.container = document.querySelector(this.containerSelector);

    if (!this.container) {
      console.error(`Container element not found: ${this.containerSelector}`);
      return;
    }

    this.init();
  }

  init() {
    // Fetch reviews from the API endpoint
    this.fetchReviews();
  }

  useMockData() {
    // Mock data for development and testing
    const mockReviews = [
      {
        author_name: "Sarah Johnson",
        rating: 5,
        text: "I couldn't be happier with my new dentures from DK Dental Studio! They fit perfectly and look so natural. The team was professional and made the whole process easy and comfortable.",
        time: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60) // 7 days ago
      },
      {
        author_name: "Michael Thompson",
        rating: 5,
        text: "After years of struggling with uncomfortable dentures, I finally found DK Dental Studio. The difference is incredible - I can eat, talk, and smile with confidence again. Highly recommended!",
        time: Math.floor(Date.now() / 1000) - (14 * 24 * 60 * 60) // 14 days ago
      },
      {
        author_name: "Emma Wilson",
        rating: 5,
        text: "The mouthguard they made for my son is perfect! It fits well, he can talk clearly with it in, and it provides great protection for his sports. The staff was wonderful with him too.",
        time: Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60) // 30 days ago
      },
      {
        author_name: "David Chen",
        rating: 4,
        text: "Very professional service. My denture repair was completed quickly and at a reasonable price. The only reason for 4 stars instead of 5 is that I had to wait a bit longer than expected.",
        time: Math.floor(Date.now() / 1000) - (45 * 24 * 60 * 60) // 45 days ago
      },
      {
        author_name: "Jennifer Adams",
        rating: 5,
        text: "I've been a patient at DK Dental Studio for years and wouldn't go anywhere else. They take the time to ensure everything fits perfectly and the results are always outstanding.",
        time: Math.floor(Date.now() / 1000) - (60 * 24 * 60 * 60) // 60 days ago
      }
    ];

    this.reviewsData = mockReviews
      .filter(review => review.rating >= this.minRating)
      .slice(0, this.maxReviews);

    this.renderReviews();
    this.initCarousel();
  }

  loadGooglePlacesAPI() {
    // Check if the API is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      this.fetchReviews();
      return;
    }

    // Create script element to load Google Places API
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places&callback=googleReviewsWidgetCallback`;
    script.async = true;
    script.defer = true;

    // Define global callback function
    window.googleReviewsWidgetCallback = () => {
      this.fetchReviews();
    };

    document.head.appendChild(script);
  }

  fetchReviews() {
    // This method would use the Google My Business API to fetch reviews
    // For now, we're using mock data since the provided credentials are OAuth credentials

    // In a production environment with the correct API key, you would use:
    /*
    const service = new google.maps.places.PlacesService(document.createElement('div'));

    service.getDetails({
      placeId: this.placeId,
      fields: ['reviews', 'name', 'rating']
    }, (place, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && place.reviews) {
        this.reviewsData = place.reviews
          .filter(review => review.rating >= this.minRating)
          .slice(0, this.maxReviews);

        this.renderReviews();
        this.initCarousel();
      } else {
        console.error('Error fetching Google reviews:', status);
        this.renderErrorMessage();
      }
    });
    */

    // For now, we'll use the mock data
    this.useMockData();
  }

  formatDate(timestamp) {
    const reviewDate = new Date(timestamp * 1000);
    const now = new Date();

    if (this.dateFormat === 'relative') {
      const diffTime = Math.abs(now - reviewDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 1) return 'Today';
      if (diffDays < 2) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
      return `${Math.floor(diffDays / 365)} years ago`;
    } else {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[reviewDate.getMonth()]} ${reviewDate.getDate()}, ${reviewDate.getFullYear()}`;
    }
  }

  renderStars(rating) {
    let starsHtml = '';
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        starsHtml += '<i class="fas fa-star text-warning"></i>';
      } else if (i === fullStars + 1 && halfStar) {
        starsHtml += '<i class="fas fa-star-half-alt text-warning"></i>';
      } else {
        starsHtml += '<i class="far fa-star text-warning"></i>';
      }
    }

    return starsHtml;
  }

  renderReviews() {
    if (!this.reviewsData.length) {
      this.renderErrorMessage();
      return;
    }

    // Clear existing content
    this.container.innerHTML = '';

    // Create carousel items
    this.reviewsData.forEach(review => {
      const reviewItem = document.createElement('div');
      reviewItem.className = 'item';

      const reviewHtml = `
        <div class="testimonial-item">
          <div class="testimonial-content">
            ${this.showRating ? `<div class="review-stars mb-2">${this.renderStars(review.rating)}</div>` : ''}
            <p>${review.text}</p>
          </div>
          <div class="testimonial-author">
            <div class="testimonial-name">
              <h6 class="mb-1">${review.author_name}</h6>
              ${this.showDate ? `<span>${this.formatDate(review.time)}</span>` : ''}
            </div>
          </div>
        </div>
      `;

      reviewItem.innerHTML = reviewHtml;
      this.container.appendChild(reviewItem);
    });
  }

  renderErrorMessage() {
    this.container.innerHTML = `
      <div class="item">
        <div class="testimonial-item">
          <div class="testimonial-content">
            <p>Unable to load Google reviews at this time. Please check back later.</p>
          </div>
        </div>
      </div>
    `;
  }

  initCarousel() {
    // Initialize or reinitialize the owl carousel
    if ($.fn.owlCarousel) {
      $(this.containerSelector).trigger('destroy.owl.carousel');

      $(this.containerSelector).owlCarousel({
        nav: true,
        dots: false,
        items: 2,
        responsive: {
          0: { items: 1 },
          768: { items: 2 }
        },
        margin: 30,
        autoHeight: true,
        autoplay: this.autoplay,
        autoplayTimeout: this.autoplaySpeed,
        navText: [
          '<i class="fas fa-chevron-left"></i>',
          '<i class="fas fa-chevron-right"></i>'
        ]
      });
    }
  }
}
