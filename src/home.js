// ── Daniel's Diaries - Marketing Landing Page ──

// Navbar scroll effect
const nav = document.getElementById('mainNav')
window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20)
})

// Mobile menu toggle
const hamburger = document.getElementById('navHamburger')
const mobileMenu = document.getElementById('mobileMenu')

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open')
    mobileMenu.classList.toggle('open')
})

// Close mobile menu on link click
mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('open')
        mobileMenu.classList.remove('open')
    })
})

// Close mobile menu on outside click
document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
        hamburger.classList.remove('open')
        mobileMenu.classList.remove('open')
    }
})

// Scroll-triggered fade-in animations
const fadeElements = document.querySelectorAll('.fade-in')

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
        }
    })
}, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
})

fadeElements.forEach(el => observer.observe(el))

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
        e.preventDefault()
        const target = document.querySelector(anchor.getAttribute('href'))
        if (target) {
            const navHeight = nav.offsetHeight
            const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight - 20
            window.scrollTo({ top: targetPosition, behavior: 'smooth' })
        }
    })
})
