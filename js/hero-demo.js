(function () {
    'use strict';

    const NAMESPACE = 'JunoTetrisDemo';
    const MIN_WIDTH = 963;
    const LIKE_KEY = 'junoxi:homepage-liked:v1';
    const COLORS = ['#CEE4F8', '#FDDFD2', '#FAD0E8', '#CDE7E0', '#E1D4F8', '#FAEED4'];
    const SHAPES = {
        I: [[0, 0], [1, 0], [2, 0], [3, 0]],
        IVertical: [[0, 0], [0, 1], [0, 2], [0, 3]],
        O: [[0, 0], [1, 0], [0, 1], [1, 1]],
        T: [[0, 0], [1, 0], [2, 0], [1, 1]],
        L: [[0, 0], [0, 1], [0, 2], [1, 2]],
        J: [[1, 0], [1, 1], [1, 2], [0, 2]],
        S: [[1, 0], [2, 0], [0, 1], [1, 1]],
        Z: [[0, 0], [1, 0], [1, 1], [2, 1]]
    };

    const state = {
        smoother: null,
        triggers: [],
        galleryTween: null,
        modalTween: null,
        tetris: null,
        resizeTimer: 0,
        waitingForDesktop: false,
        destroyed: false
    };

    class TetrisScene {
        constructor(canvas) {
            this.canvas = canvas;
            this.context = canvas.getContext('2d', { alpha: true });
            this.pitch = 13.2;
            this.cell = 12.15;
            this.radius = 1.75;
            this.originX = 8;
            this.originY = 0;
            this.rows = 0;
            this.columns = 0;
            this.occupancy = [];
            this.reservations = [];
            this.ceilingPieces = [];
            this.pieces = [];
            this.tweens = [];
            this.floaters = [];
            this.floaterTweens = [];
            this.spawnCall = null;
            this.spawnCount = 0;
            this.maxPieces = 0;
            this.randomSeed = 20260829;
            this.frame = 0;
            this.paused = false;
            this.active = false;
            this.hoveredPiece = null;
            this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            this.onPointerMove = event => this.handlePointerMove(event);
            this.onPointerLeave = () => this.setHoveredPiece(null);
            this.canvas.addEventListener('pointermove', this.onPointerMove);
            this.canvas.addEventListener('pointerleave', this.onPointerLeave);
            this.resize();
        }

        resize() {
            this.killTweens();
            const rect = this.canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            this.canvas.width = Math.round(rect.width * dpr);
            this.canvas.height = Math.round(rect.height * dpr);
            this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
            this.width = rect.width;
            this.height = rect.height;
            this.columns = Math.max(12, Math.floor((rect.width - this.originX * 2) / this.pitch));
            this.rows = Math.max(24, Math.floor(rect.height / this.pitch));
            this.buildScene();
        }

        buildScene() {
            this.occupancy = Array.from({ length: this.rows }, () => Array(this.columns).fill(null));
            this.ceilingPieces = [];
            this.pieces = [];
            this.hoveredPiece = null;
            this.canvas.style.cursor = 'default';
            this.spawnCount = 0;
            this.randomSeed = 20260829;
            this.seedCeiling();
            this.maxPieces = this.ceilingPieces.length;
            this.seedFloor();
            this.seedFloaters();
            this.reservations = this.cloneGrid(this.occupancy);

            if (this.reducedMotion) {
                for (let index = 0; index < 28; index += 1) this.spawnPiece(1);
            } else {
                const warmStarts = [0.48, 0.4, 0.32, 0.25, 0.18, 0.11, 0.06];
                warmStarts.forEach(progress => this.spawnPiece(progress));
                this.startFloaters();
                this.scheduleNextPiece(0.45);
            }

            this.requestDraw();
        }

        random() {
            this.randomSeed = (this.randomSeed * 1664525 + 1013904223) >>> 0;
            return this.randomSeed / 4294967296;
        }

        scheduleNextPiece(delay) {
            if (this.spawnCount >= this.maxPieces || this.reducedMotion) return;
            this.spawnCall = gsap.delayedCall(delay, () => {
                this.spawnPiece(0);
                this.scheduleNextPiece(0.65 + this.random() * 0.75);
            });
        }

        spawnPiece(warmProgress) {
            if (this.spawnCount >= this.maxPieces) return;
            const source = this.takeCeilingPiece();
            if (!source) return;
            const { shape, column, row: sourceRow, color } = source;
            const landingRow = this.findLandingRow(shape, column, this.reservations);
            if (landingRow <= sourceRow + 1) {
                source.available = true;
                return;
            }

            const progress = Math.max(0, Math.min(0.55, warmProgress || 0));
            const piece = {
                shape,
                column,
                row: sourceRow + (landingRow - sourceRow) * progress,
                landingRow,
                color,
                phase: this.random() * Math.PI * 2,
                drift: 0.12 + this.random() * 0.16,
                settled: false,
                hovered: false,
                tween: null
            };

            this.place(shape, column, landingRow, color, this.reservations);
            this.pieces.push(piece);
            this.spawnCount += 1;

            if (this.reducedMotion) {
                piece.row = landingRow;
                piece.settled = true;
                this.place(shape, column, landingRow, color, this.occupancy);
                return;
            }

            const remainingDistance = Math.max(1, landingRow - piece.row) * this.pitch;
            const fallSpeed = 34 + this.random() * 22;
            const fullDuration = Math.max(3.4, remainingDistance / fallSpeed);
            const stepCount = Math.max(8, Math.round(landingRow - piece.row));
            piece.tween = gsap.to(piece, {
                row: landingRow,
                duration: fullDuration,
                ease: `steps(${stepCount})`,
                onUpdate: () => this.requestDraw(),
                onComplete: () => {
                    piece.row = landingRow;
                    piece.settled = true;
                    this.place(shape, column, landingRow, color, this.occupancy);
                    this.requestDraw();
                }
            });
            this.tweens.push(piece.tween);
        }

        takeCeilingPiece() {
            const activeRanges = this.pieces
                .filter(piece => !piece.settled)
                .map(piece => this.getHorizontalRange(piece.shape, piece.column));
            const candidates = this.ceilingPieces.filter(source => {
                if (!source.available) return false;
                const range = this.getHorizontalRange(source.shape, source.column);
                return activeRanges.every(active => range.start > active.end + 1 || range.end < active.start - 1);
            });
            if (!candidates.length) return null;
            const source = candidates[Math.floor(this.random() * candidates.length)];
            source.available = false;
            return source;
        }

        getHorizontalRange(shape, column) {
            const offsets = shape.map(cell => cell[0]);
            return {
                start: column + Math.min(...offsets),
                end: column + Math.max(...offsets)
            };
        }

        cloneGrid(grid) {
            return grid.map(row => row.slice());
        }

        hash(column, row) {
            const value = Math.sin(column * 12.9898 + row * 78.233) * 43758.5453;
            return value - Math.floor(value);
        }

        seedCeiling() {
            const used = Array.from({ length: 9 }, () => Array(this.columns).fill(false));
            const addSource = (shapeName, column, row) => {
                const shape = SHAPES[shapeName];
                const cells = shape.map(([x, y]) => [column + x, row + y]);
                if (cells.some(([x, y]) => x < 0 || x >= this.columns || y < 0 || y >= used.length || used[y][x])) return false;
                cells.forEach(([x, y]) => { used[y][x] = true; });
                this.ceilingPieces.push({
                    shape,
                    column,
                    row,
                    color: COLORS[(this.ceilingPieces.length * 5 + row) % COLORS.length],
                    available: true
                });
                return true;
            };

            const segments = [
                [0, 0.08, 5],
                [0.1, 0.22, 4],
                [0.27, 0.5, 3],
                [0.61, 0.8, 4],
                [0.83, 0.94, 5],
                [0.95, 1, 6]
            ];

            segments.forEach(([startRatio, endRatio, depth], segmentIndex) => {
                const start = Math.floor(this.columns * startRatio);
                const end = Math.min(this.columns, Math.ceil(this.columns * endRatio));
                for (let row = 0; row < depth; row += 1) {
                    const inset = row > 1 ? (row + segmentIndex) % 3 : 0;
                    for (let column = start + inset; column + 3 < end; column += 4) {
                        addSource('I', column, row);
                    }
                }
            });

            const drips = [
                [0.03, 'IVertical', 4], [0.07, 'J', 4], [0.16, 'T', 4],
                [0.29, 'L', 3], [0.4, 'T', 3], [0.48, 'IVertical', 3],
                [0.63, 'J', 4], [0.68, 'T', 3], [0.87, 'IVertical', 4],
                [0.92, 'O', 5], [0.97, 'L', 5]
            ];
            drips.forEach(([ratio, shapeName, row]) => {
                addSource(shapeName, Math.min(this.columns - 4, Math.floor(this.columns * ratio)), row);
            });
        }

        seedFloor() {
            const clusters = [0, 0.14, 0.23, 0.33, 0.45, 0.56, 0.65, 0.72, 0.79, 0.9, 0.97].map((ratio, index) => [
                Math.floor(this.columns * ratio),
                index === 0 || index === 10 ? 4 : 2 + (index % 4),
                index === 0 || index === 10 ? 7 : 1 + (index % 2)
            ]);
            clusters.forEach(([start, width, height], clusterIndex) => {
                for (let column = start; column < Math.min(start + width, this.columns); column += 1) {
                    const columnHeight = Math.max(1, height + Math.floor(this.hash(column, clusterIndex) * 3) - 1);
                    for (let offset = 0; offset < columnHeight; offset += 1) {
                        const row = this.rows - 1 - offset;
                        this.occupancy[row][column] = COLORS[(column + offset + clusterIndex) % COLORS.length];
                    }
                }
            });
        }

        seedFloaters() {
            const scale = Math.max(0.78, Math.min(1, this.width / 1440));
            const figmaFloaters = [
                [1029.95 / 1440, 150.72 / 822, 5.06],
                [513.07 / 1440, 182.15 / 822, 5.09],
                [53.17 / 1440, 237.58 / 822, 5.66],
                [1396.66 / 1440, 519.86 / 822, 8.49],
                [357.69 / 1440, 617.35 / 822, 5.66],
                [1119.48 / 1440, 672.59 / 822, 5.09],
                [136.89 / 1440, 667.50 / 822, 8.49]
            ];
            this.floaters = figmaFloaters.map(([x, y, radius], index) => ({
                x: this.width * x,
                y: this.height * y,
                radius: radius * scale,
                offsetX: 0,
                offsetY: 0,
                index
            }));
        }

        startFloaters() {
            this.floaters.forEach(floater => {
                const direction = floater.index % 2 === 0 ? 1 : -1;
                const tween = gsap.to(floater, {
                    offsetX: direction * (7 + this.random() * 11),
                    offsetY: -direction * (6 + this.random() * 10),
                    duration: 8 + this.random() * 7,
                    delay: this.random() * 2.5,
                    repeat: -1,
                    yoyo: true,
                    ease: 'sine.inOut',
                    onUpdate: () => this.requestDraw()
                });
                this.floaterTweens.push(tween);
            });
        }

        findLandingRow(shape, column, grid) {
            const shapeHeight = Math.max(...shape.map(cell => cell[1])) + 1;
            let lastValid = -shapeHeight;
            for (let row = -shapeHeight; row <= this.rows - shapeHeight; row += 1) {
                if (!this.canPlace(shape, column, row, grid)) break;
                lastValid = row;
            }
            return lastValid;
        }

        canPlace(shape, column, row, grid) {
            return shape.every(([x, y]) => {
                const targetColumn = column + x;
                const targetRow = row + y;
                if (targetColumn < 0 || targetColumn >= this.columns || targetRow >= this.rows) return false;
                return targetRow < 0 || !grid[targetRow][targetColumn];
            });
        }

        place(shape, column, row, color, grid) {
            shape.forEach(([x, y]) => {
                const targetRow = row + y;
                if (targetRow >= 0 && targetRow < this.rows && column + x < this.columns) {
                    grid[targetRow][column + x] = color;
                }
            });
        }

        requestDraw() {
            if (this.paused || this.frame) return;
            this.frame = window.requestAnimationFrame(() => {
                this.frame = 0;
                this.draw();
            });
        }

        draw() {
            const ctx = this.context;
            ctx.clearRect(0, 0, this.width, this.height);
            this.ceilingPieces.forEach(source => {
                if (!source.available) return;
                source.shape.forEach(([x, y]) => this.drawCell(source.column + x, source.row + y, source.color));
            });
            this.drawFloaters();

            this.occupancy.forEach((row, rowIndex) => {
                row.forEach((color, columnIndex) => {
                    if (color) this.drawCell(columnIndex, rowIndex, color);
                });
            });

            this.pieces.forEach(piece => {
                if (piece.settled) return;
                const drift = this.getPieceDrift(piece);
                if (piece.hovered) {
                    const bounds = this.getPieceBounds(piece, drift);
                    const centerX = (bounds.left + bounds.right) / 2;
                    const centerY = (bounds.top + bounds.bottom) / 2;
                    ctx.save();
                    ctx.translate(centerX, centerY);
                    ctx.scale(1.1, 1.1);
                    ctx.translate(-centerX, -centerY);
                }
                piece.shape.forEach(([x, y]) => this.drawCell(piece.column + x + drift, piece.row + y, piece.color));
                if (piece.hovered) ctx.restore();
            });
        }

        getPieceDrift(piece) {
            const progress = piece.tween ? piece.tween.progress() : 1;
            return Math.sin(piece.row * 0.55 + piece.phase) * piece.drift * (1 - progress);
        }

        getPieceBounds(piece, drift = this.getPieceDrift(piece)) {
            const xs = piece.shape.map(cell => cell[0]);
            const ys = piece.shape.map(cell => cell[1]);
            const left = this.originX + (piece.column + Math.min(...xs) + drift) * this.pitch;
            const top = this.originY + (piece.row + Math.min(...ys)) * this.pitch;
            const right = this.originX + (piece.column + Math.max(...xs) + drift) * this.pitch + this.cell;
            const bottom = this.originY + (piece.row + Math.max(...ys)) * this.pitch + this.cell;
            return { left, top, right, bottom };
        }

        handlePointerMove(event) {
            if (this.paused) return;
            const rect = this.canvas.getBoundingClientRect();
            const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
            const hit = [...this.pieces].reverse().find(piece => {
                if (piece.settled) return false;
                const bounds = this.getPieceBounds(piece);
                const padding = 3;
                return point.x >= bounds.left - padding && point.x <= bounds.right + padding &&
                    point.y >= bounds.top - padding && point.y <= bounds.bottom + padding;
            });
            this.setHoveredPiece(hit || null);
        }

        setHoveredPiece(piece) {
            if (this.hoveredPiece === piece) return;
            const previous = this.hoveredPiece;
            this.hoveredPiece = piece;

            if (previous) {
                previous.hovered = false;
                if (!this.paused && previous.tween && previous.tween.progress() < 1) previous.tween.resume();
            }
            if (piece) {
                piece.hovered = true;
                if (piece.tween) piece.tween.pause();
            }

            this.canvas.style.cursor = piece ? 'pointer' : 'default';
            this.requestDraw();
        }

        drawCell(column, row, color) {
            if (row < -1 || row > this.rows) return;
            const x = this.originX + column * this.pitch;
            const y = this.originY + row * this.pitch;
            const ctx = this.context;
            const r = this.radius;
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(x, y, this.cell, this.cell, r);
            } else {
                ctx.moveTo(x + r, y);
                ctx.arcTo(x + this.cell, y, x + this.cell, y + this.cell, r);
                ctx.arcTo(x + this.cell, y + this.cell, x, y + this.cell, r);
                ctx.arcTo(x, y + this.cell, x, y, r);
                ctx.arcTo(x, y, x + this.cell, y, r);
            }
            ctx.fillStyle = color;
            ctx.fill();
            ctx.lineWidth = 0.46;
            ctx.strokeStyle = '#1e1e1e';
            ctx.stroke();
        }

        drawFloaters() {
            const ctx = this.context;
            ctx.save();
            ctx.lineWidth = 0.57;
            ctx.strokeStyle = '#000';
            this.floaters.forEach(floater => {
                ctx.beginPath();
                ctx.arc(
                    floater.x + floater.offsetX,
                    floater.y + floater.offsetY,
                    floater.radius,
                    0,
                    Math.PI * 2
                );
                ctx.stroke();
            });
            ctx.restore();
        }

        pause() {
            if (this.paused) return;
            this.paused = true;
            this.tweens.forEach(tween => tween.pause());
            this.floaterTweens.forEach(tween => tween.pause());
            if (this.spawnCall) this.spawnCall.pause();
            if (this.frame) window.cancelAnimationFrame(this.frame);
            this.frame = 0;
        }

        resume() {
            if (!this.paused || document.hidden) return;
            this.paused = false;
            this.pieces.forEach(piece => {
                if (!piece.hovered && piece.tween && piece.tween.progress() < 1) piece.tween.resume();
            });
            this.floaterTweens.forEach(tween => tween.resume());
            if (this.spawnCall && this.spawnCall.progress() < 1) this.spawnCall.resume();
            this.requestDraw();
        }

        killTweens() {
            this.tweens.forEach(tween => tween.kill());
            this.tweens = [];
            this.floaterTweens.forEach(tween => tween.kill());
            this.floaterTweens = [];
            if (this.spawnCall) this.spawnCall.kill();
            this.spawnCall = null;
            if (this.frame) window.cancelAnimationFrame(this.frame);
            this.frame = 0;
        }

        destroy() {
            this.killTweens();
            this.canvas.removeEventListener('pointermove', this.onPointerMove);
            this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
            this.context.clearRect(0, 0, this.width, this.height);
        }
    }

    function safeStorageGet(key) {
        try {
            return window.localStorage.getItem(key);
        } catch (error) {
            return null;
        }
    }

    function safeStorageSet(key, value) {
        try {
            window.localStorage.setItem(key, value);
        } catch (error) {
            // The button still works for the current page view.
        }
    }

    async function loadNavigation() {
        const mount = document.querySelector('#left-nav-container');
        if (!mount) return;
        try {
            const response = await fetch('/components/left-navigation.html');
            if (!response.ok) throw new Error('Navigation could not be loaded.');
            mount.innerHTML = await response.text();
            const workLink = mount.querySelector('a[href="/#work"]');
            const playLink = mount.querySelector('a[href="/play"]');
            if (workLink) workLink.addEventListener('click', event => scrollFromNavigation(event, '#work'));
            if (playLink) playLink.addEventListener('click', event => scrollFromNavigation(event, '#play'));
        } catch (error) {
            mount.innerHTML = '<a class="demo-nav-fallback" href="/">Juno</a>';
        }
    }

    function scrollFromNavigation(event, selector) {
        event.preventDefault();
        const target = document.querySelector(selector);
        if (target) scrollTo(target);
    }

    function scrollTo(target) {
        if (state.smoother) {
            state.smoother.scrollTo(target, true, 'top top');
        } else {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function initModal() {
        const modal = document.querySelector('.demo-window');
        const body = document.querySelector('.demo-window-body');
        const minimize = document.querySelector('.demo-minimize');
        const like = document.querySelector('.demo-like');
        const heart = document.querySelector('.demo-heart');
        const scrollButton = document.querySelector('.demo-scroll-down');
        if (!modal || !body || !minimize || !like || !heart || !scrollButton) return;

        const alreadyLiked = safeStorageGet(LIKE_KEY) === 'true';
        like.setAttribute('aria-pressed', String(alreadyLiked));
        heart.textContent = alreadyLiked ? '♥' : '♡';

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        state.modalTween = gsap.timeline({ delay: reducedMotion ? 0 : 1 })
            .set(modal, { visibility: 'visible' })
            .fromTo(modal, { autoAlpha: 0, y: 24, scale: 0.985 }, {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                duration: reducedMotion ? 0 : 0.62,
                ease: 'power3.out'
            });

        like.addEventListener('click', () => {
            const liked = like.getAttribute('aria-pressed') !== 'true';
            like.setAttribute('aria-pressed', String(liked));
            heart.textContent = liked ? '♥' : '♡';
            safeStorageSet(LIKE_KEY, String(liked));
            if (!reducedMotion) {
                gsap.fromTo(heart, { scale: 0.72, rotate: -7 }, {
                    scale: 1,
                    rotate: 0,
                    duration: 0.48,
                    ease: 'back.out(2.4)',
                    overwrite: true
                });
            }
        });

        minimize.addEventListener('click', () => {
            const expanded = minimize.getAttribute('aria-expanded') === 'true';
            minimize.setAttribute('aria-expanded', String(!expanded));
            minimize.setAttribute('aria-label', expanded ? 'Restore introduction' : 'Minimize introduction');
            gsap.timeline({ defaults: { duration: reducedMotion ? 0 : 0.35, ease: 'power2.inOut' } })
                .to(body, { autoAlpha: expanded ? 0 : 1 }, 0)
                .to(modal, { height: expanded ? 52 : 404 }, 0);
        });

        scrollButton.addEventListener('click', () => scrollTo(document.querySelector('#work')));
    }

    function initScroll() {
        if (!window.gsap || !window.ScrollTrigger || !window.ScrollSmoother) return;
        gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
        state.smoother = ScrollSmoother.create({
            wrapper: '#demo-smooth-wrapper',
            content: '#demo-smooth-content',
            smooth: 1.3,
            effects: false,
            normalizeScroll: true,
            ignoreMobileResize: true
        });

        const surface = document.querySelector('.demo-content-surface');
        const heroStage = document.querySelector('.demo-hero-stage');
        const heroCanvas = document.querySelector('.demo-tetris-canvas');
        if (surface) {
            let heroCovered = false;
            const syncHeroCoverage = () => {
                const surfaceTop = surface.getBoundingClientRect().top;
                const visibleHeight = Math.max(0, Math.min(window.innerHeight, surfaceTop));
                const covered = surfaceTop <= 1;
                if (heroCanvas) {
                    heroCanvas.style.clipPath = `inset(0 0 ${Math.max(0, window.innerHeight - visibleHeight)}px 0)`;
                }
                if (covered === heroCovered) return;
                heroCovered = covered;
                if (heroStage) gsap.set(heroStage, { autoAlpha: covered ? 0 : 1 });
                if (state.tetris) {
                    if (covered) state.tetris.pause();
                    else state.tetris.resume();
                }
            };
            state.triggers.push(ScrollTrigger.create({
                trigger: surface,
                start: 'top bottom',
                end: 'top top',
                onUpdate: syncHeroCoverage,
                onRefresh: syncHeroCoverage,
                onEnter: syncHeroCoverage,
                onLeave: syncHeroCoverage,
                onLeaveBack: syncHeroCoverage
            }));
            window.requestAnimationFrame(syncHeroCoverage);
        }

        const gallery = document.querySelector('.demo-gallery');
        const track = document.querySelector('.demo-gallery-track');
        const progress = document.querySelector('.demo-gallery-progress span');
        if (gallery && track) {
            const travel = () => Math.max(0, track.scrollWidth - window.innerWidth);
            state.galleryTween = gsap.to(track, {
                x: () => -travel(),
                ease: 'none',
                scrollTrigger: {
                    trigger: gallery,
                    start: 'top top',
                    end: () => '+=' + Math.max(window.innerHeight, travel()),
                    pin: true,
                    scrub: 1,
                    invalidateOnRefresh: true,
                    onUpdate: self => {
                        if (progress) gsap.set(progress, { scaleX: self.progress });
                    }
                }
            });
        }
    }

    function handleVisibility() {
        if (!state.tetris) return;
        if (document.hidden) state.tetris.pause();
        else if (window.scrollY < window.innerHeight) state.tetris.resume();
    }

    function handleResize() {
        window.clearTimeout(state.resizeTimer);
        state.resizeTimer = window.setTimeout(() => {
            if (window.innerWidth < MIN_WIDTH) {
                pause();
                return;
            }
            if (state.tetris) state.tetris.resize();
            resume();
            if (window.ScrollTrigger) ScrollTrigger.refresh();
        }, 180);
    }

    function waitForDesktop() {
        if (window.innerWidth < MIN_WIDTH) return;
        window.removeEventListener('resize', waitForDesktop);
        state.waitingForDesktop = false;
        init();
    }

    function handleHash() {
        if (window.location.hash !== '#work' && window.location.hash !== '#play') return;
        window.setTimeout(() => {
            const target = document.querySelector(window.location.hash);
            if (target) scrollTo(target);
        }, 160);
    }

    function init() {
        if (state.destroyed || state.tetris) return;
        if (window.innerWidth < MIN_WIDTH) {
            if (!state.waitingForDesktop) {
                state.waitingForDesktop = true;
                window.addEventListener('resize', waitForDesktop, { passive: true });
            }
            return;
        }
        loadNavigation();
        initScroll();
        state.tetris = new TetrisScene(document.querySelector('.demo-tetris-canvas'));
        initModal();
        handleHash();
        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('resize', handleResize, { passive: true });
        window.addEventListener('hashchange', handleHash);
    }

    function pause() {
        if (state.tetris) state.tetris.pause();
    }

    function resume() {
        if (state.tetris) state.tetris.resume();
    }

    function destroy() {
        if (state.destroyed) return;
        state.destroyed = true;
        window.clearTimeout(state.resizeTimer);
        window.removeEventListener('resize', waitForDesktop);
        document.removeEventListener('visibilitychange', handleVisibility);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('hashchange', handleHash);
        if (state.tetris) state.tetris.destroy();
        if (state.modalTween) state.modalTween.kill();
        if (state.galleryTween) state.galleryTween.kill();
        state.triggers.forEach(trigger => trigger.kill());
        if (state.smoother) state.smoother.kill();
    }

    window[NAMESPACE] = { init, pause, resume, destroy };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
}());
