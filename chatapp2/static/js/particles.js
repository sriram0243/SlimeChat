/**
 * SlimeChat — Animated Particles Background
 * Creates floating slime-colored particles
 */
(function () {
    const canvas = document.createElement('canvas');
    canvas.id = 'particles-canvas';
    canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:0;';
    document.body.insertBefore(canvas, document.body.firstChild);

    const ctx = canvas.getContext('2d');
    let W, H, particles = [];

    const COLORS = [
        'rgba(91,200,245,',
        'rgba(139,92,246,',
        'rgba(236,72,153,',
        'rgba(59,130,246,',
    ];

    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }

    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * W;
            this.y = Math.random() * H;
            this.size = Math.random() * 2.5 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.4;
            this.speedY = (Math.random() - 0.5) * 0.4 - 0.1;
            this.opacity = Math.random() * 0.5 + 0.1;
            this.maxOpacity = this.opacity;
            this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
            this.life = 0;
            this.maxLife = Math.random() * 300 + 200;
            // occasionally bigger glow orbs
            if (Math.random() < 0.05) {
                this.size = Math.random() * 8 + 4;
                this.opacity = 0.06;
                this.maxOpacity = 0.06;
            }
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.life++;
            if (this.life > this.maxLife * 0.8) {
                this.opacity = this.maxOpacity * (1 - (this.life - this.maxLife * 0.8) / (this.maxLife * 0.2));
            }
            if (this.life >= this.maxLife || this.x < -20 || this.x > W + 20 || this.y < -20 || this.y > H + 20) {
                this.reset();
            }
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color + this.opacity + ')';
            ctx.fill();
        }
    }

    function init() {
        resize();
        particles = Array.from({ length: 80 }, () => new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, W, H);
        particles.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    init();
    animate();
})();
