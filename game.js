// ─────────────────────────────────────────────────────────────────────────────
// TRI DES DÉCHETS — 60-second time attack, bin rotation, combo × speed
// ─────────────────────────────────────────────────────────────────────────────

const TRASH_CATALOGUE = [
    { key: 'carton',            bin: 'jaune', w: 68, h: 68 },
    { key: 'plastique',         bin: 'jaune', w: 44, h: 74 },
    { key: 'canette',           bin: 'jaune', w: 44, h: 68 },
    { key: 'brique_alimentaire',bin: 'jaune', w: 52, h: 72 },
    { key: 'boite_conserve',    bin: 'jaune', w: 52, h: 68 },
    { key: 'aerosol',           bin: 'jaune', w: 40, h: 82 },
    { key: 'journal',           bin: 'jaune', w: 72, h: 52 },
    { key: 'pomme',           bin: 'noir',  w: 58, h: 66 },
    { key: 'banane',          bin: 'noir',  w: 78, h: 52 },
    { key: 'mouchoir',        bin: 'noir',  w: 68, h: 60 },
    { key: 'couche',          bin: 'noir',  w: 88, h: 60 },
    { key: 'sachet_chips',    bin: 'noir',  w: 58, h: 75 },
    { key: 'brosse_dents',    bin: 'noir',  w: 88, h: 30 },
    { key: 'polystyrene',     bin: 'noir',  w: 62, h: 72 },
    { key: 'bouteille_verre', bin: 'vert',  w: 40, h: 80 },
    { key: 'bocal',           bin: 'vert',  w: 64, h: 72 },
    { key: 'bouteille_vin',   bin: 'vert',  w: 38, h: 90 },
    { key: 'bouteille_biere', bin: 'vert',  w: 40, h: 86 },
    { key: 'pot_confiture',   bin: 'vert',  w: 62, h: 66 },
    { key: 'flacon_parfum',   bin: 'vert',  w: 48, h: 76 },
];

const BIN_CYCLE = ['jaune', 'noir', 'vert'];
const BIN_INFO = {
    jaune: { color: '#FDC602', barColor: 0xFDC602, label: 'Bac Jaune 🟡  Carton & Plastique' },
    noir:  { color: '#CCCCCC', barColor: 0x888888, label: 'Bac Noir ⚫  Déchets' },
    vert:  { color: '#44EE88', barColor: 0x1A9830, label: 'Bac Vert 🟢  Verre' },
};

const WRONG_BIN_TIPS = {
    carton:             "Le carton se recycle au bac jaune !",
    plastique:          "Les plastiques rigides vont au bac jaune.",
    canette:            "Le métal se recycle facilement — bac jaune.",
    brique_alimentaire: "Carton + plastique = bac jaune.",
    boite_conserve:     "L'acier se recycle à l'infini — bac jaune !",
    aerosol:            "Aérosol vide = métal recyclable — bac jaune.",
    journal:            "Le papier journal se recycle au bac jaune.",
    pomme:              "Les déchets alimentaires vont au bac noir.",
    banane:             "Les épluchures sont des déchets organiques.",
    mouchoir:           "Mouchoir usagé = non recyclable — bac noir.",
    couche:             "Les couches = déchets ménagers — bac noir.",
    sachet_chips:       "Emballages souples non recyclables — bac noir.",
    brosse_dents:       "Plastiques composites = bac noir.",
    polystyrene:        "Le polystyrène ne se recycle pas — bac noir.",
    bouteille_verre:    "Le verre se recycle à l'infini — bac vert !",
    bocal:              "Les bocaux en verre vont au bac vert.",
    bouteille_vin:      "Toutes les bouteilles en verre = bac vert.",
    bouteille_biere:    "Verre = bac vert, toujours !",
    pot_confiture:      "Les pots en verre vont au bac vert.",
    flacon_parfum:      "Les flacons en verre vont au bac vert.",
};

