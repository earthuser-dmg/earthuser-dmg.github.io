// Common JavaScript functionality

// Set active navigation link based on current page
function setActiveNavLink() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links a, .mobile-nav-links a');

    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        const linkPathWithoutHash = linkPath.split('#')[0]; // 移除hash部分

        // 移除 active 类
        link.classList.remove('active');

        // 检查是否是首页
        if (currentPath.endsWith('/') || currentPath.endsWith('index.html')) {
            if (linkPathWithoutHash === 'index.html' || linkPath.startsWith('index.html#')) {
                link.classList.add('active');
            }
        }
        // 检查其他页面
        else if (currentPath.endsWith(linkPathWithoutHash)) {
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
        document.body.classList.add('mobile-menu-open');
        document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
        mobileMenuToggle.classList.remove('active');
        mobileMenuOverlay.classList.remove('active');
        document.body.classList.remove('mobile-menu-open');
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

    // 处理Work链接点击事件
    function handleWorkLinkClick() {
        const workLinks = document.querySelectorAll('.work-link');
        workLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                // 如果当前不在index.html页面，让链接正常跳转
                const currentPath = window.location.pathname;
                if (!currentPath.endsWith('/') && !currentPath.endsWith('index.html')) {
                    return; // 让默认行为发生（跳转到index.html#content-area）
                }

                // 如果已经在index.html页面，阻止默认行为并平滑滚动
                e.preventDefault();
                const contentArea = document.querySelector('.content-area');
                if (contentArea) {
                    contentArea.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }

                // 关闭移动端菜单
                closeMenu();
            });
        });
    }

    // 延迟执行以确保DOM完全加载
    setTimeout(handleWorkLinkClick, 100);
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

// Initialize image click-to-enlarge overlay (configurable)
function initImagePreview(options) {
    const config = Object.assign({ selector: 'img', container: document, closeOnEsc: true }, options || {});

    let overlay = document.getElementById('img-overlay');
    let overlayImage;

    function ensureOverlay() {
        if (overlay) return;
        overlay = document.createElement('div');
        overlay.id = 'img-overlay';
        overlay.style.cssText = 'display:none;position:fixed;z-index:9999;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);justify-content:center;align-items:center;cursor:pointer;';
        overlayImage = document.createElement('img');
        overlayImage.style.cssText = 'max-width:90vw;max-height:90vh;box-shadow:0 0 16px #000;border-radius:8px;';
        overlay.appendChild(overlayImage);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) {
                closeOverlay();
            }
        });

        if (config.closeOnEsc) {
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && overlay.style.display === 'flex') {
                    closeOverlay();
                }
            });
        }
    }

    function openOverlay(src) {
        ensureOverlay();
        overlayImage.src = src;
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeOverlay() {
        if (!overlay) return;
        overlay.style.display = 'none';
        if (overlayImage) overlayImage.src = '';
        document.body.style.overflow = '';
    }

    config.container.addEventListener('click', function (e) {
        const target = e.target;
        if (!(target && target.tagName === 'IMG')) return;
        if (overlay && overlay.contains(target)) return; // ignore clicks on enlarged image

        // Match selector scope
        if (config.selector) {
            try {
                const matched = target.matches(config.selector) || target.closest(config.selector);
                if (!matched) return;
            } catch (err) {
                // If selector invalid, fail safe: do nothing
                return;
            }
        }

        openOverlay(target.src);
    });

    // Expose close for potential external usage
    return { close: closeOverlay };
}

// expose to window for page usage
window.initImagePreview = initImagePreview;

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

    // Initialize Table of Contents after DOM is ready
    initTableOfContents();
}); 

