// Shared project-page navigation and recommendation data.
(function () {
    const projects = [
        {
            key: 'decathlon',
            name: 'Decathlon',
            subtitle: 'Customized component library',
            href: '/Business-module-system.html',
            image: '/images/odd1.jpg',
            external: false
        },
        {
            key: 'alibaba',
            name: 'Alibaba',
            subtitle: 'Online Check-in',
            href: '/Alibaba-travel.html',
            image: '/images/CoverFliggy.png',
            external: false
        },
        {
            key: 'zFuse',
            name: 'zFuse',
            subtitle: 'Video Player app redesign',
            href: 'https://www.behance.net/gallery/148712487/zFuse-Mobile-App-UXUI-Redesign',
            image: '/images/CoverzFuse.png',
            external: true
        },
        {
            key: 'ai-website',
            name: 'Case study',
            subtitle: 'Crafting my portfolio journey',
            href: '/Creating-my-website-with-AI.html',
            image: '/images/CoverWeb.png',
            external: false
        }
    ];

    function goBack(event) {
        event.preventDefault();
        const referrer = document.referrer;
        const sameOriginReferrer = referrer && new URL(referrer, window.location.href).origin === window.location.origin;

        if (window.history.length > 1 && sameOriginReferrer) {
            window.history.back();
            return;
        }

        window.location.assign('/#work');
    }

    function createProjectCard(project) {
        const card = document.createElement('a');
        card.className = 'more-project-card';
        card.href = project.href;
        card.setAttribute('aria-label', `View ${project.name}: ${project.subtitle}`);

        if (project.external) {
            card.target = '_blank';
            card.rel = 'noopener noreferrer';
        }

        const copy = document.createElement('span');
        copy.className = 'more-project-card-copy';

        const name = document.createElement('span');
        name.className = 'more-project-card-name';
        name.textContent = project.name;

        const subtitle = document.createElement('span');
        subtitle.className = 'more-project-card-subtitle';
        subtitle.textContent = project.subtitle;

        const arrow = document.createElement('span');
        arrow.className = 'more-project-card-arrow';
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = '→';

        copy.append(name, subtitle);
        card.append(copy, arrow);
        return card;
    }

    function initializeProjectNavigation() {
        const host = document.getElementById('project-navigation-container');
        if (!host) return;

        const currentKey = document.body.dataset.project;
        const currentProject = projects.find(project => project.key === currentKey);
        const recommendations = projects.filter(project => project.key !== currentKey).slice(0, 2);
        const list = host.querySelector('[data-project-list]');
        const back = host.querySelector('.project-back');

        if (currentProject) {
            host.setAttribute('data-current-project', currentProject.key);
        }

        if (back) back.addEventListener('click', goBack);
        if (list) recommendations.forEach(project => list.appendChild(createProjectCard(project)));
        if (!recommendations.length) host.querySelector('.more-projects')?.remove();
    }

    window.initializeProjectNavigation = initializeProjectNavigation;
})();
