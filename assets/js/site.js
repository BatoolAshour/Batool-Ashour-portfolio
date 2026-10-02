/* Batool Ashour — Portfolio
   Shared behaviour for the home page and project pages. No dependencies. */

(() => {
  "use strict";

  document.documentElement.classList.remove("no-js");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----------------------------------------------------------------------
     Header: scrolled state + mobile menu
  ---------------------------------------------------------------------- */

  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.getElementById("nav-menu");

  const onScroll = () => header?.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const setMenu = (open) => {
    if (!toggle || !menu) return;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.classList.toggle("is-open", open);
  };

  toggle?.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  menu?.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && toggle?.getAttribute("aria-expanded") === "true") {
      setMenu(false);
      toggle.focus();
    }
  });
  window.matchMedia("(min-width: 861px)").addEventListener("change", (e) => e.matches && setMenu(false));

  /* ----------------------------------------------------------------------
     Active nav link for the section in view
  ---------------------------------------------------------------------- */

  const navLinks = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    const visible = new Map();
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => visible.set(entry.target.id, entry.isIntersecting));
        const current = sections.find((section) => visible.get(section.id));
        navLinks.forEach((link) => {
          const active = current && link.getAttribute("href") === `#${current.id}`;
          link.classList.toggle("is-active", Boolean(active));
          if (active) link.setAttribute("aria-current", "true");
          else link.removeAttribute("aria-current");
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((section) => spy.observe(section));
  }

  /* ----------------------------------------------------------------------
     Scroll reveal
  ---------------------------------------------------------------------- */

  const revealEls = document.querySelectorAll(".reveal");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else {
    const revealer = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => {
      // Small stagger between siblings that reveal together.
      const siblings = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
      el.style.transitionDelay = `${Math.min(siblings.indexOf(el), 3) * 70}ms`;
      revealer.observe(el);
    });
  }

  /* ----------------------------------------------------------------------
     Hero pipeline: a data packet travels stage by stage while visible
  ---------------------------------------------------------------------- */

  const stepList = document.querySelector(".pipeline-steps");
  const steps = [...document.querySelectorAll(".pipeline-step")];

  if (stepList && steps.length && !reduceMotion && "IntersectionObserver" in window) {
    const fill = document.createElement("span");
    const packet = document.createElement("span");
    fill.className = "pipeline-progress";
    packet.className = "pipeline-packet";
    fill.setAttribute("aria-hidden", "true");
    packet.setAttribute("aria-hidden", "true");
    stepList.append(fill, packet);

    let index = 0;
    let timer = null;
    const tick = () => {
      steps.forEach((step, i) => {
        step.classList.toggle("is-active", i === index);
        step.classList.toggle("is-done", i < index);
      });
      const node = steps[index].querySelector(".pipeline-node");
      const y = node.getBoundingClientRect().top - stepList.getBoundingClientRect().top + node.offsetHeight / 2 - 40;
      stepList.style.setProperty("--fill", `${Math.max(0, y)}px`);
      index = (index + 1) % steps.length;
    };
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !timer) {
        tick();
        timer = setInterval(tick, 1500);
      } else if (!entry.isIntersecting && timer) {
        clearInterval(timer);
        timer = null;
      }
    }).observe(stepList);
  } else {
    steps.forEach((step) => step.classList.add("is-active"));
  }

  /* ----------------------------------------------------------------------
     Hero canvas: a slowly drifting knowledge graph with data pulses
  ---------------------------------------------------------------------- */

  const canvas = document.querySelector(".hero-canvas");

  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext("2d");
    const hero = canvas.parentElement;
    const LINK = 160;
    const pointer = { x: -9999, y: -9999 };
    let nodes = [];
    let pulses = [];
    let width = 0;
    let height = 0;
    let running = false;
    let lastSpawn = 0;
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = hero.clientWidth;
      height = hero.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(80, Math.max(26, (width * height) / 15000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.2 + 0.8,
        hub: Math.random() < 0.12,
        flash: 0,
      }));
      pulses = [];
      if (!running) draw(performance.now());
    };

    const neighbours = (a) =>
      nodes.filter((b) => b !== a && Math.hypot(a.x - b.x, a.y - b.y) < LINK);

    const spawnPulse = () => {
      const from = nodes[(Math.random() * nodes.length) | 0];
      const near = neighbours(from);
      if (!near.length) return;
      pulses.push({ from, to: near[(Math.random() * near.length) | 0], t: 0, speed: 0.008 + Math.random() * 0.008 });
    };

    function draw(now) {
      ctx.clearRect(0, 0, width, height);

      for (const n of nodes) {
        if (running) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < -20) n.x = width + 20;
          if (n.x > width + 20) n.x = -20;
          if (n.y < -20) n.y = height + 20;
          if (n.y > height + 20) n.y = -20;
          // Gentle pull toward the pointer.
          const dx = pointer.x - n.x;
          const dy = pointer.y - n.y;
          const d = Math.hypot(dx, dy);
          if (d < 180 && d > 1) {
            n.x += (dx / d) * 0.12;
            n.y += (dy / d) * 0.12;
          }
          n.flash *= 0.94;
        }
      }

      // Edges
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK) {
            const near = Math.hypot(pointer.x - (a.x + b.x) / 2, pointer.y - (a.y + b.y) / 2) < 160;
            const alpha = (1 - d / LINK) * (near ? 0.4 : 0.2);
            ctx.strokeStyle = near ? `rgba(227,178,90,${alpha})` : `rgba(160,175,200,${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Pulses travelling along edges
      if (running && now - lastSpawn > 260) {
        spawnPulse();
        lastSpawn = now;
      }
      pulses = pulses.filter((p) => {
        p.t += p.speed;
        if (p.t >= 1) {
          p.to.flash = 1;
          return false;
        }
        const x = p.from.x + (p.to.x - p.from.x) * p.t;
        const y = p.from.y + (p.to.y - p.from.y) * p.t;
        const tx = p.from.x + (p.to.x - p.from.x) * Math.max(0, p.t - 0.12);
        const ty = p.from.y + (p.to.y - p.from.y) * Math.max(0, p.t - 0.12);
        const grad = ctx.createLinearGradient(tx, ty, x, y);
        grad.addColorStop(0, "rgba(227,178,90,0)");
        grad.addColorStop(1, "rgba(227,178,90,0.75)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = "rgba(240,200,120,0.95)";
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });

      // Nodes
      for (const n of nodes) {
        const lit = n.hub || n.flash > 0.05;
        ctx.fillStyle = lit ? `rgba(227,178,90,${0.45 + n.flash * 0.55})` : "rgba(190,200,215,0.6)";
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + n.flash * 2, 0, Math.PI * 2);
        ctx.fill();
        if (n.flash > 0.05) {
          ctx.strokeStyle = `rgba(227,178,90,${n.flash * 0.4})`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + 3 + (1 - n.flash) * 8, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      if (running) raf = requestAnimationFrame(draw);
    }

    const start = () => {
      if (running || reduceMotion || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(draw);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    hero.addEventListener("pointermove", (e) => {
      const rect = hero.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    });
    hero.addEventListener("pointerleave", () => {
      pointer.x = pointer.y = -9999;
    });
    new ResizeObserver(resize).observe(hero);
    new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(hero);
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  }

  /* ----------------------------------------------------------------------
     Scroll-linked effects: progress bar, timeline rail, 3D frame tilt
  ---------------------------------------------------------------------- */

  const progressBar = document.querySelector(".scroll-progress");
  const timelineWrap = document.querySelector(".timeline-wrap");
  const tiltEls = [...document.querySelectorAll("[data-tilt]")];
  const pointerTilt = new WeakMap();
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  let scrollQueued = false;

  const onScrollEffects = () => {
    scrollQueued = false;
    const vh = window.innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    progressBar?.style.setProperty("--progress", max > 0 ? (window.scrollY / max).toFixed(4) : 0);

    if (timelineWrap) {
      const r = timelineWrap.getBoundingClientRect();
      timelineWrap.style.setProperty("--tl", clamp((vh * 0.65 - r.top) / r.height).toFixed(3));
    }

    if (!reduceMotion) {
      tiltEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        const p = clamp((vh - r.top) / (vh * 0.65));
        const extra = pointerTilt.get(el) || { x: 0, y: 0 };
        el.style.setProperty("--rx", `${((1 - p) * 16 + extra.y).toFixed(2)}deg`);
        el.style.setProperty("--ry", `${extra.x.toFixed(2)}deg`);
        el.style.setProperty("--ts", (0.93 + p * 0.07).toFixed(3));
      });
    }
  };
  const queueScroll = () => {
    if (!scrollQueued) {
      scrollQueued = true;
      requestAnimationFrame(onScrollEffects);
    }
  };
  window.addEventListener("scroll", queueScroll, { passive: true });
  window.addEventListener("resize", queueScroll);
  onScrollEffects();

  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (!reduceMotion && finePointer) {
    tiltEls.forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        pointerTilt.set(el, { x: ((e.clientX - r.left) / r.width - 0.5) * 6, y: (0.5 - (e.clientY - r.top) / r.height) * 4 });
        queueScroll();
      });
      el.addEventListener("pointerleave", () => {
        pointerTilt.delete(el);
        queueScroll();
      });
    });
  }

  /* ----------------------------------------------------------------------
     Cursor spotlight on cards + magnetic primary buttons
  ---------------------------------------------------------------------- */

  if (finePointer) {
    document
      .querySelectorAll(".featured, .project-card, .capability, .skill-group, .panel, .feature, .arch li, .contact-form, .timeline-item")
      .forEach((el) => {
        el.classList.add("spotlight");
        el.addEventListener("pointermove", (e) => {
          const r = el.getBoundingClientRect();
          el.style.setProperty("--mx", `${e.clientX - r.left}px`);
          el.style.setProperty("--my", `${e.clientY - r.top}px`);
        });
      });
  }

  if (finePointer && !reduceMotion) {
    document.querySelectorAll(".btn-primary").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        btn.style.setProperty("--bx", `${((e.clientX - r.left) / r.width - 0.5) * 8}px`);
        btn.style.setProperty("--by", `${((e.clientY - r.top) / r.height - 0.5) * 6}px`);
      });
      btn.addEventListener("pointerleave", () => {
        btn.style.removeProperty("--bx");
        btn.style.removeProperty("--by");
      });
    });
  }

  /* ----------------------------------------------------------------------
     Reveal-triggered details: badge stagger, count-up, label decode
  ---------------------------------------------------------------------- */

  document.querySelectorAll(".badges").forEach((group) => {
    [...group.children].forEach((badge, i) => badge.style.setProperty("--i", i));
  });

  const once = (selector, fn) => {
    const els = document.querySelectorAll(selector);
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          fn(entry.target);
        }),
      { threshold: 0.6 }
    );
    els.forEach((el) => io.observe(el));
  };

  once("[data-count]", (el) => {
    const target = Number(el.dataset.count);
    const t0 = performance.now();
    const step = (now) => {
      const p = clamp((now - t0) / 1100);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    };
    el.textContent = "0";
    requestAnimationFrame(step);
  });

  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>_#";
  once(".section-index, .cs-split .eyebrow-accent", (el) => {
    const final = el.textContent;
    el.setAttribute("aria-label", final.trim());
    const t0 = performance.now();
    const step = (now) => {
      const p = clamp((now - t0) / 700);
      const solved = Math.floor(final.length * p);
      el.textContent = [...final]
        .map((ch, i) => (i < solved || ch === " " || ch === "/" ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
        .join("");
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = final;
    };
    requestAnimationFrame(step);
  });

  /* ----------------------------------------------------------------------
     Lightbox (shared by showcase, case-study gallery, project cards)
  ---------------------------------------------------------------------- */

  const lightbox = document.getElementById("lightbox");
  const lbImg = lightbox?.querySelector(".lightbox-stage img");
  const lbCaption = lightbox?.querySelector(".lightbox-caption");
  const lbCount = lightbox?.querySelector(".lightbox-count");
  const lbPrev = lightbox?.querySelector(".lightbox-prev");
  const lbNext = lightbox?.querySelector(".lightbox-next");
  let lbItems = [];
  let lbIndex = 0;
  let lbOpener = null;

  const itemFrom = (el) => ({
    src: el.dataset.full,
    alt: el.dataset.alt || el.querySelector("img")?.alt || "",
    caption: el.dataset.caption || el.dataset.alt || el.querySelector("img")?.alt || "",
  });

  const renderLightbox = () => {
    const item = lbItems[lbIndex];
    lbImg.src = item.src;
    lbImg.alt = item.alt;
    lbCaption.textContent = item.caption;
    lbCount.textContent = lbItems.length > 1 ? `${lbIndex + 1} / ${lbItems.length}` : "";
    lbPrev.hidden = lbNext.hidden = lbItems.length < 2;
  };

  const openLightbox = (items, index, opener) => {
    if (!lightbox || typeof lightbox.showModal !== "function") {
      window.open(items[index].src, "_blank", "noopener");
      return;
    }
    lbItems = items;
    lbIndex = index;
    lbOpener = opener;
    renderLightbox();
    lightbox.showModal();
    document.body.classList.add("no-scroll");
  };

  const step = (delta) => {
    lbIndex = (lbIndex + delta + lbItems.length) % lbItems.length;
    renderLightbox();
  };

  if (lightbox) {
    lightbox.querySelector(".lightbox-close").addEventListener("click", () => lightbox.close());
    lbPrev.addEventListener("click", () => step(-1));
    lbNext.addEventListener("click", () => step(1));
    lightbox.addEventListener("click", (event) => {
      if (event.target.classList.contains("lightbox-stage") || event.target === lightbox) lightbox.close();
    });
    lightbox.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
    });
    lightbox.addEventListener("close", () => {
      document.body.classList.remove("no-scroll");
      lbImg.removeAttribute("src");
      lbOpener?.focus();
    });
  }

  // Any element group marked [data-gallery]: each [data-full] child opens the lightbox.
  document.querySelectorAll("[data-gallery]").forEach((gallery) => {
    if (gallery.hasAttribute("data-showcase")) return;
    const triggers = [...gallery.querySelectorAll("[data-full]")];
    triggers.forEach((trigger, i) => {
      trigger.addEventListener("click", () => openLightbox(triggers.map(itemFrom), i, trigger));
    });
  });

  /* ----------------------------------------------------------------------
     Showcase: thumbnails swap the main browser frame
  ---------------------------------------------------------------------- */

  document.querySelectorAll("[data-showcase]").forEach((showcase) => {
    const view = showcase.querySelector(".browser-view");
    const mainImg = view.querySelector("img");
    const url = showcase.querySelector(".browser-url");
    const thumbs = [...showcase.querySelectorAll(".thumb")];
    let current = Math.max(0, thumbs.findIndex((t) => t.getAttribute("aria-pressed") === "true"));

    const select = (i) => {
      if (i === current) return;
      current = i;
      const thumb = thumbs[i];
      thumbs.forEach((t, j) => {
        t.setAttribute("aria-pressed", String(j === i));
        t.parentElement.toggleAttribute("data-active", j === i);
      });
      const swap = () => {
        mainImg.src = thumb.dataset.full;
        mainImg.alt = thumb.dataset.alt;
        if (url && thumb.dataset.url) url.textContent = thumb.dataset.url;
        mainImg.classList.remove("is-swapping");
      };
      if (reduceMotion) return swap();
      mainImg.classList.add("is-swapping");
      setTimeout(swap, 180);
    };

    thumbs.forEach((thumb, i) => thumb.addEventListener("click", () => select(i)));
    view.addEventListener("click", () => openLightbox(thumbs.map(itemFrom), current, view));
  });

  /* ----------------------------------------------------------------------
     Contact form (Formspree)
  ---------------------------------------------------------------------- */

  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const label = button.innerHTML;
    button.disabled = true;
    button.textContent = "Sending…";
    status.textContent = "";
    status.className = "form-status";

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(String(response.status));
      status.textContent = "Message sent — thank you. I'll get back to you soon.";
      status.className = "form-status ok";
      form.reset();
    } catch {
      status.textContent = "Something went wrong. Please email me directly instead.";
      status.className = "form-status err";
    } finally {
      button.disabled = false;
      button.innerHTML = label;
    }
  });

  /* ----------------------------------------------------------------------
     Footer year
  ---------------------------------------------------------------------- */

  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
})();