// ------------------------------
// Table of Contents (TOC)
// ------------------------------
function initTableOfContents() {
    try {
        // Delay to ensure page content is present
        requestAnimationFrame(() => {
            // Only enable TOC on specified pages
            const allowedPages = [
                'Business-module-system.html',
                'Alibaba-travel.html',
                'Creating-my-website-with-AI.html'
            ];
            const currentPageName = (window.location.pathname.split('/').pop() || '').toLowerCase();
            const isAllowedPage = allowedPages.some(p => p.toLowerCase() === currentPageName);
            if (!isAllowedPage) return;

            const contentRoot = document.querySelector('.page-wrapper') || document.body;
            if (!contentRoot) return;

            const headings = Array.from(contentRoot.querySelectorAll('h1, h2, h3'))
                .filter(h => h.innerText && h.innerText.trim().length > 0);
            if (!headings.length) return;

            // Ensure IDs and compute structure
            const slugCounts = Object.create(null);
            function slugify(text) {
                const base = text.toLowerCase().trim().replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '').replace(/\s+/g, '-');
                const count = (slugCounts[base] = (slugCounts[base] || 0) + 1);
                return count > 1 ? `${base}-${count}` : base;
            }

            headings.forEach(h => {
                if (!h.id) h.id = slugify(h.innerText);
                // Improve scroll alignment under fixed nav
                h.style.scrollMarginTop = '90px';
            });

            // Build nested structure
            const tocRoot = document.createElement('aside');
            tocRoot.className = 'toc';
            tocRoot.setAttribute('role', 'navigation');
            tocRoot.setAttribute('aria-label', '页面目录');


            const list = document.createElement('ul');
            list.className = 'toc-list';
            tocRoot.appendChild(list);

            // Rail container for compact mode
            const rail = document.createElement('div');
            rail.className = 'toc-rail';
            tocRoot.appendChild(rail);

            let currentH1Li = null;
            let currentH2Li = null;

            function createLink(h) {
                const a = document.createElement('a');
                a.href = `#${h.id}`;
                a.textContent = h.innerText;
                a.setAttribute('tabindex', '0');
                a.addEventListener('click', function (e) {
                    e.preventDefault();
                    document.getElementById(h.id).scrollIntoView({ behavior: 'smooth', block: 'start' });
                    history.replaceState(null, '', `#${h.id}`);
                });
                return a;
            }

            function createRailLine(h) {
                const level = parseInt(h.tagName.substring(1), 10);
                const line = document.createElement('div');
                line.className = `rail-line level-${level}`;
                line.setAttribute('role', 'button');
                line.setAttribute('aria-label', `跳转到 ${h.innerText}`);
                line.addEventListener('click', function (e) {
                    e.preventDefault();
                    document.getElementById(h.id).scrollIntoView({ behavior: 'smooth', block: 'start' });
                    history.replaceState(null, '', `#${h.id}`);
                });
                return line;
            }

            function ensureSublist(parentLi) {
                let ul = parentLi.querySelector(':scope > ul');
                if (!ul) {
                    ul = document.createElement('ul');
                    parentLi.appendChild(ul);
                }
                return ul;
            }

            const railMap = new Map();
            headings.forEach(h => {
                const level = parseInt(h.tagName.substring(1), 10);
                const li = document.createElement('li');
                li.className = `toc-l${level}`;

                const link = createLink(h);
                link.className = `toc-link toc-link-l${level}`;
                li.appendChild(link);

                // Create rail line per heading
                const railLine = createRailLine(h);
                rail.appendChild(railLine);
                railMap.set(h, railLine);

                if (level === 1) {
                    list.appendChild(li);
                    currentH1Li = li;
                    currentH2Li = null;
                } else if (level === 2) {
                    const parent = currentH1Li || list;
                    const parentUl = parent === list ? list : ensureSublist(parent);
                    parentUl.appendChild(li);
                    // Collapsible group for H2 (controls its H3 children)
                    li.classList.add('collapsible');
                    currentH2Li = li;
                } else if (level === 3) {
                    const parent = currentH2Li || currentH1Li || list;
                    const parentUl = parent === list ? list : ensureSublist(parent);
                    parentUl.appendChild(li);
                }
            });

            // Insert TOC into page
            const host = document.querySelector('.page-wrapper') || document.body;
            host.appendChild(tocRoot);

            // Toggle button for tablet
            const tocToggle = document.createElement('button');
            tocToggle.className = 'toc-toggle';
            tocToggle.type = 'button';
            tocToggle.setAttribute('aria-label', '切换目录可见性');
            tocToggle.textContent = '目录';
            host.appendChild(tocToggle);

            function openToc() {
                tocRoot.classList.add('open');
                tocToggle.setAttribute('aria-expanded', 'true');
            }
            function closeToc() {
                tocRoot.classList.remove('open');
                tocToggle.setAttribute('aria-expanded', 'false');
            }
            tocToggle.addEventListener('click', function() {
                if (tocRoot.classList.contains('open')) closeToc(); else openToc();
            });

            // Default compact rail mode; users can hover (desktop) or click button (tablet) to expand
            tocRoot.classList.add('rail');

            // Collapsible behavior for H2 groups (expand/collapse their UL)
            tocRoot.querySelectorAll('li.collapsible').forEach(li => {
                const linkEl = li.querySelector(':scope > a');
                const childUl = li.querySelector(':scope > ul');
                if (!childUl) return;
                // Default expanded
                li.classList.add('expanded');
                linkEl.setAttribute('aria-expanded', 'true');
                linkEl.setAttribute('aria-label', `${linkEl.textContent} 小节展开/收起`);
                linkEl.addEventListener('dblclick', function(e) {
                    // Allow double-click to toggle without jumping
                    e.preventDefault();
                    const isExpanded = li.classList.toggle('expanded');
                    linkEl.setAttribute('aria-expanded', String(isExpanded));
                });
            });

            // Active section highlighting via IntersectionObserver
            const linkMap = new Map();
            headings.forEach(h => {
                const a = tocRoot.querySelector(`a[href="#${CSS.escape(h.id)}"]`);
                if (a) linkMap.set(h, a);
            });

            let activeLink = null;
            let activeRail = null;
            const io = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    const h = entry.target;
                    const link = linkMap.get(h);
                    if (!link) return;
                    if (activeLink) {
                        activeLink.classList.remove('active');
                        activeLink.removeAttribute('aria-current');
                    }
                    link.classList.add('active');
                    link.setAttribute('aria-current', 'true');
                    activeLink = link;

                    const railLine = railMap.get(h);
                    if (activeRail) activeRail.classList.remove('active');
                    if (railLine) {
                        railLine.classList.add('active');
                        activeRail = railLine;
                    }

                    // Auto-open parent groups when active child appears
                    const parentCollapsible = link.closest('li.collapsible');
                    if (parentCollapsible) parentCollapsible.classList.add('expanded');
                });
            }, { rootMargin: '-30% 0px -60% 0px', threshold: 0.01 });

            headings.forEach(h => io.observe(h));

            // Hide TOC when scrolling through head-image area
            const headImage = contentRoot.querySelector('.head-image');
            if (headImage) {
                const headImageHeight = headImage.offsetHeight;
                const navHeight = 90; // sticky nav height
                const totalHeroHeight = headImageHeight + navHeight;

                function updateTocVisibility() {
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    if (scrollTop < totalHeroHeight) {
                        tocRoot.classList.add('hidden-in-hero');
                    } else {
                        tocRoot.classList.remove('hidden-in-hero');
                    }
                }

                window.addEventListener('scroll', updateTocVisibility);
                updateTocVisibility(); // initial check
            }
        });
    } catch (err) {
        console.error('TOC init failed:', err);
    }
}