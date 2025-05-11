/**
 * Smooth Accordion Animation
 * 
 * This script enhances the Bootstrap accordion with smooth animations
 * for a better user experience when expanding and collapsing items.
 */

(function($) {
  'use strict';

  // Initialize when document is ready
  $(document).ready(function() {
    initSmoothAccordion();
  });

  /**
   * Initialize smooth accordion functionality
   */
  function initSmoothAccordion() {
    // Target all accordion buttons
    const accordionButtons = document.querySelectorAll('.accordion .btn-link');
    
    // Add event listeners to each button
    accordionButtons.forEach(button => {
      button.addEventListener('click', handleAccordionClick);
    });

    // Add CSS classes for transitions to all accordion content elements
    const accordionContents = document.querySelectorAll('.accordion .accordion-content');
    accordionContents.forEach(content => {
      content.classList.add('smooth-accordion-content');
      
      // Set initial state
      if (content.classList.contains('show')) {
        content.style.maxHeight = content.scrollHeight + 'px';
      } else {
        content.style.maxHeight = '0px';
      }
    });
  }

  /**
   * Handle accordion button click
   * @param {Event} event - Click event
   */
  function handleAccordionClick(event) {
    // Prevent default behavior
    event.preventDefault();
    
    const button = event.currentTarget;
    const targetId = button.getAttribute('data-bs-target');
    const targetContent = document.querySelector(targetId);
    
    // If already animating, return
    if (targetContent.classList.contains('animating')) {
      return;
    }
    
    // Get parent accordion
    const accordion = button.closest('.accordion');
    const isMultiple = !accordion.querySelector('[data-bs-parent]');
    
    // Toggle current item
    toggleAccordionItem(button, targetContent);
    
    // If not multiple, close other items
    if (!isMultiple) {
      const otherButtons = accordion.querySelectorAll('.btn-link:not([data-bs-target="' + targetId + '"])');
      const otherContents = accordion.querySelectorAll('.accordion-content.show:not(' + targetId + ')');
      
      otherButtons.forEach(otherButton => {
        otherButton.classList.add('collapsed');
        otherButton.setAttribute('aria-expanded', 'false');
      });
      
      otherContents.forEach(otherContent => {
        closeAccordionItem(otherContent);
      });
    }
  }

  /**
   * Toggle accordion item open/closed
   * @param {Element} button - The accordion button
   * @param {Element} content - The accordion content
   */
  function toggleAccordionItem(button, content) {
    if (content.classList.contains('show')) {
      // Close item
      button.classList.add('collapsed');
      button.setAttribute('aria-expanded', 'false');
      closeAccordionItem(content);
    } else {
      // Open item
      button.classList.remove('collapsed');
      button.setAttribute('aria-expanded', 'true');
      openAccordionItem(content);
    }
  }

  /**
   * Open an accordion item with animation
   * @param {Element} content - The accordion content
   */
  function openAccordionItem(content) {
    // Mark as animating
    content.classList.add('animating');
    
    // Set max height to scroll height for animation
    const scrollHeight = content.scrollHeight;
    content.style.maxHeight = scrollHeight + 'px';
    
    // Add show class
    content.classList.add('show');
    
    // Scroll to the accordion item if it's not fully visible
    setTimeout(() => {
      scrollToAccordionIfNeeded(content);
    }, 50);
    
    // Remove animating class after animation completes
    setTimeout(() => {
      content.classList.remove('animating');
      // Set max height to none to allow for dynamic content
      content.style.maxHeight = 'none';
    }, 350);
  }

  /**
   * Close an accordion item with animation
   * @param {Element} content - The accordion content
   */
  function closeAccordionItem(content) {
    // Mark as animating
    content.classList.add('animating');
    
    // Set max height to current height first
    content.style.maxHeight = content.scrollHeight + 'px';
    
    // Force a reflow
    content.offsetHeight;
    
    // Then animate to zero
    setTimeout(() => {
      content.style.maxHeight = '0px';
    }, 10);
    
    // Remove show class after animation
    setTimeout(() => {
      content.classList.remove('show');
      content.classList.remove('animating');
    }, 350);
  }

  /**
   * Scroll to accordion item if it's not fully visible
   * @param {Element} content - The accordion content
   */
  function scrollToAccordionIfNeeded(content) {
    const rect = content.getBoundingClientRect();
    const accordionHeader = content.previousElementSibling;
    const headerRect = accordionHeader.getBoundingClientRect();
    
    // If the bottom of the content is below the viewport
    if (rect.bottom > window.innerHeight) {
      // Calculate how much of the content is visible
      const visibleHeight = window.innerHeight - rect.top;
      const contentHeight = rect.height;
      
      // If less than 50% is visible, scroll to make more visible
      if (visibleHeight < contentHeight * 0.5) {
        // Scroll to the header with some offset
        window.scrollTo({
          top: window.pageYOffset + headerRect.top - 100,
          behavior: 'smooth'
        });
      }
    }
  }

})(jQuery);