// Combo colours — gold → orange → red → magenta
const COMBO_COLORS = ['#FFD700', '#FF9900', '#FF6600', '#FF4500', '#FF00FF'];

const ROUND_TIME       = 60;   // seconds
const BIN_ROTATE_EVERY = 8;    // seconds between bin changes

function getMultiplier(combo) {
    if (combo >= 10) return 6;
    if (combo >= 7)  return 5;
    if (combo >= 5)  return 4;
    if (combo >= 3)  return 3;
    if (combo >= 2)  return 2;
    return 1;
}

// Bin geometry
const BIN_HALF_W = 48;
const BIN_OPEN_Y = -55;
const CATCH_H    = 50;

// ─────────────────────────────────────────────────────────────────────────────

class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); }

    preload() {
        this.load.svg('bin-jaune', 'img/jaune/bin/jaune.svg', { scale: 0.1 });
        this.load.svg('bin-noir',  'img/noir/bin/noir.svg',   { scale: 0.1 });
        this.load.svg('bin-vert',  'img/vert/bin/vert.svg',   { scale: 0.1 });
        TRASH_CATALOGUE.forEach(t =>
            this.load.svg(t.key, `img/${t.bin}/${t.key}.svg`, { width: t.w, height: t.h })
        );
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        this.score       = 0;
        this.items       = [];
        this.isOver      = false;
        this.isPaused    = false;
        this.fallSpeed   = 180;
        this.combo            = 0;
        this._wrongPopupGroup = null;
        this.timeLeft         = ROUND_TIME;
        this.timeElapsed = 0;
        this.binIndex    = 0;

        // ── Background ────────────────────────────────────────────────────────
        this.add.rectangle(W / 2, H / 2, W, H, 0x1a2a4a);
        this.add.rectangle(W / 2, 65, W, 130, 0x2c3e6b);

        // ── Title ─────────────────────────────────────────────────────────────
        this.add.text(W / 2, 28, '♻  Tri des Déchets', {
            fontFamily: '"Press Start 2P"', fontSize: '14px',
            color: '#ffffff', stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5);

        // ── Help button ───────────────────────────────────────────────────────
        const helpBtn = this.add.text(14, 12, ' ? ', {
            fontFamily: '"Press Start 2P"', fontSize: '9px',
            color: '#aaddff', backgroundColor: '#334477',
            padding: { x: 5, y: 4 },
        }).setOrigin(0, 0).setInteractive({ useHandCursor: true }).setDepth(10);
        helpBtn.on('pointerover', () => helpBtn.setBackgroundColor('#4466aa'));
        helpBtn.on('pointerout',  () => helpBtn.setBackgroundColor('#334477'));
        helpBtn.on('pointerdown', () => this.scene.switch('HelpScene'));

        // ── Pause button (top-right, mobile-friendly) ─────────────────────────
        this.pauseBtn = this.add.text(W - 14, 12, ' ⏸ ', {
            fontFamily: '"Press Start 2P"', fontSize: '9px',
            color: '#aaddff', backgroundColor: '#334477',
            padding: { x: 5, y: 4 },
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(62);
        this.pauseBtn.on('pointerover', () => this.pauseBtn.setBackgroundColor('#4466aa'));
        this.pauseBtn.on('pointerout',  () => this.pauseBtn.setBackgroundColor('#334477'));
        this.pauseBtn.on('pointerdown', () => this.togglePause());

        // Hide loader now that Phaser assets are ready
        const loaderEl = document.getElementById('loader');
        if (loaderEl) {
            loaderEl.classList.add('hidden');
            this.time.delayedCall(420, () => { loaderEl.style.display = 'none'; });
        }

        // ── Space key ─────────────────────────────────────────────────────────
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // ── Pause overlay (hidden initially) ──────────────────────────────────
        this.pauseOverlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.72)
            .setDepth(60).setVisible(false)
            .setInteractive()
            .on('pointerdown', () => this.togglePause());
        this.pauseLabel = this.add.text(W / 2, H / 2 - 40, '⏸ PAUSE', {
            fontFamily: '"Press Start 2P"', fontSize: '28px',
            color: '#ffffff', stroke: '#000000', strokeThickness: 6,
        }).setOrigin(0.5).setDepth(61).setVisible(false);
        this.pauseHint = this.add.text(W / 2, H / 2 + 22, 'Espace ou ⏸ pour reprendre', {
            fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#aaaaaa',
        }).setOrigin(0.5).setDepth(61).setVisible(false);

        // ── Active bin label ──────────────────────────────────────────────────
        this.binLabelText = this.add.text(W / 2, 58, BIN_INFO.jaune.label, {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#FDC602',
        }).setOrigin(0.5);

        // ── Score (left) — Combo (center) — Timer (right) ─────────────────────
        this.scoreText = this.add.text(14, 84, 'Score : 0', {
            fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#ffffff',
        });

        this.comboText = this.add.text(W / 2, 84, '', {
            fontFamily: '"Press Start 2P"', fontSize: '9px',
            color: '#FFD700', stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5, 0).setDepth(10).setAlpha(0);

        this.timerText = this.add.text(W - 14, 80, '1:00', {
            fontFamily: '"Press Start 2P"', fontSize: '18px',
            color: '#00FF88', stroke: '#000000', strokeThickness: 4,
        }).setOrigin(1, 0).setDepth(10);

        // ── Timer bar ─────────────────────────────────────────────────────────
        this.add.rectangle(W / 2, 125, W - 32, 12, 0x333333).setOrigin(0.5);
        this.timerBar = this.add.rectangle(16, 125, W - 32, 8, 0x00CC66).setOrigin(0, 0.5);

        // ── Bin ───────────────────────────────────────────────────────────────
        this.binY = H - 90;
        this.binSprite = this.add.image(W / 2, this.binY, 'bin-jaune').setDepth(5);

        // ── Round timer (1 tick / second) ─────────────────────────────────────
        this.roundTimer = this.time.addEvent({
            delay: 1000, callback: this.tickTimer, callbackScope: this, loop: true,
        });

        // ── Bin rotation timer ────────────────────────────────────────────────
        this.binRotateTimer = this.time.addEvent({
            delay: BIN_ROTATE_EVERY * 1000, callback: this.rotateBin, callbackScope: this, loop: true,
        });

        // ── Spawn timer ───────────────────────────────────────────────────────
        this.spawnTimer = this.time.addEvent({
            delay: 1800, callback: this.spawnItem, callbackScope: this, loop: true,
        });
        this.time.delayedCall(600, this.spawnItem, [], this);
    }

    // ─────────────────────────────────────────────────────────────────────────

    tickTimer() {
        if (this.isOver) return;
        this.timeLeft--;
        this.timeElapsed++;
        this.updateTimerDisplay();

        // Final 10s: urgent flash each second
        if (this.timeLeft <= 10 && this.timeLeft > 0) {
            this.screenFlash(0xFF4400, 0.12);
        }
        if (this.timeLeft <= 0) this.endGame();
    }

    rotateBin() {
        if (this.isOver) return;
        this.binIndex = (this.binIndex + 1) % BIN_CYCLE.length;
        const binId = BIN_CYCLE[this.binIndex];
        const info  = BIN_INFO[binId];

        this.binSprite.setTexture(`bin-${binId}`);
        this.binLabelText.setText(info.label).setColor(info.color);

        // Bounce the bin to signal the change
        this.tweens.add({
            targets: this.binSprite, scaleX: 1.35, scaleY: 1.35,
            duration: 140, ease: 'Back.Out', yoyo: true,
        });

        this.screenFlash(0xFFFFFF, 0.28);
        this.showBinChangeBanner(info);
    }

    showBinChangeBanner(info) {
        const W = this.scale.width;
        const banner = this.add.text(W / 2, 310, `⚡ BAC CHANGÉ !\n${info.label}`, {
            fontFamily: '"Press Start 2P"', fontSize: '12px',
            color: info.color, stroke: '#000000', strokeThickness: 5,
            align: 'center', backgroundColor: '#000000CC',
            padding: { x: 20, y: 14 },
        }).setOrigin(0.5).setDepth(26).setScale(0);

        this.tweens.add({
            targets: banner, scale: 1.0, duration: 180, ease: 'Back.Out',
            onComplete: () => {
                this.tweens.add({
                    targets: banner, alpha: 0, delay: 1400, duration: 380,
                    onComplete: () => banner.destroy(),
                });
            },
        });
    }

    spawnItem() {
        if (this.isOver) return;
        const W      = this.scale.width;
        const binId  = BIN_CYCLE[this.binIndex];
        const correct = TRASH_CATALOGUE.filter(t => t.bin === binId);
        const wrong   = TRASH_CATALOGUE.filter(t => t.bin !== binId);
        const pool    = Math.random() < 0.6 ? correct : wrong;
        const def     = Phaser.Utils.Array.GetRandom(pool);
        const img     = this.add.image(Phaser.Math.Between(55, W - 55), -60, def.key).setDepth(4);
        img.binCategory = def.bin;
        img.itemKey     = def.key;
        img.speed       = this.fallSpeed;
        this.items.push(img);
    }

    // ── Balatro-style score popup ─────────────────────────────────────────────
    scorePopup(x, y, base, mult) {
        const total = base * mult;

        if (mult === 1) {
            const t = this.add.text(x, y, `+${total}`, {
                fontFamily: '"Press Start 2P"', fontSize: '16px',
                color: '#ffffff', backgroundColor: '#2255EE',
                padding: { x: 8, y: 4 },
            }).setOrigin(0.5).setDepth(22);
            this.tweens.add({
                targets: t, y: y - 80, alpha: 0, duration: 700, ease: 'Power2',
                onComplete: () => t.destroy(),
            });
            return;
        }

        const chip = this.add.text(x - 34, y, ` +${base} `, {
            fontFamily: '"Press Start 2P"', fontSize: '11px',
            color: '#ffffff', backgroundColor: '#1144CC',
            padding: { x: 5, y: 3 },
        }).setOrigin(0.5).setDepth(22).setScale(0);

        const multTxt = this.add.text(x + 34, y, ` x${mult} `, {
            fontFamily: '"Press Start 2P"', fontSize: '11px',
            color: '#ffffff', backgroundColor: '#CC2211',
            padding: { x: 5, y: 3 },
        }).setOrigin(0.5).setDepth(22).setScale(0);

        this.tweens.add({ targets: [chip, multTxt], scale: 1, duration: 150, ease: 'Back.Out' });

        this.time.delayedCall(360, () => {
            chip.destroy();
            multTxt.destroy();

            const totalTxt = this.add.text(x, y - 8, `${total}!`, {
                fontFamily: '"Press Start 2P"', fontSize: (12 + mult * 3) + 'px',
                color: '#FFD700', stroke: '#000000', strokeThickness: 6,
            }).setOrigin(0.5).setDepth(23).setScale(0);

            this.tweens.add({
                targets: totalTxt, scale: 1.15, duration: 190, ease: 'Back.Out',
                onComplete: () => {
                    this.tweens.add({
                        targets: totalTxt, y: y - 95, alpha: 0, scale: 0.8,
                        duration: 520, ease: 'Power2',
                        onComplete: () => totalTxt.destroy(),
                    });
                },
            });
        });
    }

    // ── "COMBO ×N" center-screen burst ────────────────────────────────────────
    showComboLabel(combo) {
        const W    = this.scale.width;
        const mult = getMultiplier(combo);
        const col  = COMBO_COLORS[Math.min(mult - 2, COMBO_COLORS.length - 1)];

        const particleCount = Math.min(combo * 2 + 2, 26);
        this.spawnParticles(W / 2, 390, particleCount, 0xFFD700);
        if (combo >= 5) this.screenFlash(0xFFFFFF, 0.20);

        const fontSize = Math.min(20 + combo * 2, 36);
        const label = this.add.text(W / 2, 370, `COMBO x${combo}`, {
            fontFamily: '"Press Start 2P"', fontSize: `${fontSize}px`,
            color: col, stroke: '#000000', strokeThickness: 7,
        }).setOrigin(0.5).setDepth(25).setScale(0);

        this.tweens.add({
            targets: label, scale: 1.05, duration: 200, ease: 'Back.Out',
            onComplete: () => {
                this.tweens.add({
                    targets: label, scale: 1.0, duration: 80,
                    onComplete: () => {
                        this.tweens.add({
                            targets: label, alpha: 0, y: label.y - 38,
                            delay: 550, duration: 360,
                            onComplete: () => label.destroy(),
                        });
                    },
                });
            },
        });
    }

    // ── Particle burst ────────────────────────────────────────────────────────
    spawnParticles(x, y, count = 10, color = 0xFFD700) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
            const dist  = Phaser.Math.Between(28, 85);
            const dot   = this.add.circle(x, y, Phaser.Math.Between(4, 9), color).setDepth(15);
            this.tweens.add({
                targets: dot,
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                alpha: 0, scale: 0,
                duration: Phaser.Math.Between(320, 650), ease: 'Power2',
                onComplete: () => dot.destroy(),
            });
        }
    }

    // ── Full-screen colour flash ──────────────────────────────────────────────
    screenFlash(color = 0xFFFFFF, alpha = 0.3) {
        const fl = this.add.rectangle(
            this.scale.width / 2, this.scale.height / 2,
            this.scale.width, this.scale.height, color, alpha
        ).setDepth(50);
        this.tweens.add({
            targets: fl, alpha: 0, duration: 280,
            onComplete: () => fl.destroy(),
        });
    }

    // ── Persistent combo counter (center top) ─────────────────────────────────
    refreshComboDisplay() {
        if (this.combo < 2) {
            this.tweens.add({ targets: this.comboText, alpha: 0, duration: 180 });
            return;
        }
        const mult = getMultiplier(this.combo);
        const col  = COMBO_COLORS[Math.min(mult - 2, COMBO_COLORS.length - 1)];
        this.comboText.setText(`COMBO x${this.combo}`).setColor(col);

        this.tweens.killTweensOf(this.comboText);
        this.tweens.add({
            targets: this.comboText, alpha: 1, scaleX: 1.25, scaleY: 1.25,
            duration: 110, ease: 'Back.Out',
            onComplete: () => this.tweens.add({
                targets: this.comboText, scaleX: 1, scaleY: 1, duration: 90,
            }),
        });
    }

    // ── Handle a caught item ──────────────────────────────────────────────────
    processCatch(item, isCorrect) {
        if (isCorrect) {
            this.combo++;
            const mult = getMultiplier(this.combo);
            this.score += 10 * mult;

            this.scorePopup(item.x, item.y - 18, 10, mult);
            this.spawnParticles(item.x, item.y, Math.min(this.combo + 4, 12),
                mult >= 4 ? 0xFFD700 : 0x00CC66);

            if (this.combo >= 2) this.showComboLabel(this.combo);

        } else {
            this.score = Math.max(0, this.score - 10);
            this.combo = 0;

            this.screenFlash(0xFF0000, 0.22);
            this.cameras.main.shake(240, 0.011);

            const skull = this.add.text(item.x, item.y - 18, '-10 !!', {
                fontFamily: '"Press Start 2P"', fontSize: '16px',
                color: '#FF3333', stroke: '#000000', strokeThickness: 5,
            }).setOrigin(0.5).setDepth(22);
            this.tweens.add({
                targets: skull, y: skull.y - 75, alpha: 0, duration: 820, ease: 'Power2',
                onComplete: () => skull.destroy(),
            });

            this.showWrongBinPopup(item);
        }

        this.refreshComboDisplay();
        this.scoreText.setText(`Score : ${this.score}`);

        this.tweens.add({
            targets: item, scaleY: 0, y: item.y + 22,
            duration: 165, ease: 'Cubic.In',
            onComplete: () => item.destroy(),
        });
    }

    // ── Wrong-bin educational popup ───────────────────────────────────────────
    showWrongBinPopup(item) {
        if (this._wrongPopupGroup) {
            this._wrongPopupGroup.forEach(o => { this.tweens.killTweensOf(o); o.destroy(); });
            this._wrongPopupGroup = null;
        }

        const W      = this.scale.width;
        const binId  = item.binCategory;
        const info   = BIN_INFO[binId];
        const tip    = WRONG_BIN_TIPS[item.itemKey] || '';
        const name   = (item.itemKey || '').replace(/_/g, ' ');
        const border = parseInt(info.color.replace('#', ''), 16);

        const popX = W / 2;
        const popY = 295;
        const PW   = 390;
        const PH   = 108;

        const bg = this.add.rectangle(popX, popY, PW, PH, 0x081222, 0.94)
            .setStrokeStyle(3, border)
            .setDepth(35);

        const accent = this.add.rectangle(popX - PW / 2 + 6, popY, 8, PH - 8, border)
            .setDepth(36);

        const textX   = popX - PW / 2 + 24;
        const textTop = popY - PH / 2 + 16;

        const titleTxt = this.add.text(textX, textTop, `→ ${info.label}`, {
            fontFamily: '"Press Start 2P"', fontSize: '9px', color: info.color,
        }).setOrigin(0, 0).setDepth(36);

        const nameTxt = this.add.text(textX, textTop + 24, name, {
            fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#aaaaaa',
        }).setOrigin(0, 0).setDepth(36);

        const whyTxt = this.add.text(textX, textTop + 46, tip, {
            fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#eeeeee',
            wordWrap: { width: PW - 36 },
        }).setOrigin(0, 0).setDepth(36);

        const group = [bg, accent, titleTxt, nameTxt, whyTxt];
        this._wrongPopupGroup = group;
        group.forEach(o => o.setAlpha(0));

        this.tweens.add({
            targets: group, alpha: 1, duration: 200, ease: 'Power2',
            onComplete: () => {
                this.tweens.add({
                    targets: group, alpha: 0, delay: 2200, duration: 400,
                    onComplete: () => {
                        group.forEach(o => o.destroy());
                        if (this._wrongPopupGroup === group) this._wrongPopupGroup = null;
                    },
                });
            },
        });
    }

    // ── Time's up ─────────────────────────────────────────────────────────────
    endGame() {
        this.isOver = true;
        this.spawnTimer.remove();
        this.roundTimer.remove();
        this.binRotateTimer.remove();
        this.items.forEach(i => i.destroy());
        this.items = [];

        const W = this.scale.width;
        const H = this.scale.height;

        this.screenFlash(0xFFD700, 0.65);
        this.spawnParticles(W / 2, H / 2, 30, 0xFFD700);
        this.spawnParticles(W / 2, H / 2, 20, 0x00FF88);

        // Rating based on score
        let rating, ratingColor;
        if      (this.score >= 800) { rating = 'Expert du Tri !';    ratingColor = '#FF00FF'; }
        else if (this.score >= 500) { rating = 'Champion !';         ratingColor = '#FFD700'; }
        else if (this.score >= 300) { rating = 'Bon Recycleur';      ratingColor = '#00FF88'; }
        else if (this.score >= 150) { rating = 'En Apprentissage'; ratingColor = '#AAAAAA'; }
        else                        { rating = 'Débutant';           ratingColor = '#888888'; }

        this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.82).setDepth(30);

        this.add.text(W / 2, H / 2 - 175, '⏱', { fontSize: '72px' })
            .setOrigin(0.5).setDepth(31);

        this.add.text(W / 2, H / 2 - 100, 'Temps écoulé !', {
            fontFamily: '"Press Start 2P"', fontSize: '18px',
            color: '#ffffff', stroke: '#000000', strokeThickness: 5,
        }).setOrigin(0.5).setDepth(31);

        this.add.text(W / 2, H / 2 - 38, rating, {
            fontFamily: '"Press Start 2P"', fontSize: '16px',
            color: ratingColor, stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(31);

        this.add.text(W / 2, H / 2 + 32, `Score final\n${this.score} pts`, {
            fontFamily: '"Press Start 2P"', fontSize: '15px',
            color: '#FFD700', align: 'center', lineSpacing: 10,
        }).setOrigin(0.5).setDepth(31);

        // Show leaderboard overlay once effects have played out
        this.time.delayedCall(1100, () => {
            window.showLeaderboard(this.score, () => this.scene.restart());
        }, [], this);
    }

    // ── Pause / resume ────────────────────────────────────────────────────────
    togglePause() {
        if (this.isOver) return;
        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            this.roundTimer.paused     = true;
            this.binRotateTimer.paused = true;
            this.spawnTimer.paused     = true;

            this.pauseOverlay.setVisible(true);
            this.pauseLabel.setVisible(true);
            this.pauseHint.setVisible(true);
            this.pauseBtn.setText(' ▶ ');
        } else {
            this.roundTimer.paused     = false;
            this.binRotateTimer.paused = false;
            this.spawnTimer.paused     = false;

            this.pauseOverlay.setVisible(false);
            this.pauseLabel.setVisible(false);
            this.pauseHint.setVisible(false);
            this.pauseBtn.setText(' ⏸ ');
        }
    }

    // ── UPDATE — game loop ────────────────────────────────────────────────────
    update() {
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) this.togglePause();
        if (this.isOver || this.isPaused) return;

        const W  = this.scale.width;
        const dt = this.game.loop.delta / 1000;

        const bx    = Phaser.Math.Clamp(this.input.x, BIN_HALF_W, W - BIN_HALF_W);
        this.binSprite.x = bx;

        const openY = this.binY + BIN_OPEN_Y;
        const binId = BIN_CYCLE[this.binIndex];

        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.y += item.speed * dt;

            const caught =
                item.y >  openY           &&
                item.y <  openY + CATCH_H &&
                Math.abs(item.x - bx) <= BIN_HALF_W;

            if (caught) {
                this.processCatch(item, item.binCategory === binId);
                this.items.splice(i, 1);
                continue;
            }

            if (item.y > this.scale.height + 80) {
                // Missing a correct item breaks the combo
                if (item.binCategory === binId && this.combo > 0) {
                    this.combo = 0;
                    this.refreshComboDisplay();
                }
                item.destroy();
                this.items.splice(i, 1);
            }
        }

        // Speed = base + time-driven acceleration + combo bonus
        this.fallSpeed        = 180 + this.timeElapsed * 1.2 + this.combo * 10;
        // Spawn rate tightens over time and with combo
        this.spawnTimer.delay = Math.max(450, 1800 - this.timeElapsed * 12 - this.combo * 15);
    }

    // ── Timer display + bar ───────────────────────────────────────────────────
    updateTimerDisplay() {
        const W    = this.scale.width;
        const mins = Math.floor(this.timeLeft / 60);
        const secs = this.timeLeft % 60;
        this.timerText.setText(`${mins}:${secs.toString().padStart(2, '0')}`);

        if (this.timeLeft <= 10) {
            this.timerText.setColor('#FF3333');
            this.tweens.add({
                targets: this.timerText, scaleX: 1.25, scaleY: 1.25,
                duration: 80, ease: 'Power2', yoyo: true,
            });
        } else if (this.timeLeft <= 20) {
            this.timerText.setColor('#FF9900');
        }

        const ratio    = this.timeLeft / ROUND_TIME;
        const barColor = this.timeLeft <= 10 ? 0xFF3333 : (this.timeLeft <= 20 ? 0xFF9900 : 0x00CC66);
        this.timerBar.width = ratio * (W - 32);
        this.timerBar.setFillStyle(barColor);
    }
}

