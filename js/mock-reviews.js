/**
 * Mock Google Reviews Widget
 * A temporary solution to display mock reviews while PHP API issues are resolved
 */
document.addEventListener('DOMContentLoaded', function() {
  // Get the container
  const container = document.querySelector('#google-reviews-carousel');
  
  if (!container) {
    console.error('Reviews container not found');
    return;
  }
  
  // Define mock reviews
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
  
  // Clear existing content
  container.innerHTML = '';
  
  // Render reviews
  mockReviews.forEach(review => {
    const reviewItem = document.createElement('div');
    reviewItem.className = 'item';
    
    const reviewHtml = `
      <div class="testimonial-item">
        <div class="testimonial-content">
          <div class="review-stars mb-2">${renderStars(review.rating)}</div>
          <p>${review.text}</p>
        </div>
        <div class="testimonial-author">
          <div class="testimonial-name">
            <h6 class="mb-1">${review.author_name}</h6>
            <span>${formatDate(review.time)}</span>
          </div>
        </div>
      </div>
    `;
    
    reviewItem.innerHTML = reviewHtml;
    container.appendChild(reviewItem);
  });
  
  // Initialize carousel
  if ($.fn.owlCarousel) {
    $(container).owlCarousel({
      nav: true,
      dots: false,
      items: 2,
      responsive: {
        0: { items: 1 },
        768: { items: 2 }
      },
      margin: 30,
      autoHeight: true,
      autoplay: true,
      autoplayTimeout: 5000,
      navText: [
        '<i class="fas fa-chevron-left"></i>',
        '<i class="fas fa-chevron-right"></i>'
      ]
    });
  }
  
  // Helper function to render stars
  function renderStars(rating) {
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
  
  // Helper function to format date
  function formatDate(timestamp) {
    const reviewDate = new Date(timestamp * 1000);
    const now = new Date();
    
    const diffTime = Math.abs(now - reviewDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) return 'Today';
    if (diffDays < 2) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }
}); 