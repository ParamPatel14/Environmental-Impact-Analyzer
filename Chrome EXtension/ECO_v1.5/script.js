// Add interactivity to the CTA button
document.getElementById('ctaButton').addEventListener('click', () => {
  const contentSection = document.getElementById('dynamicContent');
  contentSection.innerHTML = `
    <h2>Let's Get Started!</h2>
    <form id="contactForm">
      <input type="text" id="name" placeholder="Your Name" required>
      <input type="email" id="email" placeholder="Your Email" required>
      <button type="submit">Submit</button>
    </form>
  `;
  contentSection.style.display = 'block';
});

// Form submission handling
document.addEventListener('submit', (e) => {
  if (e.target.id === 'contactForm') {
    e.preventDefault();
    const name = document.getElementById('name').value;
    alert(`Thank you, ${name}! We'll be in touch soon.`);
    document.getElementById('dynamicContent').style.display = 'none';
  }
});

// Smooth scrolling for navigation links
document.querySelectorAll('nav ul li a').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const targetId = this.getAttribute('href');
    const targetSection = document.querySelector(targetId);
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// Hover effects for navigation
document.querySelectorAll('nav ul li').forEach(li => {
  li.addEventListener('mouseenter', () => {
    li.style.transform = 'scale(1.1)';
    li.style.transition = 'transform 0.3s ease';
  });
  li.addEventListener('mouseleave', () => {
    li.style.transform = 'scale(1)';
  });
});

// Dynamic content loader
window.addEventListener('load', () => {
  const contentSection = document.createElement('section');
  contentSection.id = 'dynamicContent';
  contentSection.style.display = 'none';
  contentSection.style.padding = '2rem';
  contentSection.style.textAlign = 'center';
  document.querySelector('main').appendChild(contentSection);
});