// ─────────────────────────────────────────────────────────────────────────────

class HelpScene extends Phaser.Scene {
    constructor() { super({ key: 'HelpScene' }); }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        this.add.rectangle(W / 2, H / 2, W, H, 0x0d1b36);
        this.add.rectangle(W / 2, 32, W, 64, 0x2c3e6b);
        this.add.text(W / 2, 32, '♻  Guide du Tri', {
            fontFamily: '"Press Start 2P"', fontSize: '13px',
            color: '#ffffff', stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5);

        const sections = [
            { binId: 'jaune', items: TRASH_CATALOGUE.filter(t => t.bin === 'jaune') },
            { binId: 'noir',  items: TRASH_CATALOGUE.filter(t => t.bin === 'noir')  },
            { binId: 'vert',  items: TRASH_CATALOGUE.filter(t => t.bin === 'vert')  },
        ];

        const COLS   = 4;
        const CELL_W = 130;
        const CELL_H = 88;
        const startX = (W - COLS * CELL_W) / 2 + CELL_W / 2;
        let   yOff   = 74;

        for (const section of sections) {
            const info     = BIN_INFO[section.binId];
            const hdrColor = section.binId === 'jaune' ? 0xFDC602
                           : section.binId === 'noir'  ? 0x555555
                           : 0x1A9830;
            const txtColor = section.binId === 'noir' ? '#ffffff' : '#111111';

            // Section header
            this.add.rectangle(W / 2, yOff + 14, W - 20, 28, hdrColor);
            this.add.text(W / 2, yOff + 14, info.label, {
                fontFamily: '"Press Start 2P"', fontSize: '8px', color: txtColor,
            }).setOrigin(0.5);
            yOff += 34;

            // Item grid
            section.items.forEach((item, idx) => {
                const col = idx % COLS;
                const row = Math.floor(idx / COLS);
                const cx  = startX + col * CELL_W;
                const cy  = yOff + row * CELL_H + CELL_H / 2;

                this.add.rectangle(cx, cy, CELL_W - 6, CELL_H - 6, 0x1e3060, 0.75);

                const img   = this.add.image(cx, cy - 14, item.key);
                const scale = Math.min(42 / item.w, 42 / item.h);
                img.setScale(scale);

                this.add.text(cx, cy + 20, item.key.replace(/_/g, ' '), {
                    fontFamily: '"Press Start 2P"', fontSize: '5px',
                    color: '#cccccc', align: 'center',
                    wordWrap: { width: CELL_W - 12 },
                }).setOrigin(0.5, 0);
            });

            yOff += Math.ceil(section.items.length / COLS) * CELL_H + 10;
        }

        // Back button
        const btn = this.add.text(W / 2, H - 36, '  ← Retour  ', {
            fontFamily: '"Press Start 2P"', fontSize: '11px',
            color: '#ffffff', backgroundColor: '#1155CC',
            padding: { x: 18, y: 10 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setBackgroundColor('#2266EE'));
        btn.on('pointerout',  () => btn.setBackgroundColor('#1155CC'));
        btn.on('pointerdown', () => this.scene.switch('GameScene'));
    }
}

// ─────────────────────────────────────────────────────────────────────────────
const config = {
    type: Phaser.AUTO,
    width: 600, height: 900,
    backgroundColor: '#111111',
    scene: [GameScene, HelpScene],
    parent: document.body,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
};

new Phaser.Game(config);
