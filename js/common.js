// Common JavaScript functionality

// Set active navigation link based on current page
function setActiveNavLink() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links a, .mobile-nav-links a');
    
    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        // 移除 active 类
        link.classList.remove('active');
        
        // 检查是否是首页
        if (currentPath.endsWith('/') || currentPath.endsWith('index.html')) {
            if (linkPath === 'index.html') {
                link.classList.add('active');
            }
        }
        // 检查其他页面
        else if (currentPath.endsWith(linkPath)) {
            link.classList.add('active');
        }
    });
}

// Initialize navigation functionality
function initializeNavigation() {
    const topNav = document.getElementById('topNav');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');
    const mobileMenuClose = document.querySelector('.mobile-menu-close');
    
    if (!topNav || !mobileMenuToggle || !mobileMenuOverlay || !mobileMenuClose) {
        console.warn('Navigation elements not found, retrying in 100ms...');
        setTimeout(initializeNavigation, 100);
        return;
    }
    
    let lastScrollTop = 0;
    let ticking = false;

    // Sticky navigation scroll effect
    function updateNavOnScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercentage = (scrollTop / scrollHeight) * 100;
        
        if (scrollTop > 50) {
            topNav.classList.add('scrolled');
        } else {
            topNav.classList.remove('scrolled');
        }
        
        if (window.innerWidth <= 768) {
            if (scrollTop > lastScrollTop && scrollTop > 100) {
                topNav.style.transform = 'translateY(-100%)';
            } else {
                topNav.style.transform = 'translateY(0)';
            }
        }
        
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
        ticking = false;
    }

    // Throttle scroll events
    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateNavOnScroll);
            ticking = true;
        }
    }

    window.addEventListener('scroll', requestTick);

    // Mobile menu functionality
    function openMenu() {
        mobileMenuToggle.classList.add('active');
        mobileMenuOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function closeMenu() {
        mobileMenuToggle.classList.remove('active');
        mobileMenuOverlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
    
    mobileMenuToggle.addEventListener('click', function() {
        if (mobileMenuOverlay.classList.contains('active')) {
            closeMenu();
        } else {
            openMenu();
        }
    });
    
    mobileMenuClose.addEventListener('click', closeMenu);
    
    mobileMenuOverlay.addEventListener('click', function(e) {
        if (e.target === this) {
            closeMenu();
        }
    });
    
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-links a');
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // Initialize nav state on page load
    updateNavOnScroll();
}

// Load favicon
function loadFavicon() {
    fetch('components/favicon.html')
        .then(response => response.text())
        .then(data => {
            const head = document.head;
            // Remove any existing favicon links
            const existingFavicons = head.querySelectorAll('link[rel*="icon"]');
            existingFavicons.forEach(link => link.remove());
            // Add new favicon links
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = data;
            while (tempDiv.firstChild) {
                head.appendChild(tempDiv.firstChild);
            }
        })
        .catch(error => {
            console.error('Error loading favicon:', error);
        });
}

// Load common modules
document.addEventListener('DOMContentLoaded', function() {
    // Load favicon
    loadFavicon();

    // Load top navigation
    fetch('components/top-navigation.html')
        .then(response => response.text())
        .then(data => {
            const container = document.getElementById('top-nav-container');
            container.innerHTML = data;
            // Wait for the next frame to ensure DOM is updated
            requestAnimationFrame(() => {
                initializeNavigation();
                setActiveNavLink();
            });
        })
        .catch(error => {
            console.error('Error loading navigation:', error);
        });

    // Load footer
    fetch('components/footer.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('footer-container').innerHTML = data;
        })
        .catch(error => {
            console.error('Error loading footer:', error);
        });
}); 