// ─────────────────────────────────────────────────────────────────────────────
// TRI DES DÉCHETS — survival mode, exponential speed, 3 lives
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
    { key: 'sachet_chips',    bin: 'jaune', w: 58, h: 75 },
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
    sachet_chips:       "Les emballages souples se recyclent au bac jaune !",
    brosse_dents:       "Plastiques composites = bac noir.",
    polystyrene:        "Les barquettes en polystyrène ne se recyclent pas — bac noir.",
    bouteille_verre:    "Le verre se recycle à l'infini — bac vert !",
    bocal:              "Les bocaux en verre vont au bac vert.",
    bouteille_vin:      "Toutes les bouteilles en verre = bac vert.",
    bouteille_biere:    "Verre = bac vert, toujours !",
    pot_confiture:      "Les pots en verre vont au bac vert.",
    flacon_parfum:      "Les flacons en verre vont au bac vert.",
};

// Combo colours — gold → orange → red → magenta
const COMBO_COLORS = ['#FFD700', '#FF9900', '#FF6600', '#FF4500', '#FF00FF'];

const MAX_LIVES        = 3;
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
const SIDEBAR_W  = 110;

// ─────────────────────────────────────────────────────────────────────────────

class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); }

    preload() {
        this.load.svg('bin-jaune', 'games/game1/img/jaune/bin/jaune.svg', { scale: 0.1 });
        this.load.svg('bin-noir',  'games/game1/img/noir/bin/noir.svg',   { scale: 0.1 });
        this.load.svg('bin-vert',  'games/game1/img/vert/bin/vert.svg',   { scale: 0.1 });
        TRASH_CATALOGUE.forEach(t =>
            this.load.svg(t.key, `games/game1/img/${t.bin}/${t.key}.svg`, { width: t.w, height: t.h })
        );
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        this.score           = 0;
        this.lives           = MAX_LIVES;
        this.items           = [];
        this.isOver          = false;
        this.isPaused        = false;
        this.isTeachingPause = false;
        this.fallSpeed       = 180;
        this.combo           = 0;
        this._wrongPopupGroup = null;
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
        this.pauseHint = this.add.text(W / 2, H / 2 + 14, 'Espace ou ⏸ pour reprendre', {
            fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#aaaaaa',
        }).setOrigin(0.5).setDepth(61).setVisible(false);

        this.restartBtn = this.add.text(W / 2, H / 2 + 62, '  ↺ REJOUER  ', {
            fontFamily: '"Press Start 2P"', fontSize: '11px',
            color: '#ffffff', backgroundColor: '#7a2200',
            padding: { x: 16, y: 10 },
        }).setOrigin(0.5).setDepth(62).setVisible(false)
            .setInteractive({ useHandCursor: true });
        this.restartBtn.on('pointerover', () => this.restartBtn.setBackgroundColor('#aa3300'));
        this.restartBtn.on('pointerout',  () => this.restartBtn.setBackgroundColor('#7a2200'));
        this.restartBtn.on('pointerdown', (ptr, lx, ly, evt) => {
            evt.stopPropagation();
            this.scene.start('GameScene');
        });

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

        this.livesText = this.add.text(W - 14, 77, '♥ ♥ ♥', {
            fontFamily: '"Press Start 2P"', fontSize: '18px',
            color: '#FF4466', stroke: '#000000', strokeThickness: 3,
        }).setOrigin(1, 0).setDepth(10);

        // ── Speed bar ─────────────────────────────────────────────────────────
        this.add.rectangle(W / 2, 125, W - 32, 12, 0x333333).setOrigin(0.5);
        this.speedBar = this.add.rectangle(16, 125, 0, 8, 0x00CC66).setOrigin(0, 0.5);

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

        // ── Sidebar: bin reference guide ──────────────────────────────────────
        const sidebarH  = H - 130;
        const sidebarCY = 130 + sidebarH / 2;
        const scx       = W - SIDEBAR_W / 2;

        this.add.rectangle(scx, sidebarCY, SIDEBAR_W, sidebarH, 0x060c1a, 0.93).setDepth(20);
        this.add.rectangle(W - SIDEBAR_W, sidebarCY, 2, sidebarH, 0x334477).setDepth(20);

        this.add.text(scx, 142, 'GUIDE', {
            fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#445566',
        }).setOrigin(0.5).setDepth(21);

        const SIDEBAR_BINS = [
            { id: 'jaune', color: '#FDC602', short: 'JAUNE', desc: 'Carton, Plastique, Métal, Papier' },
            { id: 'noir',  color: '#BBBBBB', short: 'NOIR',  desc: 'Alimentaire, Composites' },
            { id: 'vert',  color: '#44EE88', short: 'VERT',  desc: 'Verre uniquement' },
        ];

        let sy = 162;
        for (const s of SIDEBAR_BINS) {
            this.add.image(scx, sy + 20, `bin-${s.id}`).setScale(0.7).setDepth(21);
            this.add.text(scx, sy + 50, s.short, {
                fontFamily: '"Press Start 2P"', fontSize: '6px', color: s.color,
            }).setOrigin(0.5).setDepth(21);
            this.add.text(scx, sy + 64, s.desc, {
                fontFamily: '"Press Start 2P"', fontSize: '5px', color: '#667788',
                align: 'center', wordWrap: { width: 96 }, lineSpacing: 2,
            }).setOrigin(0.5, 0).setDepth(21);
            this.add.rectangle(scx, sy + 116, SIDEBAR_W - 16, 1, 0x223344).setDepth(21);
            sy += 124;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────

    tickTimer() {
        if (this.isOver) return;
        this.timeElapsed++;
    }

    rotateBin() {
        if (this.isOver) return;
        const H = this.scale.height;
        const anyLow = this.items.some(it => it.y > H * 0.5);
        if (anyLow) {
            this.time.delayedCall(400, this.rotateBin, [], this);
            return;
        }
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

    // ── Lives ─────────────────────────────────────────────────────────────────
    updateLivesDisplay() {
        const display = Array.from({ length: MAX_LIVES }, (_, i) => i < this.lives ? '♥' : '♡').join(' ');
        this.livesText.setText(display);
        this.tweens.add({
            targets: this.livesText, scaleX: 1.4, scaleY: 1.4,
            duration: 100, ease: 'Back.Out', yoyo: true,
        });
    }

    loseLife() {
        this.lives--;
        this.updateLivesDisplay();
        this.screenFlash(0xFF0000, 0.35);
        this.cameras.main.shake(300, 0.015);

        if (this.lives <= 0) {
            this.endGame();
        } else {
            this.startTeachingPause();
        }
    }

    spawnItem() {
        if (this.isOver) return;
        const W      = this.scale.width;
        const binId  = BIN_CYCLE[this.binIndex];
        const correct = TRASH_CATALOGUE.filter(t => t.bin === binId);
        const wrong   = TRASH_CATALOGUE.filter(t => t.bin !== binId);
        const pool    = Math.random() < 0.6 ? correct : wrong;
        const def     = Phaser.Utils.Array.GetRandom(pool);
        const img     = this.add.image(Phaser.Math.Between(55, W - SIDEBAR_W - 10), -60, def.key).setDepth(4);
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
            this.combo = 0;

            const heartLost = this.add.text(item.x, item.y - 18, '💔 -1 VIE', {
                fontFamily: '"Press Start 2P"', fontSize: '13px',
                color: '#FF3333', stroke: '#000000', strokeThickness: 5,
            }).setOrigin(0.5).setDepth(22);
            this.tweens.add({
                targets: heartLost, y: heartLost.y - 75, alpha: 0, duration: 820, ease: 'Power2',
                onComplete: () => heartLost.destroy(),
            });

            this.showWrongBinPopup(item);
            this.loseLife();
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

        const popX = (W - SIDEBAR_W) / 2;
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

    // ── Teaching pause: freeze game so player can read the wrong-bin tip ─────
    startTeachingPause() {
        if (this.isTeachingPause || this.isOver) return;
        this.isTeachingPause     = true;
        this.isPaused            = true;
        this.roundTimer.paused   = true;
        this.binRotateTimer.paused = true;
        this.spawnTimer.paused   = true;

        const cx = (this.scale.width - SIDEBAR_W) / 2;
        this._teachHint = this.add.text(cx, 378, 'Appuie pour continuer', {
            fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#888888', align: 'center',
        }).setOrigin(0.5).setDepth(40).setAlpha(0);
        this.tweens.add({ targets: this._teachHint, alpha: 1, delay: 350, duration: 200 });

        const resume = () => this.endTeachingPause();
        this._teachPointerHandler = resume;
        this._teachResumeTimer    = this.time.delayedCall(3000, resume, [], this);
        this.input.once('pointerdown', resume);
    }

    endTeachingPause() {
        if (!this.isTeachingPause) return;
        this.isTeachingPause       = false;
        this.isPaused              = false;
        this.roundTimer.paused     = false;
        this.binRotateTimer.paused = false;
        this.spawnTimer.paused     = false;

        if (this._teachHint)        { this._teachHint.destroy(); this._teachHint = null; }
        if (this._teachResumeTimer) { this._teachResumeTimer.remove(false); this._teachResumeTimer = null; }
        this.input.off('pointerdown', this._teachPointerHandler);
        this._teachPointerHandler = null;
    }

    // ── Game over (no more lives) ─────────────────────────────────────────────
    endGame() {
        this.isOver = true;
        this.spawnTimer.remove();
        this.roundTimer.remove();
        this.binRotateTimer.remove();
        this.items.forEach(i => i.destroy());
        this.items = [];

        const W = this.scale.width;
        const H = this.scale.height;

        this.screenFlash(0xFF0000, 0.65);
        this.spawnParticles(W / 2, H / 2, 30, 0xFF4466);
        this.spawnParticles(W / 2, H / 2, 20, 0xFFD700);

        // Rating based on score
        let rating, ratingColor;
        if      (this.score >= 800) { rating = 'Expert du Tri !';  ratingColor = '#FF00FF'; }
        else if (this.score >= 500) { rating = 'Champion !';       ratingColor = '#FFD700'; }
        else if (this.score >= 300) { rating = 'Bon Recycleur';    ratingColor = '#00FF88'; }
        else if (this.score >= 150) { rating = 'En Apprentissage'; ratingColor = '#AAAAAA'; }
        else                        { rating = 'Débutant';         ratingColor = '#888888'; }

        const mins = Math.floor(this.timeElapsed / 60);
        const secs = this.timeElapsed % 60;
        const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

        this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.82).setDepth(30);

        this.add.text(W / 2, H / 2 - 175, '💀', { fontSize: '72px' })
            .setOrigin(0.5).setDepth(31);

        this.add.text(W / 2, H / 2 - 100, 'GAME OVER', {
            fontFamily: '"Press Start 2P"', fontSize: '22px',
            color: '#FF4466', stroke: '#000000', strokeThickness: 5,
        }).setOrigin(0.5).setDepth(31);

        this.add.text(W / 2, H / 2 - 48, rating, {
            fontFamily: '"Press Start 2P"', fontSize: '14px',
            color: ratingColor, stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(31);

        this.add.text(W / 2, H / 2 + 16, `Score final\n${this.score} pts`, {
            fontFamily: '"Press Start 2P"', fontSize: '15px',
            color: '#FFD700', align: 'center', lineSpacing: 10,
        }).setOrigin(0.5).setDepth(31);

        this.add.text(W / 2, H / 2 + 82, `Survie : ${timeStr}`, {
            fontFamily: '"Press Start 2P"', fontSize: '9px',
            color: '#aaaaaa',
        }).setOrigin(0.5).setDepth(31);

        // Show leaderboard overlay once effects have played out
        this.time.delayedCall(1100, () => {
            window.showLeaderboard(this.score, () => this.scene.start('LandingScene'));
        }, [], this);
    }

    // ── Pause / resume ────────────────────────────────────────────────────────
    togglePause() {
        if (this.isOver || this.isTeachingPause) return;
        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            this.roundTimer.paused     = true;
            this.binRotateTimer.paused = true;
            this.spawnTimer.paused     = true;

            this.pauseOverlay.setVisible(true);
            this.pauseLabel.setVisible(true);
            this.pauseHint.setVisible(true);
            this.restartBtn.setVisible(true);
            this.pauseBtn.setText(' ▶ ');
        } else {
            this.roundTimer.paused     = false;
            this.binRotateTimer.paused = false;
            this.spawnTimer.paused     = false;

            this.pauseOverlay.setVisible(false);
            this.pauseLabel.setVisible(false);
            this.pauseHint.setVisible(false);
            this.restartBtn.setVisible(false);
            this.pauseBtn.setText(' ⏸ ');
        }
    }

    // ── UPDATE — game loop ────────────────────────────────────────────────────
    update() {
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && !this.isTeachingPause) this.togglePause();
        if (this.isOver || this.isPaused) return;

        const W  = this.scale.width;
        const dt = this.game.loop.delta / 1000;

        const bx    = Phaser.Math.Clamp(this.input.x, BIN_HALF_W, W - SIDEBAR_W - BIN_HALF_W);
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

        // Exponential speed (Tetris-like) + small combo boost
        this.fallSpeed        = Math.min(950, 180 * Math.pow(1.012, this.timeElapsed) + this.combo * 8);
        this.spawnTimer.delay = Math.max(350, Math.floor(1800 * Math.pow(0.993, this.timeElapsed)));
        // Update speed bar
        const speedRatio = Math.min((this.fallSpeed - 180) / 770, 1);
        this.speedBar.width = speedRatio * (W - 32);
        this.speedBar.setFillStyle(speedRatio > 0.7 ? 0xFF3333 : (speedRatio > 0.4 ? 0xFF9900 : 0x00CC66));
    }

}

// ─────────────────────────────────────────────────────────────────────────────

class LandingScene extends Phaser.Scene {
    constructor() { super({ key: 'LandingScene' }); }

    preload() {
        this.load.svg('bin-jaune', 'games/game1/img/jaune/bin/jaune.svg', { scale: 0.1 });
        this.load.svg('bin-noir',  'games/game1/img/noir/bin/noir.svg',   { scale: 0.1 });
        this.load.svg('bin-vert',  'games/game1/img/vert/bin/vert.svg',   { scale: 0.1 });
        TRASH_CATALOGUE.forEach(t =>
            this.load.svg(t.key, `games/game1/img/${t.bin}/${t.key}.svg`, { width: t.w, height: t.h })
        );
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;
        this._active = true;

        // Hide loader now that all assets are ready
        const loaderEl = document.getElementById('loader');
        if (loaderEl) {
            loaderEl.classList.add('hidden');
            this.time.delayedCall(420, () => { loaderEl.style.display = 'none'; });
        }

        // ── Background ────────────────────────────────────────────────────────
        this.add.rectangle(W / 2, H / 2, W, H, 0x1a2a4a);
        this.add.rectangle(W / 2, 55, W, 110, 0x2c3e6b);

        // ── Title ─────────────────────────────────────────────────────────────
        this.add.text(W / 2, 32, '♻  Tri des Déchets', {
            fontFamily: '"Press Start 2P"', fontSize: '14px',
            color: '#ffffff', stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5);

        this.add.text(W / 2, 70, 'Le jeu du recyclage', {
            fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#aaddff',
        }).setOrigin(0.5);

        // ── Separator ─────────────────────────────────────────────────────────
        this.add.rectangle(W / 2, 116, W - 32, 2, 0x334477);

        // ── Leaderboard header ────────────────────────────────────────────────
        this.add.text(W / 2, 140, 'Meilleurs Joueurs', {
            fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#FDC602',
        }).setOrigin(0.5);

        // ── Column headers ────────────────────────────────────────────────────
        this.add.text(28,     163, '#',      { fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#FDC602' }).setOrigin(0, 0.5);
        this.add.text(68,     163, 'Pseudo', { fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#FDC602' }).setOrigin(0, 0.5);
        this.add.text(W - 22, 163, 'Score',  { fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#FDC602' }).setOrigin(1, 0.5);
        this.add.rectangle(W / 2, 172, W - 32, 1, 0x334477);

        // ── Rows ──────────────────────────────────────────────────────────────
        this._lbObjects = [];
        this._renderRows([]);
        this._loadAndRender();

        // ── Bin icons — decorative, below leaderboard ─────────────────────────
        const binY = H - 200;
        this.add.image(80,     binY, 'bin-jaune').setScale(0.85).setAlpha(0.25);
        this.add.image(W / 2,  binY, 'bin-noir').setScale(0.85).setAlpha(0.25);
        this.add.image(W - 80, binY, 'bin-vert').setScale(0.85).setAlpha(0.25);

        // ── Start button ──────────────────────────────────────────────────────
        const btn = this.add.text(W / 2, H - 100, '  ▶ JOUER  ', {
            fontFamily: '"Press Start 2P"', fontSize: '18px',
            color: '#ffffff', backgroundColor: '#1a9830',
            padding: { x: 32, y: 16 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10);

        btn.on('pointerover', () => btn.setBackgroundColor('#22cc44'));
        btn.on('pointerout',  () => btn.setBackgroundColor('#1a9830'));
        btn.on('pointerdown', () => this.scene.start('GameScene'));

        this.tweens.add({
            targets: btn, scaleX: 1.05, scaleY: 1.05,
            duration: 820, ease: 'Sine.InOut', yoyo: true, repeat: -1,
        });

        // ── Footer ────────────────────────────────────────────────────────────
        this.add.text(W / 2, H - 24, 'Citeo 2025', {
            fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#334477',
        }).setOrigin(0.5);
    }

    shutdown() { this._active = false; }

    _renderRows(rows, statusMsg) {
        this._lbObjects.forEach(o => o.destroy());
        this._lbObjects = [];

        const W      = this.scale.width;
        const startY = 178;
        const rowH   = 44;
        const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

        if (statusMsg || !rows.length) {
            const t = this.add.text(W / 2, startY + 50, statusMsg || 'Chargement…', {
                fontFamily: '"Press Start 2P"', fontSize: '7px',
                color: statusMsg ? '#ff9966' : '#556688',
                wordWrap: { width: W - 60 }, align: 'center',
            }).setOrigin(0.5);
            this._lbObjects.push(t);
            return;
        }

        rows.forEach((row, i) => {
            const y         = startY + i * rowH;
            const rankColor = i < 3 ? rankColors[i] : '#888888';
            const bgColor   = i % 2 === 0 ? 0x0d1b36 : 0x0f2040;

            const bg       = this.add.rectangle(W / 2, y + rowH / 2, W - 32, rowH - 3, bgColor);
            const rankTxt  = this.add.text(28,     y + rowH / 2, `${i + 1}`, {
                fontFamily: '"Press Start 2P"', fontSize: '9px', color: rankColor,
            }).setOrigin(0, 0.5);
            const nameTxt  = this.add.text(68,     y + rowH / 2, row.name || '???', {
                fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#ffffff',
            }).setOrigin(0, 0.5);
            const scoreTxt = this.add.text(W - 22, y + rowH / 2, `${row.score} pts`, {
                fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#00FF88',
            }).setOrigin(1, 0.5);

            this._lbObjects.push(bg, rankTxt, nameTxt, scoreTxt);
        });
    }

    async _loadAndRender() {
        if (typeof window.getLeaderboard !== 'function') {
            this._renderRows([], 'Classement indisponible');
            return;
        }
        try {
            const rows = await window.getLeaderboard();
            if (!this._active) return;
            if (!rows) {
                this._renderRows([], 'Firebase non configure');
            } else if (!rows.length) {
                this._renderRows([], 'Aucun score encore');
            } else {
                this._renderRows(rows);
            }
        } catch (e) {
            if (!this._active) return;
            console.error('Leaderboard fetch failed:', e);
            this._renderRows([], 'Erreur de connexion');
        }
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
    scene: [LandingScene, GameScene, HelpScene],
    parent: document.body,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
};

new Phaser.Game(config);
