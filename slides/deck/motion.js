/* The deck's two animated scenes: the storm slide's truck and the game-has-changed robot.
 *
 * Both are pure functions of time: scene(slide, T, at) poses the slide's SVG for T seconds
 * after the slide came up, with the action starting at `at`. The video renderer calls them
 * from slides/video/seek.js with an exact frame time; in the live deck the loop at the bottom
 * calls them from the wall clock while the slide is on screen, and replays them on every visit.
 *
 * The SVGs as drawn are the end pose (the truck jackknifed, the robot standing in the middle),
 * so a PDF export, or a browser without JS, shows the finished scene.
 */
(function () {
  var clamp = function (x, a, b) { return x < a ? a : (x > b ? b : x); };
  var quant = function (p, n) { return Math.round(p * n) / n; };
  var ease = function (p) { return 1 - Math.pow(1 - p, 3); };
  var easeIn = function (p) { return p * p; };

  /* the game-has-changed scene: a person stands waving; the robot walks in from the right,
     bumps them off to the left, takes their spot and waves; the caption fades in as it does.
     `at` is when the robot starts walking. */
  function robot(slide, T, A) {
    var human = slide.querySelector('svg.scene g.human'), bot = slide.querySelector('svg.scene g.robot');
    if (!human || !bot) return false;
    var PI2 = Math.PI * 2;
    // the robot: walk in (A to A+1.4), shove and keep going to the middle (to A+2.2)
    var walk = ease(clamp((T - A) / 1.4, 0, 1)), settle = ease(clamp((T - A - 1.4) / 0.8, 0, 1));
    var bx = 1260 + (664 - 1260) * walk + (532 - 664) * settle;
    var walking = T > A && T < A + 2.2;
    bot.setAttribute('transform', 'translate(' + bx.toFixed(1) + ' ' + (134 - (walking ? Math.abs(Math.sin(PI2 * 3 * T)) * 4 : 0)).toFixed(1) + ')');
    var step = walking ? Math.sin(PI2 * 3 * T) : 0;
    slide.querySelector('svg.scene g.legL').setAttribute('transform', 'translate(0 ' + (-8 * Math.max(0, step)).toFixed(1) + ')');
    slide.querySelector('svg.scene g.legR').setAttribute('transform', 'translate(0 ' + (-8 * Math.max(0, -step)).toFixed(1) + ')');
    var wave = T > A + 2.4 ? 16 * Math.sin(PI2 * 1.6 * (T - A - 2.4)) : 0;
    slide.querySelector('svg.scene g.arm').setAttribute('transform', 'rotate(' + wave.toFixed(2) + ' 204 184)');
    // the person: waves until the shove, then is knocked over and off to the left
    var shove = easeIn(clamp((T - A - 1.4) / 0.7, 0, 1));
    human.setAttribute('transform', 'translate(' + (532 - 760 * shove).toFixed(1) + ' 150) rotate(' + (-70 * shove).toFixed(1) + ' 68 320)');
    var hwave = shove > 0 ? 0 : 18 * Math.sin(PI2 * 1.6 * T);
    slide.querySelector('svg.scene g.harm').setAttribute('transform', 'rotate(' + hwave.toFixed(2) + ' 120 92)');
    var cap = slide.querySelector('.robo-cap');
    if (cap) cap.style.opacity = String(quant(clamp((T - A - 2.4) / 0.4, 0, 1), 4));
    return true;
  }

  /* the storm slide's truck: it drives down the icy on-ramp with the cab straight ahead, then
     jackknifes, the cab swinging 90 degrees about the hitch into the drawn pose; the skid marks
     appear as it slides and the warning triangle flashes once it has stopped.
     `at` is when the truck appears. */
  var HITCH = '194 276';
  function truck(slide, T, A) {
    var cab = slide.querySelector('svg g.cab'), trailer = slide.querySelector('svg g.trailer');
    if (!cab || !trailer) return false;
    var drive = ease(clamp((T - A) / 1.3, 0, 1));            // A to A+1.3s: rolls in from above
    var fold = ease(clamp((T - A - 1.2) / 0.5, 0, 1));       // A+1.2 to A+1.7s: jackknifes
    var dy = (-520 * (1 - drive)).toFixed(1);
    var wobble = (Math.sin(clamp((T - A - 1.2) / 0.9, 0, 1) * Math.PI * 2) * 4 * (1 - fold * 0.6)).toFixed(2);
    trailer.setAttribute('transform', 'translate(0 ' + dy + ') rotate(' + (fold > 0 ? wobble : 0) + ' ' + HITCH + ')');
    cab.setAttribute('transform', 'translate(0 ' + dy + ') rotate(' + (-90 * (1 - fold)).toFixed(2) + ' ' + HITCH + ')');
    var skid = slide.querySelector('svg g.skid');
    if (skid) skid.style.opacity = String(quant(clamp((T - A - 1.2) / 0.4, 0, 1), 4));
    var warn = slide.querySelector('svg g.warn');
    var W = T - A - 1.8;
    if (warn) warn.style.opacity = W < 0 ? '0' : (W < 1.2 ? (Math.floor(W * 5) % 2 ? '0.25' : '1') : '1');
    return true;
  }

  window.__motion = { truck: truck, robot: robot };

  /* the live deck: play the current slide's scene from the moment it comes up. The video page
     (?t=...) and a PDF export (?print-pdf) leave the clock alone. */
  var q = new URLSearchParams(window.location.search);
  if (q.has('t') || q.has('print-pdf') || !window.Reveal) return;
  var LIVE = { truck: 0.3, robot: 1.5 };                     // seconds after the slide comes up
  var raf = 0;
  function play(slide) {
    cancelAnimationFrame(raf);
    if (!slide || !slide.querySelector('svg g.cab, svg.scene g.robot')) return;
    var t0 = performance.now();
    (function frame(now) {
      var T = (now - t0) / 1000;
      truck(slide, T, LIVE.truck);
      robot(slide, T, LIVE.robot);
      raf = requestAnimationFrame(frame);                    // the wave loops until the slide changes
    })(t0);
  }
  if (Reveal.isReady()) play(Reveal.getCurrentSlide());
  Reveal.on('ready', function (e) { play(e.currentSlide); });
  Reveal.on('slidechanged', function (e) { play(e.currentSlide); });
})();
