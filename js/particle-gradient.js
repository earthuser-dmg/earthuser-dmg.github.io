(function () {
    'use strict';

    const canvas = document.querySelector('[data-particle-gradient]');
    const hero = canvas && canvas.closest('.hero');
    if (!canvas || !hero) return;

    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return;

    const palette = [
        { color: [0, 194, 222], x: 0.16, y: 0.30, radius: 0.42, strength: 1.00 },
        { color: [27, 196, 125], x: 0.40, y: 0.68, radius: 0.37, strength: 0.92 },
        { color: [255, 199, 0], x: 0.67, y: 0.27, radius: 0.27, strength: 0.72 },
        { color: [24, 160, 251], x: 0.84, y: 0.58, radius: 0.40, strength: 1.00 }
    ];

    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const precisePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, active: false };

    let width = 0;
    let height = 0;
    let particles = [];
    let resizeFrame = 0;
    let animationFrame = 0;
    let visible = true;

    function seededNoise(seed) {
        const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
        return value - Math.floor(value);
    }

    function colorAt(x, y) {
        let red = 0;
        let green = 0;
        let blue = 0;
        let total = 0;

        palette.forEach((anchor) => {
            const dx = x - anchor.x;
            const dy = y - anchor.y;
            const distanceSquared = dx * dx + dy * dy;
            const falloff = Math.exp(-distanceSquared / (anchor.radius * anchor.radius)) * anchor.strength;
            red += anchor.color[0] * falloff;
            green += anchor.color[1] * falloff;
            blue += anchor.color[2] * falloff;
            total += falloff;
        });

        const safeTotal = Math.max(total, 0.0001);
        const opacity = Math.min(0.54, Math.max(0.08, total * 0.25));
        return {
            fill: `rgba(${Math.round(red / safeTotal)}, ${Math.round(green / safeTotal)}, ${Math.round(blue / safeTotal)}, ${opacity})`,
            intensity: Math.min(1, total)
        };
    }

    function buildParticles() {
        const isCompact = width < 760;
        const spacing = isCompact ? 21 : 17;
        const columns = Math.ceil(width / spacing) + 2;
        const rows = Math.ceil(height / spacing) + 2;
        const nextParticles = [];

        for (let row = -1; row < rows; row += 1) {
            for (let column = -1; column < columns; column += 1) {
                const seed = row * columns + column + 1;
                const jitterX = (seededNoise(seed) - 0.5) * spacing * 0.82;
                const jitterY = (seededNoise(seed + 91) - 0.5) * spacing * 0.82;
                const homeX = column * spacing + jitterX;
                const homeY = row * spacing + jitterY;
                const color = colorAt(homeX / width, homeY / height);

                nextParticles.push({
                    homeX,
                    homeY,
                    x: homeX,
                    y: homeY,
                    velocityX: 0,
                    velocityY: 0,
                    radius: spacing * (0.42 + seededNoise(seed + 41) * 0.28),
                    phase: seededNoise(seed + 173) * Math.PI * 2,
                    fill: color.fill,
                    intensity: color.intensity
                });
            }
        }

        particles = nextParticles;
    }

    function resize() {
        const bounds = canvas.getBoundingClientRect();
        width = Math.max(1, bounds.width);
        height = Math.max(1, bounds.height);
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

        canvas.width = Math.round(width * pixelRatio);
        canvas.height = Math.round(height * pixelRatio);
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        buildParticles();
        draw(0, true);
    }

    function requestResize() {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(resize);
    }

    function draw(time, staticFrame) {
        context.clearRect(0, 0, width, height);
        const pointerRadius = Math.min(185, Math.max(138, width * 0.14));
        const idleTime = time * 0.00035;
        const animate = !staticFrame && !reduceMotionQuery.matches;

        if (pointer.active) {
            pointer.x += (pointer.targetX - pointer.x) * 0.24;
            pointer.y += (pointer.targetY - pointer.y) * 0.24;
        }

        particles.forEach((particle) => {
            let targetX = particle.homeX;
            let targetY = particle.homeY;

            if (animate) {
                const drift = 1.3 + particle.intensity * 1.7;
                targetX += Math.cos(idleTime + particle.phase) * drift;
                targetY += Math.sin(idleTime * 0.82 + particle.phase) * drift;
            }

            if (animate && pointer.active) {
                const differenceX = particle.x - pointer.x;
                const differenceY = particle.y - pointer.y;
                const distance = Math.hypot(differenceX, differenceY) || 0.001;

                if (distance < pointerRadius) {
                    const falloff = 1 - distance / pointerRadius;
                    const displacement = falloff * falloff * 54;
                    targetX += (differenceX / distance) * displacement;
                    targetY += (differenceY / distance) * displacement;
                }
            }

            if (animate) {
                particle.velocityX += (targetX - particle.x) * 0.052;
                particle.velocityY += (targetY - particle.y) * 0.052;
                particle.velocityX *= 0.82;
                particle.velocityY *= 0.82;
                particle.x += particle.velocityX;
                particle.y += particle.velocityY;
            } else {
                particle.x = targetX;
                particle.y = targetY;
            }

            context.beginPath();
            context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            context.fillStyle = particle.fill;
            context.fill();
        });
    }

    function animate(time) {
        if (visible && !reduceMotionQuery.matches) draw(time, false);
        animationFrame = requestAnimationFrame(animate);
    }

    function updatePointer(event) {
        if (!precisePointerQuery.matches || reduceMotionQuery.matches) {
            pointer.active = false;
            return;
        }

        const bounds = canvas.getBoundingClientRect();
        const inside = event.clientX >= bounds.left && event.clientX <= bounds.right &&
            event.clientY >= bounds.top && event.clientY <= bounds.bottom;

        pointer.active = inside;
        if (!inside) return;

        pointer.targetX = event.clientX - bounds.left;
        pointer.targetY = event.clientY - bounds.top;

        if (!Number.isFinite(pointer.x) || (pointer.x === 0 && pointer.y === 0)) {
            pointer.x = pointer.targetX;
            pointer.y = pointer.targetY;
        }
    }

    function handleMotionPreference() {
        pointer.active = false;
        if (reduceMotionQuery.matches) draw(0, true);
    }

    window.addEventListener('pointermove', updatePointer, { passive: true });
    window.addEventListener('pointerout', (event) => {
        if (!event.relatedTarget) pointer.active = false;
    });
    window.addEventListener('resize', requestResize, { passive: true });
    reduceMotionQuery.addEventListener?.('change', handleMotionPreference);

    if ('ResizeObserver' in window) {
        new ResizeObserver(requestResize).observe(hero);
    }

    if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
            visible = entries[0]?.isIntersecting !== false;
        }, { rootMargin: '120px' }).observe(hero);
    }

    resize();
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(animate);
}());
