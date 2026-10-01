// Common JavaScript functionality

// Set active navigation link based on current page
function setActiveNavLink() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links a, .mobile-nav-links a, .homepage-rail-nav a');
    const normalizePath = path => path
        .toLowerCase()
        .replace(/\/index\.html$/, '')
        .replace(/\.html$/, '')
        .replace(/\/$/, '') || '/';
    const normalizedCurrentPath = normalizePath(currentPath);
    const isHomepage = normalizedCurrentPath === '/' || normalizedCurrentPath === '/homepage-v2';
    const isWorkPage = isHomepage || document.body.classList.contains('project-page');

    navLinks.forEach(link => {
        const target = new URL(link.getAttribute('href'), window.location.href);
        const active = target.origin === window.location.origin && (
            link.classList.contains('work-link') ? isWorkPage :
            !isWorkPage && normalizedCurrentPath === normalizePath(target.pathname)
        );
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
    });
}

// Initialize navigation functionality
function initializeNavigation() {
    const topNav = document.getElementById('topNav');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');
    
    if (!topNav || !mobileMenuToggle || !mobileMenuOverlay) {
        console.warn('Navigation elements not found, retrying in 100ms...');
        setTimeout(initializeNavigation, 100);
        return;
    }
    
    if (topNav.dataset.navigationReady) return;
    topNav.dataset.navigationReady = 'true';
    let menuOpen = false;
    let savedOverflow;
    const menuQuery = window.matchMedia('(max-width: 962px)');
    const syncPanelTop = () => mobileMenuOverlay.style.setProperty('--mobile-nav-top', `${topNav.getBoundingClientRect().height}px`);
    new ResizeObserver(syncPanelTop).observe(topNav);

    // Exact exported endpoints; normalized curves are used only between them.
    const numberPattern = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
    const morphPaths = [...mobileMenuToggle.querySelectorAll('[data-morph-from]')].map(path => ({
        path,
        menu: path.getAttribute('d'),
        close: path.dataset.closePath,
        template: path.dataset.morphFrom,
        from: path.dataset.morphFrom.match(numberPattern).map(Number),
        to: path.dataset.morphTo.match(numberPattern).map(Number)
    }));
    const middlePath = mobileMenuToggle.querySelector('.menu-icon-middle');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let iconProgress = 0;
    let iconFrame;
    function renderIcon(progress) {
        iconProgress = progress;
        morphPaths.forEach(({ path, menu, close, template, from, to }) => {
            let index = 0;
            const d = progress === 0 ? menu : progress === 1 ? close : template.replace(numberPattern, () => {
                const i = index++;
                return (from[i] + (to[i] - from[i]) * progress).toFixed(4);
            });
            path.setAttribute('d', d);
        });
        if (middlePath) {
            middlePath.setAttribute('transform', `translate(20 20) scale(${1 - progress} 1) translate(-20 -20)`);
            middlePath.setAttribute('opacity', 1 - progress);
        }
    }
    function morphMenuIcon(open) {
        cancelAnimationFrame(iconFrame);
        const target = open ? 1 : 0;
        if (reducedMotion.matches) { renderIcon(target); return; }
        const start = iconProgress;
        const started = performance.now();
        const duration = 240 * Math.abs(target - start);
        if (!duration) return;
        const tick = now => {
            const elapsed = Math.min(1, (now - started) / duration);
            const eased = elapsed * elapsed * (3 - 2 * elapsed);
            renderIcon(start + (target - start) * eased);
            if (elapsed < 1) iconFrame = requestAnimationFrame(tick);
        };
        iconFrame = requestAnimationFrame(tick);
    }
    reducedMotion.addEventListener('change', () => {
        cancelAnimationFrame(iconFrame);
        renderIcon(menuOpen ? 1 : 0);
    });

    const hideOnScroll = document.body.classList.contains('project-page');
    let lastScrollTop = window.scrollY;
    let ticking = false;

    // Sticky navigation scroll effect
    function updateNavOnScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        if (menuOpen) { ticking = false; return; }
        
        topNav.classList.toggle('scrolled', scrollTop > 50);
        if (!hideOnScroll || scrollTop <= 100 || scrollTop < lastScrollTop) {
            topNav.style.transform = 'translateY(0)';
        } else if (scrollTop > lastScrollTop) {
            topNav.style.transform = 'translateY(-100%)';
        }

        if (document.body.classList.contains('project-v2')) {
            document.body.classList.toggle('project-top-nav-hidden', topNav.style.transform === 'translateY(-100%)');
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

    // Preserve the existing header geometry and background scroll state.
    function openMenu() {
        if (menuOpen || !menuQuery.matches) return;
        menuOpen = true;
        savedOverflow = [document.body.style.overflow, document.documentElement.style.overflow];
        syncPanelTop();
        mobileMenuToggle.classList.add('active');
        morphMenuIcon(true);
        mobileMenuToggle.setAttribute('aria-expanded', 'true');
        mobileMenuToggle.setAttribute('aria-label', 'Close menu');
        mobileMenuOverlay.inert = false;
        mobileMenuOverlay.setAttribute('aria-hidden', 'false');
        mobileMenuOverlay.classList.add('active');
        document.body.classList.add('mobile-menu-open');
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        mobileMenuOverlay.querySelector('a').focus({ preventScroll: true });
    }

    function closeMenu(restoreFocus = true) {
        if (!menuOpen) return;
        menuOpen = false;
        if (restoreFocus) mobileMenuToggle.focus({ preventScroll: true });
        mobileMenuToggle.classList.remove('active');
        morphMenuIcon(false);
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
        mobileMenuToggle.setAttribute('aria-label', 'Open menu');
        mobileMenuOverlay.classList.remove('active');
        mobileMenuOverlay.inert = true;
        mobileMenuOverlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('mobile-menu-open');
        [document.body.style.overflow, document.documentElement.style.overflow] = savedOverflow;
        lastScrollTop = window.scrollY;
    }

    mobileMenuToggle.addEventListener('click', () => menuOpen ? closeMenu() : openMenu());
    document.addEventListener('click', event => {
        if (!menuOpen) return;
        if (topNav.contains(event.target) || mobileMenuOverlay.contains(event.target)) {
            if (event.target.closest('a')) closeMenu();
            return;
        }
        // The first outside click dismisses the menu without activating content.
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
    }, true);
    document.addEventListener('keydown', event => {
        if (!menuOpen) return;
        if (event.key === 'Escape') { event.preventDefault(); closeMenu(); }
        if (event.key !== 'Tab') return;
        const items = [topNav.querySelector('.logo a'), mobileMenuToggle,
            ...mobileMenuOverlay.querySelectorAll('a')];
        const index = items.indexOf(document.activeElement);
        if (event.shiftKey && index <= 0) {
            event.preventDefault(); items[items.length - 1].focus();
        } else if (!event.shiftKey && (index === items.length - 1 || index < 0)) {
            event.preventDefault(); items[0].focus();
        }
    });
    menuQuery.addEventListener('change', () => {
        const focusWasInMenu = mobileMenuOverlay.contains(document.activeElement) || document.activeElement === mobileMenuToggle;
        closeMenu(false);
        if (focusWasInMenu && !menuQuery.matches) {
            const logo = document.querySelector('.homepage-rail-logo');
            (logo?.getClientRects().length ? logo : topNav.querySelector('.logo a')).focus({ preventScroll: true });
        }
        updateNavOnScroll();
    });

    // Initialize nav state on page load
    updateNavOnScroll();

    // Handle Work links through delegation so asynchronously loaded navs are
    // covered as well as links already present in the initial DOM.
    document.addEventListener('click', function (e) {
        const workLink = e.target.closest('.work-link');
        if (!workLink || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        // If this is not the homepage, let the /#work link navigate normally.
        const currentPath = window.location.pathname;
        if (!['/', '/index.html', '/homepage-v2', '/homepage-v2/', '/homepage-v2/index.html'].includes(currentPath)) return;
        if (!document.querySelector('#work')) return;

        e.preventDefault();
        const workSection = document.querySelector('#work');
        if (workSection) {
            if (window.homepageSmoother) {
                window.homepageSmoother.scrollTo(workSection, true, 'top top');
            } else {
                workSection.scrollIntoView({ behavior: 'instant', block: 'start' });
            }
            window.history.replaceState(null, '', '#work');
        }

        closeMenu();
    });
}

// Load favicon
function loadFavicon() {
        fetch('/components/favicon.html')
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
        if (target.closest('#left-nav-container, #top-nav-container')) return;

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

    // Load shared project-page navigation when a project provides a host.
    const projectNavigationContainer = document.getElementById('project-navigation-container');
    if (projectNavigationContainer) {
        const projectNavigationScript = document.createElement('script');
        projectNavigationScript.src = '/js/project-navigation.js';
        projectNavigationScript.onload = function () {
            fetch('/components/project-navigation.html')
                .then(response => {
                    if (!response.ok) throw new Error(`Project navigation failed: ${response.status}`);
                    return response.text();
                })
                .then(data => {
                    projectNavigationContainer.className = 'project-navigation';
                    projectNavigationContainer.innerHTML = data;
                    window.initializeProjectNavigation?.();
                })
                .catch(error => console.error('Error loading project navigation:', error));
        };
        document.head.appendChild(projectNavigationScript);
    }

    // Load the shared desktop left navigation when a page provides a host.
    const leftNavContainer = document.getElementById('left-nav-container');
    if (leftNavContainer) {
        fetch('/components/left-navigation.html')
            .then(response => response.text())
            .then(data => {
                leftNavContainer.innerHTML = data;
                setActiveNavLink();
            })
            .catch(error => {
                console.error('Error loading left navigation:', error);
            });
    }

    // Load top navigation
    fetch('/components/top-navigation.html?v=nav-icons-2')
        .then(response => response.text())
        .then(data => {
            const container = document.getElementById('top-nav-container');
            if (!container) return;
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
    fetch('/components/footer.html')
        .then(response => response.text())
        .then(data => {
            const footerContainer = document.getElementById('footer-container');
            if (!footerContainer) return;
            footerContainer.innerHTML = data;
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

            function ensureSublist(parentLi) {
                let ul = parentLi.querySelector(':scope > ul');
                if (!ul) {
                    ul = document.createElement('ul');
                    parentLi.appendChild(ul);
                }
                return ul;
            }

            headings.forEach(h => {
                const level = parseInt(h.tagName.substring(1), 10);
                const li = document.createElement('li');
                li.className = `toc-l${level}`;

                const link = createLink(h);
                link.className = `toc-link toc-link-l${level}`;
                li.appendChild(link);

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

            // Desktop: collapsed rail by default, expand on hover/focus
            function setupDesktopTocMode() {
                const isDesktop = window.matchMedia('(min-width: 963px)').matches;
                if (isDesktop) {
                    tocRoot.classList.add('is-collapsed');
                } else {
                    tocRoot.classList.remove('is-collapsed');
                }
            }

            function openDesktopToc() {
                if (!window.matchMedia('(min-width: 963px)').matches) return;
                tocRoot.classList.remove('is-collapsed');
            }

            function closeDesktopToc() {
                if (!window.matchMedia('(min-width: 963px)').matches) return;
                tocRoot.classList.add('is-collapsed');
            }

            tocRoot.addEventListener('mouseenter', openDesktopToc);
            tocRoot.addEventListener('mouseleave', closeDesktopToc);
            tocRoot.addEventListener('focusin', openDesktopToc);
            tocRoot.addEventListener('focusout', function(e) {
                if (!tocRoot.contains(e.relatedTarget)) {
                    closeDesktopToc();
                }
            });
            window.addEventListener('resize', setupDesktopTocMode);
            setupDesktopTocMode();

            // Keep H2 groups expanded by default
            tocRoot.querySelectorAll('li.collapsible').forEach(li => {
                const linkEl = li.querySelector(':scope > a');
                const childUl = li.querySelector(':scope > ul');
                if (!childUl) return;
                li.classList.add('expanded');
                linkEl.setAttribute('aria-expanded', 'true');
            });

            // Active section highlighting via IntersectionObserver
            const linkMap = new Map();
            headings.forEach(h => {
                const a = tocRoot.querySelector(`a[href="#${CSS.escape(h.id)}"]`);
                if (a) linkMap.set(h, a);
            });

            let activeLink = null;
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

                    // Auto-open parent groups when active child appears
                    const parentCollapsible = link.closest('li.collapsible');
                    if (parentCollapsible) parentCollapsible.classList.add('expanded');
                });
            }, { rootMargin: '-30% 0px -60% 0px', threshold: 0.01 });

            headings.forEach(h => io.observe(h));
        });
    } catch (err) {
        console.error('TOC init failed:', err);
    }
}

// Resolve incoming Work anchors after the loader and the homepage pin layout settle.
function restoreWorkAnchor() {
    if (location.hash !== '#work' || !document.body.classList.contains('homepage-v2')) return;
    document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
        window.ScrollTrigger?.refresh();
        document.getElementById('work')?.scrollIntoView({behavior: 'instant', block: 'start'});
    })));
}
window.addEventListener('site-loading-finished', restoreWorkAnchor);
window.addEventListener('hashchange', restoreWorkAnchor);
